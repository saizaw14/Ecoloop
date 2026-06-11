import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import type {
  MapCoordinate,
  MapRegion,
  RecyclingCenter,
} from '@/features/explore/types/recycling-center';

type RecyclingCentersMapProps = {
  centers: RecyclingCenter[];
  mapRegion: MapRegion;
  onRegionChangeComplete: (region: MapRegion) => void;
  onSelectCenter: (centerId: string) => void;
  selectedCenterId: string | null;
  userLocation: MapCoordinate | null;
};

export function RecyclingCentersMap({
  centers,
  mapRegion,
  onRegionChangeComplete,
  onSelectCenter,
  selectedCenterId,
  userLocation,
}: RecyclingCentersMapProps) {
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (!selectedCenterId) {
      return;
    }

    const selectedCenter = centers.find((center) => center.id === selectedCenterId);

    if (!selectedCenter) {
      return;
    }

    mapRef.current?.animateToRegion(
      {
        latitude: selectedCenter.coordinate.latitude,
        longitude: selectedCenter.coordinate.longitude,
        latitudeDelta: Math.max(mapRegion.latitudeDelta * 0.72, 0.014),
        longitudeDelta: Math.max(mapRegion.longitudeDelta * 0.72, 0.014),
      },
      280
    );
  }, [centers, mapRegion.latitudeDelta, mapRegion.longitudeDelta, selectedCenterId]);

  return (
    <MapView
      ref={mapRef}
      loadingEnabled
      mapPadding={styles.mapPadding}
      region={mapRegion}
      rotateEnabled={false}
      showsBuildings={false}
      showsCompass={false}
      showsIndoors={false}
      showsMyLocationButton={false}
      showsPointsOfInterest={false}
      showsTraffic={false}
      style={styles.map}
      toolbarEnabled={false}
      onRegionChangeComplete={(region) => onRegionChangeComplete(region as MapRegion)}>
      {userLocation ? (
        <Marker coordinate={userLocation} identifier="current-location">
          <View style={styles.userMarkerOuter}>
            <View style={styles.userMarkerInner} />
          </View>
        </Marker>
      ) : null}

      {centers.map((center) => {
        const isSelected = center.id === selectedCenterId;

        return (
          <Marker
            key={center.id}
            coordinate={center.coordinate}
            identifier={center.id}
            onPress={() => onSelectCenter(center.id)}>
            <View style={[styles.centerMarker, isSelected ? styles.centerMarkerSelected : null]}>
              <View style={[styles.centerMarkerDot, isSelected ? styles.centerMarkerDotSelected : null]} />
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  centerMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#A855F7',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  centerMarkerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F5EDFF',
  },
  centerMarkerDotSelected: {
    backgroundColor: '#D1FAE5',
  },
  centerMarkerSelected: {
    backgroundColor: '#0AA36C',
    shadowColor: '#0AA36C',
    transform: [{ scale: 1.1 }],
  },
  map: {
    flex: 1,
  },
  mapPadding: {
    bottom: 28,
    left: 24,
    right: 24,
    top: 20,
  },
  userMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0AA36C',
  },
  userMarkerOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0AA36C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B7F55',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
});
