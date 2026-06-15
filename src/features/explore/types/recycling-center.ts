export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapRegion = MapCoordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

export type RecyclingCenter = {
  acceptedMaterials: string[];
  address: string | null;
  businessStatus: string | null;
  category: string | null;
  coordinate: MapCoordinate;
  distanceMeters: number;
  googleMapsUri: string | null;
  googlePlaceId: string | null;
  id: string;
  isOpenNow: boolean | null;
  name: string;
  openingHours: string | null;
  phone: string | null;
  rating: number | null;
  ratingCount: number | null;
  source: 'Google Places' | 'OpenStreetMap';
  website: string | null;
};
