import type {
  MapCoordinate,
  RecyclingCenter,
} from '@/features/explore/types/recycling-center';

type FetchNearbyRecyclingCentersParams = {
  distanceOrigin?: MapCoordinate;
  limit?: number;
  radiusMeters: number;
  searchOrigin: MapCoordinate;
};

type GoogleLocalizedText = {
  languageCode?: string;
  text?: string;
};

type GoogleOpeningHours = {
  openNow?: boolean;
  weekdayDescriptions?: string[];
};

type GooglePlace = {
  businessStatus?: string;
  currentOpeningHours?: GoogleOpeningHours;
  displayName?: GoogleLocalizedText;
  formattedAddress?: string;
  googleMapsUri?: string;
  id?: string;
  internationalPhoneNumber?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  name?: string;
  nationalPhoneNumber?: string;
  primaryTypeDisplayName?: GoogleLocalizedText;
  rating?: number;
  regularOpeningHours?: GoogleOpeningHours;
  types?: string[];
  userRatingCount?: number;
  websiteUri?: string;
};

type GooglePlacesResponse = {
  places?: GooglePlace[];
};

type GooglePlacesErrorResponse = {
  error?: {
    message?: string;
    status?: string;
  };
};

type OverpassElement = {
  center?: {
    lat: number;
    lon: number;
  };
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  type: 'node' | 'relation' | 'way';
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

const DEFAULT_LIMIT = 8;
const googleTextSearchEndpoint = 'https://places.googleapis.com/v1/places:searchText';
const googlePlaceDetailsEndpoint = 'https://places.googleapis.com/v1/places';
const overpassEndpoint = 'https://overpass-api.de/api/interpreter';

const googleTextSearchFieldMask = [
  'places.businessStatus',
  'places.currentOpeningHours',
  'places.displayName',
  'places.formattedAddress',
  'places.googleMapsUri',
  'places.id',
  'places.internationalPhoneNumber',
  'places.location',
  'places.nationalPhoneNumber',
  'places.primaryTypeDisplayName',
  'places.rating',
  'places.regularOpeningHours',
  'places.types',
  'places.userRatingCount',
  'places.websiteUri',
].join(',');

const googlePlaceDetailsFieldMask = [
  'businessStatus',
  'currentOpeningHours',
  'displayName',
  'formattedAddress',
  'googleMapsUri',
  'id',
  'internationalPhoneNumber',
  'location',
  'nationalPhoneNumber',
  'primaryTypeDisplayName',
  'rating',
  'regularOpeningHours',
  'types',
  'userRatingCount',
  'websiteUri',
].join(',');

const googleRecyclingSearchKeywords = [
  'recycling center near me',
  'recycle centre near me',
  'pusat kitar semula',
  'plastic recycling near me',
  'paper recycling near me',
  'glass recycling near me',
  'metal recycling near me',
  'e-waste recycling near me',
  'scrap metal recycling near me',
];

const acceptedMaterialTags: [string, string][] = [
  ['recycling:plastic', 'Plastic'],
  ['recycling:plastic_bottles', 'Plastic'],
  ['recycling:paper', 'Paper'],
  ['recycling:cardboard', 'Cardboard'],
  ['recycling:glass', 'Glass'],
  ['recycling:glass_bottles', 'Glass'],
  ['recycling:metal', 'Metal'],
  ['recycling:cans', 'Metal'],
  ['recycling:electronics', 'E-waste'],
  ['recycling:small_appliances', 'E-waste'],
  ['recycling:mobile_phones', 'E-waste'],
  ['recycling:batteries', 'Batteries'],
  ['recycling:clothes', 'Textiles'],
  ['recycling:organic', 'Organic'],
  ['recycling:beverage_cartons', 'Cartons'],
  ['recycling:books', 'Books'],
  ['recycling:light_bulbs', 'Bulbs'],
];

function getGooglePlacesApiKey() {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    null
  );
}

function assertGooglePlacesApiKey() {
  const apiKey = getGooglePlacesApiKey();

  if (!apiKey) {
    throw new Error(
      'Google Places API key is missing. Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to your Expo env file.'
    );
  }

  return apiKey;
}

async function createGooglePlacesRequestError(response: Response, requestName: string) {
  const fallbackMessage = `${requestName} failed with status ${response.status}.`;

  try {
    const payload = (await response.json()) as GooglePlacesErrorResponse;
    const googleMessage = payload.error?.message?.trim();
    const googleStatus = payload.error?.status?.trim();

    if (googleMessage && googleStatus) {
      return new Error(`${requestName} failed: ${googleMessage} (${googleStatus}).`);
    }

    if (googleMessage) {
      return new Error(`${requestName} failed: ${googleMessage}`);
    }
  } catch {
    return new Error(fallbackMessage);
  }

  return new Error(fallbackMessage);
}

function isAffirmativeTagValue(value?: string) {
  if (!value) {
    return false;
  }

  return ['1', 'only', 'true', 'yes'].includes(value.trim().toLowerCase());
}

function buildOverpassQuery({ latitude, longitude }: MapCoordinate, radiusMeters: number) {
  return [
    '[out:json][timeout:25];',
    '(',
    `node["amenity"="recycling"](around:${radiusMeters},${latitude},${longitude});`,
    `way["amenity"="recycling"](around:${radiusMeters},${latitude},${longitude});`,
    `relation["amenity"="recycling"](around:${radiusMeters},${latitude},${longitude});`,
    ');',
    'out center;',
  ].join('');
}

function getElementCoordinate(element: OverpassElement): MapCoordinate | null {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return {
      latitude: element.lat,
      longitude: element.lon,
    };
  }

  if (element.center) {
    return {
      latitude: element.center.lat,
      longitude: element.center.lon,
    };
  }

  return null;
}

function getElementName(tags: Record<string, string>) {
  const rawName = tags.name || tags.operator || tags.brand || 'Recycling Center';
  return rawName.trim();
}

function buildAddress(tags: Record<string, string>) {
  const fullAddress = tags['addr:full']?.trim();

  if (fullAddress) {
    return fullAddress;
  }

  const streetLine = [tags['addr:housenumber'], tags['addr:street']]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');

  const localityLine = [
    tags['addr:suburb'],
    tags['addr:city'],
    tags['addr:postcode'],
    tags['addr:state'],
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');

  const combinedAddress = [streetLine, localityLine].filter(Boolean).join(', ').trim();
  return combinedAddress || tags.address?.trim() || null;
}

function normalizeOpeningHours(tags: Record<string, string>) {
  const openingHours = tags.opening_hours?.trim();

  if (!openingHours) {
    return null;
  }

  return openingHours.replace(/;/g, ' - ');
}

function normalizePhone(tags: Record<string, string>) {
  return tags.phone?.trim() || tags['contact:phone']?.trim() || null;
}

function normalizeWebsite(tags: Record<string, string>) {
  return tags.website?.trim() || tags['contact:website']?.trim() || null;
}

function collectAcceptedMaterials(tags: Record<string, string>) {
  const materials = new Set<string>();

  for (const [tagName, label] of acceptedMaterialTags) {
    if (isAffirmativeTagValue(tags[tagName])) {
      materials.add(label);
    }
  }

  return [...materials];
}

function getGooglePlaceCoordinate(place: GooglePlace): MapCoordinate | null {
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function getGooglePlaceId(place: GooglePlace) {
  return place.id?.trim() || place.name?.replace(/^places\//, '').trim() || null;
}

function getGooglePlaceName(place: GooglePlace) {
  return place.displayName?.text?.trim() || 'Recycling Center';
}

function getGooglePlaceCategory(place: GooglePlace) {
  const primaryCategory = place.primaryTypeDisplayName?.text?.trim();

  if (primaryCategory) {
    return primaryCategory;
  }

  return place.types?.[0]?.replace(/_/g, ' ') ?? 'Recycling center';
}

function getGoogleOpeningStatus(place: GooglePlace) {
  return place.currentOpeningHours?.openNow ?? place.regularOpeningHours?.openNow ?? null;
}

function formatGoogleOpeningHours(place: GooglePlace) {
  const hours = place.currentOpeningHours ?? place.regularOpeningHours;

  if (!hours) {
    return null;
  }

  const todayDescription = getTodayOpeningDescription(hours.weekdayDescriptions);
  const status =
    typeof hours.openNow === 'boolean' ? (hours.openNow ? 'Open now' : 'Closed') : null;

  if (status && todayDescription) {
    return `${status} - ${todayDescription}`;
  }

  return status ?? todayDescription;
}

function getGooglePlacePhone(place: GooglePlace) {
  return (
    place.nationalPhoneNumber?.trim() ||
    place.internationalPhoneNumber?.trim() ||
    null
  );
}

function mapGooglePlaceToRecyclingCenter(
  place: GooglePlace,
  distanceOrigin: MapCoordinate
): RecyclingCenter | null {
  const coordinate = getGooglePlaceCoordinate(place);
  const googlePlaceId = getGooglePlaceId(place);

  if (!coordinate || !googlePlaceId) {
    return null;
  }

  return {
    acceptedMaterials: [],
    address: place.formattedAddress?.trim() || null,
    businessStatus: normalizeBusinessStatus(place.businessStatus),
    category: getGooglePlaceCategory(place),
    coordinate,
    distanceMeters: calculateDistanceMeters(distanceOrigin, coordinate),
    googleMapsUri: place.googleMapsUri?.trim() || null,
    googlePlaceId,
    id: `google-${googlePlaceId}`,
    isOpenNow: getGoogleOpeningStatus(place),
    name: getGooglePlaceName(place),
    openingHours: formatGoogleOpeningHours(place),
    phone: getGooglePlacePhone(place),
    rating: typeof place.rating === 'number' ? place.rating : null,
    ratingCount:
      typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    source: 'Google Places' as const,
    website: place.websiteUri?.trim() || null,
  } satisfies RecyclingCenter;
}

function getTodayOpeningDescription(weekdayDescriptions?: string[]) {
  if (!weekdayDescriptions?.length) {
    return null;
  }

  const googleWeekdayIndex = (new Date().getDay() + 6) % 7;
  return weekdayDescriptions[googleWeekdayIndex] ?? weekdayDescriptions[0] ?? null;
}

function normalizeBusinessStatus(status?: string) {
  if (!status) {
    return null;
  }

  return status
    .replace(/^OPERATIONAL$/, 'Operational')
    .replace(/^CLOSED_TEMPORARILY$/, 'Temporarily closed')
    .replace(/^CLOSED_PERMANENTLY$/, 'Permanently closed')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function clampSearchRadiusMeters(radiusMeters: number) {
  return Math.min(Math.max(Math.round(radiusMeters), 500), 50000);
}

async function fetchGoogleRecyclingCenters({
  distanceOrigin,
  limit,
  radiusMeters,
  searchOrigin,
}: Required<FetchNearbyRecyclingCentersParams>) {
  const apiKey = assertGooglePlacesApiKey();
  const searchResults = await Promise.allSettled(
    googleRecyclingSearchKeywords.map((keyword) =>
      fetchGooglePlacesForKeyword({
        apiKey,
        keyword,
        limit,
        radiusMeters,
        searchOrigin,
      })
    )
  );
  const placesById = new Map<string, GooglePlace>();
  const seenPlaceIds = new Set<string>();

  for (const result of searchResults) {
    if (result.status === 'rejected') {
      continue;
    }

    for (const place of result.value) {
      const googlePlaceId = getGooglePlaceId(place);

      if (googlePlaceId && !seenPlaceIds.has(googlePlaceId)) {
        seenPlaceIds.add(googlePlaceId);
        placesById.set(googlePlaceId, place);
      }
    }
  }

  if (placesById.size === 0) {
    const firstRejectedSearch = searchResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    );

    if (firstRejectedSearch) {
      throw firstRejectedSearch.reason;
    }

    return [];
  }

  const searchCenters = [...placesById.values()]
    .map((place) => mapGooglePlaceToRecyclingCenter(place, distanceOrigin))
    .filter((center): center is RecyclingCenter => Boolean(center))
    .sort(
      (leftCenter, rightCenter) =>
        leftCenter.distanceMeters - rightCenter.distanceMeters ||
        leftCenter.name.localeCompare(rightCenter.name)
    )
    .slice(0, limit);

  const detailedCenters = await Promise.allSettled(
    searchCenters.map((center) =>
      fetchGooglePlaceDetails({
        apiKey,
        distanceOrigin,
        fallbackCenter: center,
        placeId: center.googlePlaceId,
      })
    )
  );

  return detailedCenters.map((result, index) =>
    result.status === 'fulfilled' ? result.value : searchCenters[index]
  );
}

async function fetchGooglePlacesForKeyword({
  apiKey,
  keyword,
  limit,
  radiusMeters,
  searchOrigin,
}: {
  apiKey: string;
  keyword: string;
  limit: number;
  radiusMeters: number;
  searchOrigin: MapCoordinate;
}) {
  const response = await fetch(googleTextSearchEndpoint, {
    body: JSON.stringify({
      includePureServiceAreaBusinesses: false,
      languageCode: 'en',
      locationBias: {
        circle: {
          center: {
            latitude: searchOrigin.latitude,
            longitude: searchOrigin.longitude,
          },
          radius: clampSearchRadiusMeters(radiusMeters),
        },
      },
      maxResultCount: Math.min(Math.max(limit, 1), 10),
      rankPreference: 'DISTANCE',
      regionCode: 'MY',
      textQuery: keyword,
    }),
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': googleTextSearchFieldMask,
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw await createGooglePlacesRequestError(response, 'Google Places Text Search');
  }

  const payload = (await response.json()) as GooglePlacesResponse;
  return payload.places ?? [];
}

async function fetchGooglePlaceDetails({
  apiKey,
  distanceOrigin,
  fallbackCenter,
  placeId,
}: {
  apiKey: string;
  distanceOrigin: MapCoordinate;
  fallbackCenter: RecyclingCenter;
  placeId: string | null;
}) {
  if (!placeId) {
    return fallbackCenter;
  }

  const response = await fetch(`${googlePlaceDetailsEndpoint}/${encodeURIComponent(placeId)}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': googlePlaceDetailsFieldMask,
    },
    method: 'GET',
  });

  if (!response.ok) {
    throw await createGooglePlacesRequestError(response, 'Google Place Details');
  }

  const place = (await response.json()) as GooglePlace;
  const detailedCenter = mapGooglePlaceToRecyclingCenter(place, distanceOrigin);

  if (!detailedCenter) {
    return fallbackCenter;
  }

  return {
    ...fallbackCenter,
    ...detailedCenter,
    distanceMeters: fallbackCenter.distanceMeters,
  } satisfies RecyclingCenter;
}

async function fetchOpenStreetMapRecyclingCenters({
  distanceOrigin,
  limit,
  radiusMeters,
  searchOrigin,
}: Required<FetchNearbyRecyclingCentersParams>) {
  const query = buildOverpassQuery(searchOrigin, Math.round(radiusMeters));
  const requestUrl = `${overpassEndpoint}?data=${encodeURIComponent(query)}`;
  const response = await fetch(requestUrl);

  if (!response.ok) {
    throw new Error(`Overpass request failed with ${response.status}`);
  }

  const payload = (await response.json()) as OverpassResponse;
  const elements = payload.elements ?? [];
  const seenCenterKeys = new Set<string>();

  return elements
    .map((element): RecyclingCenter | null => {
      const tags = element.tags ?? {};
      const coordinate = getElementCoordinate(element);

      if (!coordinate) {
        return null;
      }

      const centerKey = `${getElementName(tags)}:${coordinate.latitude.toFixed(5)}:${coordinate.longitude.toFixed(5)}`;

      if (seenCenterKeys.has(centerKey)) {
        return null;
      }

      seenCenterKeys.add(centerKey);

      return {
        acceptedMaterials: collectAcceptedMaterials(tags),
        address: buildAddress(tags),
        businessStatus: null,
        category: tags.recycling_type?.replace(/_/g, ' ') || 'Recycling center',
        coordinate,
        distanceMeters: calculateDistanceMeters(distanceOrigin, coordinate),
        googleMapsUri: null,
        googlePlaceId: null,
        id: `${element.type}-${element.id}`,
        isOpenNow: null,
        name: getElementName(tags),
        openingHours: normalizeOpeningHours(tags),
        phone: normalizePhone(tags),
        rating: null,
        ratingCount: null,
        source: 'OpenStreetMap' as const,
        website: normalizeWebsite(tags),
      } satisfies RecyclingCenter;
    })
    .filter((center): center is RecyclingCenter => Boolean(center))
    .sort(
      (leftCenter, rightCenter) =>
        leftCenter.distanceMeters - rightCenter.distanceMeters ||
        leftCenter.name.localeCompare(rightCenter.name)
    )
    .slice(0, limit);
}

export function calculateDistanceMeters(from: MapCoordinate, to: MapCoordinate) {
  const earthRadiusMeters = 6371000;
  const latitudeDeltaRadians = degreesToRadians(to.latitude - from.latitude);
  const longitudeDeltaRadians = degreesToRadians(to.longitude - from.longitude);
  const startLatitudeRadians = degreesToRadians(from.latitude);
  const endLatitudeRadians = degreesToRadians(to.latitude);

  const haversineValue =
    Math.sin(latitudeDeltaRadians / 2) * Math.sin(latitudeDeltaRadians / 2) +
    Math.cos(startLatitudeRadians) *
      Math.cos(endLatitudeRadians) *
      Math.sin(longitudeDeltaRadians / 2) *
      Math.sin(longitudeDeltaRadians / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

export async function fetchNearbyRecyclingCenters({
  distanceOrigin,
  limit = DEFAULT_LIMIT,
  radiusMeters,
  searchOrigin,
}: FetchNearbyRecyclingCentersParams) {
  const comparisonOrigin = distanceOrigin ?? searchOrigin;
  const requestParams = {
    distanceOrigin: comparisonOrigin,
    limit,
    radiusMeters,
    searchOrigin,
  };
  let googleRequestError: unknown = null;

  try {
    const googleCenters = await fetchGoogleRecyclingCenters(requestParams);

    return googleCenters;
  } catch (error) {
    googleRequestError = error;
  }

  try {
    const fallbackCenters = await fetchOpenStreetMapRecyclingCenters(requestParams);

    if (fallbackCenters.length > 0) {
      return fallbackCenters;
    }
  } catch {
    // Keep the original Google error because it explains why real details are unavailable.
  }

  throw googleRequestError instanceof Error
    ? googleRequestError
    : new Error('Google Places could not load recycling centre details right now.');
}
