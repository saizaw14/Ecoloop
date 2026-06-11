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
const overpassEndpoint = 'https://overpass-api.de/api/interpreter';

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

  return openingHours.replace(/;/g, ' • ');
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
  const query = buildOverpassQuery(searchOrigin, Math.round(radiusMeters));
  const requestUrl = `${overpassEndpoint}?data=${encodeURIComponent(query)}`;
  const response = await fetch(requestUrl);

  if (!response.ok) {
    throw new Error(`Overpass request failed with ${response.status}`);
  }

  const payload = (await response.json()) as OverpassResponse;
  const elements = payload.elements ?? [];
  const comparisonOrigin = distanceOrigin ?? searchOrigin;
  const seenCenterKeys = new Set<string>();

  const centers = elements
    .map((element) => {
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
        coordinate,
        distanceMeters: calculateDistanceMeters(comparisonOrigin, coordinate),
        id: `${element.type}-${element.id}`,
        name: getElementName(tags),
        openingHours: normalizeOpeningHours(tags),
        phone: normalizePhone(tags),
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

  return centers;
}
