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
  coordinate: MapCoordinate;
  distanceMeters: number;
  id: string;
  name: string;
  openingHours: string | null;
  phone: string | null;
  source: 'OpenStreetMap';
  website: string | null;
};
