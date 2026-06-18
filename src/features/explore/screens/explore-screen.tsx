import { useEffect, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { useRouter, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HapticPressable } from '@/components/ui/haptic-pressable';
import {
  Colors,
  Fonts,
  FontSizes,
  FontWeights,
  LineHeights,
  Radii,
  Spacing,
} from '@/constants/theme';
import { RecyclingCentersMap } from '@/features/explore/components/recycling-centers-map';
import {
  calculateDistanceMeters,
  fetchNearbyRecyclingCenters,
} from '@/features/explore/services/recycling-centers-service';
import type {
  MapCoordinate,
  MapRegion,
  RecyclingCenter,
} from '@/features/explore/types/recycling-center';

type LoadCentersMode = 'initial' | 'refresh';
type LocationStatus = 'denied' | 'granted' | 'loading' | 'unavailable';

const DEFAULT_MAP_REGION: MapRegion = {
  latitude: 3.139,
  latitudeDelta: 0.08,
  longitude: 101.6869,
  longitudeDelta: 0.08,
};

const selectedMapZoomDelta = 0.055;
const mapShiftThresholdMeters = 350;
const minSearchRadiusMeters = 1800;
const maxSearchRadiusMeters = 9000;

export default function ExploreScreen() {
  const router = useRouter();
  const [centers, setCenters] = useState<RecyclingCenter[]>([]);
  const [mapRegion, setMapRegion] = useState<MapRegion>(DEFAULT_MAP_REGION);
  const [lastSearchRegion, setLastSearchRegion] = useState<MapRegion>(DEFAULT_MAP_REGION);
  const [userLocation, setUserLocation] = useState<MapCoordinate | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('loading');
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingCenters, setIsLoadingCenters] = useState(true);
  const [isRefreshingArea, setIsRefreshingArea] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);

  const selectedCenter =
    centers.find((center) => center.id === selectedCenterId) ?? centers[0] ?? null;
  const orderedCenters = selectedCenter
    ? [selectedCenter, ...centers.filter((center) => center.id !== selectedCenter.id)]
    : centers;
  const isSearchAreaDirty = hasSearchAreaChanged(mapRegion, lastSearchRegion);
  const resultCountLabel =
    isLoadingCenters && centers.length === 0
      ? 'Searching...'
      : centers.length === 1
        ? '1 center'
        : `${centers.length} centers`;
  const initializeNearbyCentersRef = useRef<() => Promise<void>>(async () => {});

  initializeNearbyCentersRef.current = async () => {
    setLocationStatus('loading');
    setErrorMessage(null);
    setIsLoadingCenters(true);

    try {
      const currentCoordinate = await requestCurrentLocation();

      if (!currentCoordinate) {
        setLocationStatus('denied');
        await loadCentersForRegion(DEFAULT_MAP_REGION, { mode: 'initial' });
        return;
      }

      const nextRegion = createRegion(currentCoordinate, selectedMapZoomDelta);
      setUserLocation(currentCoordinate);
      setLocationStatus('granted');
      setMapRegion(nextRegion);

      await loadCentersForRegion(nextRegion, {
        distanceOrigin: currentCoordinate,
        mode: 'initial',
      });
    } catch {
      setLocationStatus('unavailable');
      await loadCentersForRegion(DEFAULT_MAP_REGION, { mode: 'initial' });
    }
  };

  useEffect(() => {
    void initializeNearbyCentersRef.current();
  }, []);

  async function requestCurrentLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (!permission.granted) {
      return null;
    }

    try {
      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      } satisfies MapCoordinate;
    } catch {
      const lastKnownPosition = await Location.getLastKnownPositionAsync();

      if (!lastKnownPosition) {
        throw new Error('Unable to resolve current device location.');
      }

      return {
        latitude: lastKnownPosition.coords.latitude,
        longitude: lastKnownPosition.coords.longitude,
      } satisfies MapCoordinate;
    }
  }

  async function loadCentersForRegion(
    region: MapRegion,
    options: {
      distanceOrigin?: MapCoordinate;
      mode: LoadCentersMode;
    }
  ) {
    const searchOrigin = {
      latitude: region.latitude,
      longitude: region.longitude,
    } satisfies MapCoordinate;
    const distanceOrigin = options.distanceOrigin ?? userLocation ?? searchOrigin;

    if (options.mode === 'initial') {
      setIsLoadingCenters(true);
    } else {
      setIsRefreshingArea(true);
    }

    setErrorMessage(null);

    try {
      const nearbyCenters = await fetchNearbyRecyclingCenters({
        distanceOrigin,
        radiusMeters: deriveSearchRadiusMeters(region),
        searchOrigin,
      });

      setCenters(nearbyCenters);
      setLastSearchRegion(region);
      setSelectedCenterId((currentSelectedCenterId) =>
        nearbyCenters.some((center) => center.id === currentSelectedCenterId)
          ? currentSelectedCenterId
          : nearbyCenters[0]?.id ?? null
      );
    } catch {
      setErrorMessage('We could not load live recycling-center data for this map area.');

      if (options.mode === 'initial') {
        setCenters([]);
        setSelectedCenterId(null);
      }
    } finally {
      setIsLoadingCenters(false);
      setIsRefreshingArea(false);
    }
  }

  async function handleLocateMePress() {
    setIsLocatingUser(true);

    try {
      const currentCoordinate = await requestCurrentLocation();

      if (!currentCoordinate) {
        setLocationStatus('denied');
        setUserLocation(null);
        setErrorMessage('Allow location access to search recycling centers nearest to you.');
        return;
      }

      const nextRegion = createRegion(currentCoordinate, selectedMapZoomDelta);
      setLocationStatus('granted');
      setUserLocation(currentCoordinate);
      setMapRegion(nextRegion);

      await loadCentersForRegion(nextRegion, {
        distanceOrigin: currentCoordinate,
        mode: centers.length > 0 ? 'refresh' : 'initial',
      });
    } catch {
      setLocationStatus('unavailable');
      setErrorMessage('We could not read your current location right now. Please try again.');
    } finally {
      setIsLocatingUser(false);
    }
  }

  async function handleSearchThisAreaPress() {
    await loadCentersForRegion(mapRegion, {
      mode: centers.length > 0 ? 'refresh' : 'initial',
    });
  }

  async function handleRetryPress() {
    await loadCentersForRegion(mapRegion, {
      mode: centers.length > 0 ? 'refresh' : 'initial',
    });
  }

  function handleBackPress() {
    router.replace('/(tabs)' as Href);
  }

  function handleCallPress(phone: string | null) {
    if (!phone) {
      return;
    }

    void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`);
  }

  function handleDirectionsPress(center: RecyclingCenter) {
    const destinationParts = [center.name, center.address].filter(Boolean);
    const destinationLabel = destinationParts.length
      ? destinationParts.join(', ')
      : `${center.coordinate.latitude},${center.coordinate.longitude}`;
    const destination = encodeURIComponent(destinationLabel);
    const destinationPlaceId = center.googlePlaceId
      ? `&destination_place_id=${encodeURIComponent(center.googlePlaceId)}`
      : '';

    void Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${destination}${destinationPlaceId}&travelmode=driving&dir_action=navigate`
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <View style={styles.headerShell}>
          <HapticPressable
            accessibilityRole="button"
            hapticType="selection"
            onPress={handleBackPress}
            style={styles.backButton}>
            <MaterialCommunityIcons
              color={Colors.brand.body}
              name="chevron-left"
              size={20}
            />
            <Text style={styles.backButtonText}>Back</Text>
          </HapticPressable>

          <View style={styles.titleRow}>
            <View style={styles.titleIconWrap}>
              <MaterialCommunityIcons
                color="#9333EA"
                name="map-marker-radius-outline"
                size={22}
              />
            </View>

            <View style={styles.titleCopy}>
              <Text style={styles.title}>Recycling Centers</Text>
              <Text style={styles.subtitle}>Find nearby locations</Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.bodyShell}>
            <View style={styles.mapCard}>
              <RecyclingCentersMap
                centers={centers}
                mapRegion={mapRegion}
                selectedCenterId={selectedCenterId}
                userLocation={userLocation}
                onRegionChangeComplete={setMapRegion}
                onSelectCenter={setSelectedCenterId}
              />

              <View style={styles.mapBadge}>
                <MaterialCommunityIcons
                  color={Colors.brand.primaryDark}
                  name="radar"
                  size={14}
                />
                <Text style={styles.mapBadgeText}>Live Map</Text>
              </View>

              {isSearchAreaDirty ? (
                <HapticPressable
                  accessibilityRole="button"
                  hapticType="selection"
                  onPress={() => {
                    void handleSearchThisAreaPress();
                  }}
                  style={({ pressed }) => [
                    styles.searchAreaButton,
                    pressed ? styles.searchAreaButtonPressed : null,
                  ]}>
                  {isRefreshingArea ? (
                    <ActivityIndicator color={Colors.brand.onPrimary} size="small" />
                  ) : (
                    <MaterialCommunityIcons
                      color={Colors.brand.onPrimary}
                      name="crosshairs-gps"
                      size={14}
                    />
                  )}
                  <Text style={styles.searchAreaButtonText}>
                    {isRefreshingArea ? 'Searching...' : 'Search This Area'}
                  </Text>
                </HapticPressable>
              ) : null}

              <HapticPressable
                accessibilityLabel="Recenter map to current location"
                accessibilityRole="button"
                disabled={isLocatingUser}
                hapticType="selection"
                onPress={() => {
                  void handleLocateMePress();
                }}
                style={({ pressed }) => [
                  styles.recenterMapButton,
                  pressed ? styles.recenterMapButtonPressed : null,
                  isLocatingUser ? styles.recenterMapButtonDisabled : null,
                ]}>
                {isLocatingUser ? (
                  <ActivityIndicator color={Colors.brand.primaryDark} size="small" />
                ) : (
                  <MaterialCommunityIcons
                    color={Colors.brand.primaryDark}
                    name="crosshairs-gps"
                    size={22}
                  />
                )}
              </HapticPressable>

            </View>

            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderCopy}>
                <Text style={styles.sectionTitle}>Nearby Centers</Text>
                <Text style={styles.sectionSubtitle}>Results for the current map search area</Text>
              </View>

              <View style={styles.resultCountPill}>
                {isLoadingCenters && centers.length === 0 ? (
                  <ActivityIndicator color={Colors.brand.primaryDark} size="small" />
                ) : (
                  <MaterialCommunityIcons color={Colors.brand.primaryDark} name="recycle" size={15} />
                )}
                <Text style={styles.resultCountPillText}>{resultCountLabel}</Text>
              </View>
            </View>

            {locationStatus !== 'granted' ? (
              <View style={styles.infoCard}>
                <View style={styles.infoIconWrap}>
                  <MaterialCommunityIcons color="#0B7F55" name="map-marker-alert-outline" size={18} />
                </View>

                <View style={styles.infoCopy}>
                  <Text style={styles.infoTitle}>Location access helps rank the closest centers</Text>
                  <Text style={styles.infoBody}>
                    {locationStatus === 'denied'
                      ? 'You can still move the map and search this area, or enable location to find the nearest recycling points around you.'
                      : 'We could not confirm your live position yet, so the map is showing the current search area instead.'}
                  </Text>
                </View>
              </View>
            ) : null}

            {errorMessage && centers.length > 0 ? (
              <View style={styles.warningBanner}>
                <MaterialCommunityIcons color="#B25A00" name="alert-circle-outline" size={18} />
                <Text style={styles.warningBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {isLoadingCenters && centers.length === 0 ? (
              <View style={styles.stateCard}>
                <ActivityIndicator color={Colors.brand.primaryDark} size="small" />
                <Text style={styles.stateTitle}>Finding nearby recycling centers</Text>
                <Text style={styles.stateBody}>
                  We&apos;re checking live map data for recycling facilities around this area.
                </Text>
              </View>
            ) : null}

            {!isLoadingCenters && centers.length === 0 ? (
              <View style={styles.stateCard}>
                <View style={styles.emptyIconWrap}>
                  <MaterialCommunityIcons color="#9333EA" name="map-search-outline" size={22} />
                </View>
                <Text style={styles.stateTitle}>
                  {errorMessage ? 'Live data is unavailable right now' : 'No recycling centers found here'}
                </Text>
                <Text style={styles.stateBody}>
                  {errorMessage
                    ? 'Please try again in a moment or move the map to a different area.'
                    : 'Move the map, refresh this area, or switch back to your current location to search again.'}
                </Text>
                <HapticPressable
                  accessibilityRole="button"
                  hapticType="selection"
                  onPress={() => {
                    void handleRetryPress();
                  }}
                  style={({ pressed }) => [
                    styles.retryButton,
                    pressed ? styles.retryButtonPressed : null,
                  ]}>
                  <MaterialCommunityIcons
                    color={Colors.brand.onPrimary}
                    name="refresh"
                    size={16}
                  />
                  <Text style={styles.retryButtonText}>
                    {errorMessage ? 'Try Again' : 'Search This Area'}
                  </Text>
                </HapticPressable>
              </View>
            ) : null}

            {orderedCenters.map((center) => {
              const isSelected = center.id === selectedCenterId;
              const detailChips = center.acceptedMaterials.length
                ? center.acceptedMaterials
                : [center.category ?? 'Recycling center', center.businessStatus ?? center.source];
              const detailsLabel = center.acceptedMaterials.length ? 'Accepts' : 'Place details';
              const ratingLabel =
                typeof center.rating === 'number' ? center.rating.toFixed(1) : null;
              const ratingCountLabel =
                typeof center.ratingCount === 'number'
                  ? `(${center.ratingCount.toLocaleString()})`
                  : null;

              return (
                <View
                  key={center.id}
                  style={[styles.centerCard, isSelected ? styles.centerCardSelected : null]}>
                  <HapticPressable
                    accessibilityRole="button"
                    hapticType="selection"
                    onPress={() => setSelectedCenterId(center.id)}
                    style={({ pressed }) => [
                      styles.centerCardPressable,
                      pressed ? styles.centerCardPressed : null,
                    ]}>
                    <View style={styles.centerHeader}>
                      <View style={styles.centerHeaderCopy}>
                        <Text style={styles.centerName}>{center.name}</Text>

                        <View style={styles.centerRatingRow}>
                          {ratingLabel ? (
                            <>
                              <MaterialCommunityIcons color="#F59E0B" name="star" size={14} />
                              <Text style={styles.centerRatingText}>{ratingLabel}</Text>
                              {ratingCountLabel ? (
                                <Text style={styles.centerReviewText}>{ratingCountLabel}</Text>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <MaterialCommunityIcons
                                color="#0B7F55"
                                name="recycle"
                                size={14}
                              />
                              <Text style={styles.centerCategoryText}>
                                {center.category ?? 'Recycling center'}
                              </Text>
                            </>
                          )}
                          <Text style={styles.centerDistanceMeta}>·</Text>
                          <Text style={styles.centerDistanceMeta}>{center.source}</Text>
                        </View>

                        <View style={styles.centerDistanceRow}>
                          <MaterialCommunityIcons
                            color={Colors.brand.primaryDark}
                            name="map-marker-distance"
                            size={14}
                          />
                          <Text style={styles.centerDistanceText}>{formatDistance(center.distanceMeters)}</Text>
                          <Text style={styles.centerDistanceMeta}>
                            {userLocation ? 'from you' : 'from map center'}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.centerPinBadge,
                          isSelected ? styles.centerPinBadgeSelected : null,
                        ]}>
                        <MaterialCommunityIcons
                          color={isSelected ? Colors.brand.onPrimary : '#9333EA'}
                          name="map-marker-outline"
                          size={18}
                        />
                      </View>
                    </View>
                  </HapticPressable>

                  <View style={styles.centerMetaList}>
                    <View style={styles.centerMetaRow}>
                      <MaterialCommunityIcons color="#667387" name="map-marker-outline" size={16} />
                      <Text style={styles.centerMetaText}>{center.address ?? 'Address not listed'}</Text>
                    </View>

                    <View style={styles.centerMetaRow}>
                      <MaterialCommunityIcons color="#667387" name="clock-outline" size={16} />
                      <Text
                        style={[
                          styles.centerMetaText,
                          center.isOpenNow === true ? styles.centerMetaOpenText : null,
                          center.isOpenNow === false ? styles.centerMetaClosedText : null,
                        ]}>
                        {center.openingHours ?? 'Opening hours not listed'}
                      </Text>
                    </View>

                    <View style={styles.centerMetaRow}>
                      <MaterialCommunityIcons color="#667387" name="phone-outline" size={16} />
                      <Text style={styles.centerMetaText}>
                        {center.phone ?? 'Phone number not listed'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.centerDivider} />

                  <Text style={styles.acceptsLabel}>{detailsLabel}</Text>
                  <View style={styles.acceptsWrap}>
                    {detailChips.map((material) => (
                      <View key={`${center.id}-${material}`} style={styles.acceptsChip}>
                        <Text style={styles.acceptsChipText}>{material}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.centerActionsRow}>
                    <HapticPressable
                      accessibilityRole="button"
                      hapticType="medium"
                      onPress={() => handleDirectionsPress(center)}
                      style={({ pressed }) => [
                        styles.primaryActionButton,
                        pressed ? styles.primaryActionButtonPressed : null,
                      ]}>
                      <MaterialCommunityIcons
                        color={Colors.brand.onPrimary}
                        name="directions"
                        size={16}
                      />
                      <Text style={styles.primaryActionButtonText}>Directions</Text>
                    </HapticPressable>

                    {center.phone ? (
                      <HapticPressable
                        accessibilityRole="button"
                        hapticType="selection"
                        onPress={() => handleCallPress(center.phone)}
                        style={({ pressed }) => [
                          styles.secondaryActionButton,
                          pressed ? styles.secondaryActionButtonPressed : null,
                        ]}>
                        <MaterialCommunityIcons color="#0B7F55" name="phone-outline" size={16} />
                        <Text style={styles.secondaryActionButtonText}>Call</Text>
                      </HapticPressable>
                    ) : center.website ? (
                      <HapticPressable
                        accessibilityRole="button"
                        hapticType="selection"
                        onPress={() => {
                          void Linking.openURL(center.website as string);
                        }}
                        style={({ pressed }) => [
                          styles.secondaryActionButton,
                          pressed ? styles.secondaryActionButtonPressed : null,
                        ]}>
                        <MaterialCommunityIcons color="#0B7F55" name="web" size={16} />
                        <Text style={styles.secondaryActionButtonText}>Website</Text>
                      </HapticPressable>
                    ) : null}
                  </View>
                </View>
              );
            })}

            {centers.length > 0 ? (
              <Text style={styles.dataNote}>
                Live center data uses Google Places when configured, with OpenStreetMap as the
                fallback for mapped recycling locations.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function createRegion(coordinate: MapCoordinate, delta: number) {
  return {
    latitude: coordinate.latitude,
    latitudeDelta: delta,
    longitude: coordinate.longitude,
    longitudeDelta: delta,
  } satisfies MapRegion;
}

function deriveSearchRadiusMeters(region: MapRegion) {
  const latitudeHalfSpanKilometers = (region.latitudeDelta * 111.32) / 2;
  const longitudeHalfSpanKilometers =
    (region.longitudeDelta * 111.32 * Math.cos((region.latitude * Math.PI) / 180)) / 2;
  const diagonalRadiusMeters =
    Math.sqrt(
      latitudeHalfSpanKilometers * latitudeHalfSpanKilometers +
        longitudeHalfSpanKilometers * longitudeHalfSpanKilometers
    ) * 1000;

  return clamp(diagonalRadiusMeters, minSearchRadiusMeters, maxSearchRadiusMeters);
}

function hasSearchAreaChanged(currentRegion: MapRegion, previousRegion: MapRegion) {
  const centerShiftMeters = calculateDistanceMeters(
    {
      latitude: currentRegion.latitude,
      longitude: currentRegion.longitude,
    },
    {
      latitude: previousRegion.latitude,
      longitude: previousRegion.longitude,
    }
  );
  const latitudeDeltaShift =
    Math.abs(currentRegion.latitudeDelta - previousRegion.latitudeDelta) / previousRegion.latitudeDelta;
  const longitudeDeltaShift =
    Math.abs(currentRegion.longitudeDelta - previousRegion.longitudeDelta) /
    previousRegion.longitudeDelta;

  return (
    centerShiftMeters > mapShiftThresholdMeters ||
    latitudeDeltaShift > 0.24 ||
    longitudeDeltaShift > 0.24
  );
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${Math.max(50, Math.round(distanceMeters))} m`;
  }

  return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10000 ? 0 : 1)} km`;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

const styles = StyleSheet.create({
  acceptsChip: {
    borderRadius: Radii.pill,
    backgroundColor: '#DFF7EC',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  acceptsChipText: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  acceptsLabel: {
    color: '#6A7280',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    marginBottom: Spacing.sm,
  },
  acceptsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 2,
    marginLeft: -4,
  },
  backButtonText: {
    color: Colors.brand.body,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
  bodyShell: {
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  centerActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  centerCard: {
    borderRadius: 24,
    backgroundColor: Colors.brand.surface,
    borderWidth: 1,
    borderColor: '#E4EEE9',
    padding: Spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  centerCardPressed: {
    opacity: 0.94,
  },
  centerCardPressable: {
    marginBottom: Spacing.md,
  },
  centerCardSelected: {
    borderColor: '#9AE6C6',
    shadowColor: Colors.brand.primaryDark,
    shadowOpacity: 0.12,
  },
  centerDistanceMeta: {
    color: '#94A3B8',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
  },
  centerDistanceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  centerDistanceText: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  centerDivider: {
    height: 1,
    backgroundColor: '#E9EFEB',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  centerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  centerHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  centerMetaList: {
    gap: Spacing.sm,
  },
  centerMetaRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  centerMetaText: {
    flex: 1,
    color: '#5F6C7B',
    fontSize: FontSizes.sm,
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
  centerMetaClosedText: {
    color: '#B42318',
    fontWeight: FontWeights.medium,
  },
  centerMetaOpenText: {
    color: Colors.brand.primaryDark,
    fontWeight: FontWeights.medium,
  },
  centerName: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
  centerCategoryText: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  centerPinBadge: {
    width: 38,
    height: 38,
    borderRadius: Radii.pill,
    backgroundColor: '#F5EDFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPinBadgeSelected: {
    backgroundColor: Colors.brand.primaryDark,
  },
  centerRatingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  centerRatingText: {
    color: Colors.brand.text,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
  centerReviewText: {
    color: '#7A8795',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
  },
  dataNote: {
    color: '#7A8795',
    fontSize: FontSizes.caption,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  emptyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F5EDFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerShell: {
    backgroundColor: Colors.brand.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EFEC',
    gap: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  infoBody: {
    color: '#64748B',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  infoCard: {
    borderRadius: 20,
    backgroundColor: '#F0FAF5',
    borderWidth: 1,
    borderColor: '#D7EEE2',
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  infoCopy: {
    flex: 1,
    gap: 4,
  },
  infoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#DFF7EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  mapBadge: {
    position: 'absolute',
    left: 14,
    top: 14,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(255,255,255,0.94)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  mapBadgeText: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  mapCard: {
    height: 280,
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#D9F8EC',
    shadowColor: '#0B7F55',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 5,
  },
  primaryActionButton: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: Colors.brand.primaryDark,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryActionButtonPressed: {
    opacity: 0.94,
  },
  primaryActionButtonText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
  retryButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: Colors.brand.primaryDark,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  retryButtonPressed: {
    opacity: 0.94,
  },
  retryButtonText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  resultCountPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Radii.pill,
    backgroundColor: '#EAF7F1',
    borderWidth: 1,
    borderColor: '#CFE7DB',
    flexDirection: 'row',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  resultCountPillText: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  recenterMapButton: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 46,
    height: 46,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#D7E7DD',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
    zIndex: 3,
  },
  recenterMapButtonDisabled: {
    opacity: 0.72,
  },
  recenterMapButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.brand.authBackground,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 132,
  },
  searchAreaButton: {
    position: 'absolute',
    right: 14,
    top: 14,
    minHeight: 34,
    borderRadius: Radii.pill,
    backgroundColor: Colors.brand.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  searchAreaButtonPressed: {
    opacity: 0.92,
  },
  searchAreaButtonText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  secondaryActionButton: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CDE6D9',
    backgroundColor: '#F4FBF7',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionButtonPressed: {
    opacity: 0.92,
  },
  secondaryActionButtonText: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 2,
    paddingRight: Spacing.md,
  },
  sectionSubtitle: {
    color: '#708090',
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
  sectionTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  stateBody: {
    color: '#64748B',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    textAlign: 'center',
  },
  stateCard: {
    borderRadius: 22,
    backgroundColor: Colors.brand.surface,
    borderWidth: 1,
    borderColor: '#E4EEE9',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  stateTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    textAlign: 'center',
  },
  subtitle: {
    color: '#667387',
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
  title: {
    color: Colors.brand.text,
    fontSize: FontSizes.title,
    lineHeight: LineHeights.title,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  titleCopy: {
    gap: 2,
  },
  titleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
  },
  warningBanner: {
    borderRadius: 18,
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#F4E0B5',
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  warningBannerText: {
    flex: 1,
    color: '#B25A00',
    fontSize: FontSizes.sm,
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
});
