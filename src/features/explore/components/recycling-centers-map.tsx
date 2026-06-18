import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Colors,
  Fonts,
  FontSizes,
  FontWeights,
  LineHeights,
} from '@/constants/theme';
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
  onSelectCenter,
  selectedCenterId,
  userLocation,
}: RecyclingCentersMapProps) {
  return (
    <View style={styles.mapShell}>
      <View pointerEvents="none" style={styles.mapGlowLarge} />
      <View pointerEvents="none" style={styles.mapGlowSmall} />
      <View pointerEvents="none" style={styles.mapGrid} />
      <View pointerEvents="none" style={styles.mapGridVertical} />

      {userLocation ? (
        <View
          pointerEvents="none"
          style={[styles.userMarker, projectCoordinate(userLocation, mapRegion)]}
        />
      ) : null}

      {centers.map((center) => {
        const isSelected = center.id === selectedCenterId;

        return (
          <Pressable
            key={center.id}
            accessibilityRole="button"
            onPress={() => onSelectCenter(center.id)}
            style={[styles.centerMarker, projectCoordinate(center.coordinate, mapRegion)]}>
            <View style={[styles.centerMarkerBubble, isSelected ? styles.centerMarkerBubbleSelected : null]} />
          </Pressable>
        );
      })}

      <View style={styles.webPreviewBadge}>
        <Text style={styles.webPreviewText}>Map preview is interactive on iOS and Android builds.</Text>
      </View>
    </View>
  );
}

function projectCoordinate(coordinate: MapCoordinate, region: MapRegion) {
  const latitudeMin = region.latitude - region.latitudeDelta / 2;
  const latitudeMax = region.latitude + region.latitudeDelta / 2;
  const longitudeMin = region.longitude - region.longitudeDelta / 2;
  const longitudeMax = region.longitude + region.longitudeDelta / 2;
  const xRatio =
    longitudeMax === longitudeMin
      ? 0.5
      : (coordinate.longitude - longitudeMin) / (longitudeMax - longitudeMin);
  const yRatio =
    latitudeMax === latitudeMin
      ? 0.5
      : 1 - (coordinate.latitude - latitudeMin) / (latitudeMax - latitudeMin);

  return {
    left: `${clamp(xRatio * 100, 8, 92)}%` as const,
    top: `${clamp(yRatio * 100, 12, 88)}%` as const,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

const styles = StyleSheet.create({
  centerMarker: {
    position: 'absolute',
    marginLeft: -14,
    marginTop: -14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerMarkerBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#A855F7',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  centerMarkerBubbleSelected: {
    shadowOpacity: 0.28,
    transform: [{ scale: 1.08 }],
  },
  mapGlowLarge: {
    position: 'absolute',
    left: -48,
    top: -28,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  mapGlowSmall: {
    position: 'absolute',
    right: -32,
    bottom: -44,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  mapGrid: {
    position: 'absolute',
    left: 22,
    right: 22,
    top: '34%',
    height: 1,
    backgroundColor: 'rgba(10, 163, 108, 0.16)',
  },
  mapGridVertical: {
    position: 'absolute',
    top: 22,
    bottom: 22,
    left: '52%',
    width: 1,
    backgroundColor: 'rgba(10, 163, 108, 0.16)',
  },
  mapShell: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#D9F8EC',
  },
  userMarker: {
    position: 'absolute',
    marginLeft: -9,
    marginTop: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0AA36C',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#0B7F55',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  webPreviewBadge: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  webPreviewText: {
    color: Colors.brand.body,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    textAlign: 'center',
  },
});
