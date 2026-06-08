import { useEffect, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  ActivityIndicator,
  Alert,
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
import {
  getWasteCategories,
  type WasteCategorySlug,
} from '@/features/categories/data/category-content';
import { useUserWasteStats } from '@/features/scan/hooks/use-user-waste-stats';
import { calculateWasteEcoPoints } from '@/features/scan/services/waste-sorting-rewards';
import { auth, db } from '@/firebase/firebaseConfig';
import { logoutUser } from '@/services/authService';
import { subscribeToSavedTipIds } from '@/services/tipsService';

const POINTS_PER_LEVEL = 50;
const CO2_KG_PER_TREE = 0.8;

const categoryIconSoftBackgroundColors: Record<WasteCategorySlug, string> = {
  cardboard: '#FCE8D8',
  glass: '#DAF5F1',
  metal: '#E8EDF3',
  paper: '#F0E8FB',
  plastic: '#E0F5EA',
  general: '#FEE8E4',
};

type ProfileTab = 'overview' | 'settings';

type ProfileIdentity = {
  displayName: string;
  email: string;
  userId: string | null;
};

const defaultProfileIdentity: ProfileIdentity = {
  displayName: 'Eco Warrior',
  email: 'Sign in to sync your impact',
  userId: null,
};

function getFallbackName(email?: string | null, displayName?: string | null) {
  const trimmedDisplayName = displayName?.trim();

  if (trimmedDisplayName) {
    return trimmedDisplayName;
  }

  const emailPrefix = email?.split('@')[0]?.trim();
  return emailPrefix || defaultProfileIdentity.displayName;
}

function formatWholeNumber(value: number) {
  return Math.max(0, Math.floor(value)).toLocaleString();
}

function formatWeightCompact(value: number) {
  return `${Math.max(0, value).toFixed(2)}kg`;
}

function formatWeightReadable(value: number) {
  return `${Math.max(0, value).toFixed(2)} kg`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<ProfileTab>('overview');
  const [profile, setProfile] = useState<ProfileIdentity>(defaultProfileIdentity);
  const [savedTipCount, setSavedTipCount] = useState(0);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { categoryScanCounts, totalCO2Saved, totalEcoPoints, totalScans } = useUserWasteStats();

  useEffect(() => {
    let isActive = true;
    let activeUserId: string | null = null;
    let unsubscribeTips: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      unsubscribeTips?.();
      unsubscribeTips = null;
      activeUserId = user?.uid ?? null;

      if (!isActive) {
        return;
      }

      if (!user) {
        setProfile(defaultProfileIdentity);
        setSavedTipCount(0);
        return;
      }

      const fallbackName = getFallbackName(user.email, user.displayName);
      const fallbackEmail = user.email?.trim() || 'No email on file';

      setProfile({
        displayName: fallbackName,
        email: fallbackEmail,
        userId: user.uid,
      });

      unsubscribeTips = subscribeToSavedTipIds(user.uid, (savedTipIds) => {
        if (!isActive || activeUserId !== user.uid) {
          return;
        }

        setSavedTipCount(savedTipIds.length);
      });

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!isActive || activeUserId !== user.uid || !userDoc.exists()) {
          return;
        }

        const data = userDoc.data();
        const savedName = typeof data.name === 'string' ? data.name.trim() : '';
        const savedEmail = typeof data.email === 'string' ? data.email.trim() : '';

        setProfile({
          displayName: savedName || fallbackName,
          email: savedEmail || fallbackEmail,
          userId: user.uid,
        });
      } catch {
        if (!isActive || activeUserId !== user.uid) {
          return;
        }

        setProfile({
          displayName: fallbackName,
          email: fallbackEmail,
          userId: user.uid,
        });
      }
    });

    return () => {
      isActive = false;
      unsubscribeTips?.();
      unsubscribeAuth();
    };
  }, []);

  const currentLevel = Math.floor(totalEcoPoints / POINTS_PER_LEVEL) + 1;
  const nextLevel = currentLevel + 1;
  const progressWithinLevel = totalEcoPoints % POINTS_PER_LEVEL;
  const progressRatio = progressWithinLevel / POINTS_PER_LEVEL;
  const pointsToNextLevel = POINTS_PER_LEVEL - progressWithinLevel;
  const progressPercentage = Math.round(progressRatio * 100);
  const progressFillWidth =
    progressRatio === 0 ? ('0%' as const) : (`${Math.max(progressRatio * 100, 8).toFixed(0)}%` as `${number}%`);
  const hasActivity = totalScans > 0;
  const isSignedIn = Boolean(profile.userId);
  const treeEquivalent = totalCO2Saved > 0 ? Math.max(1, Math.round(totalCO2Saved / CO2_KG_PER_TREE)) : 0;
  const scannedCategories = getWasteCategories(categoryScanCounts).filter(
    (category) => category.sortedCount > 0
  );
  const topCategories = scannedCategories
    .map((category) => ({
      ...category,
      pointsEarned: category.sortedCount * calculateWasteEcoPoints(category.slug, false),
    }))
    .sort(
      (leftCategory, rightCategory) =>
        rightCategory.pointsEarned - leftCategory.pointsEarned ||
        rightCategory.sortedCount - leftCategory.sortedCount
    )
    .slice(0, 3);

  async function handleConfirmSignOut() {
    if (!isSignedIn) {
      router.replace('/login');
      return;
    }

    setIsSigningOut(true);

    try {
      await logoutUser();
      router.replace('/login');
    } catch {
      Alert.alert('Unable to Sign Out', 'Please try again in a moment.');
    } finally {
      setIsSigningOut(false);
    }
  }

  function handleSignOutPress() {
    if (!isSignedIn) {
      router.replace('/login');
      return;
    }

    Alert.alert('Sign Out', 'Do you want to sign out of your EcoLoop account?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          void handleConfirmSignOut();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
            <View pointerEvents="none" style={styles.heroGlowOne} />
            <View pointerEvents="none" style={styles.heroGlowTwo} />
            <View pointerEvents="none" style={styles.heroGlowThree} />

            <View style={styles.heroContent}>
              <View style={styles.avatarCircle}>
                <MaterialCommunityIcons
                  color={Colors.brand.primaryDark}
                  name="account-outline"
                  size={40}
                />
              </View>

              <Text numberOfLines={1} style={styles.profileName}>
                {profile.displayName}
              </Text>
              <Text numberOfLines={1} style={styles.profileEmail}>
                {profile.email}
              </Text>

              <View style={styles.levelBadge}>
                <MaterialCommunityIcons color={Colors.brand.onPrimary} name="medal-outline" size={16} />
                <Text style={styles.levelBadgeText}>{`Level ${currentLevel} Eco Champion`}</Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={[styles.statIconWrap, { backgroundColor: 'rgba(255, 203, 86, 0.16)' }]}>
                    <MaterialCommunityIcons color="#FFD15C" name="star-four-points" size={18} />
                  </View>
                  <Text style={styles.statValue}>{formatWholeNumber(totalEcoPoints)}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>

                <View style={styles.statCard}>
                  <View style={[styles.statIconWrap, { backgroundColor: 'rgba(111, 231, 211, 0.16)' }]}>
                    <MaterialCommunityIcons color="#73F0D1" name="recycle" size={18} />
                  </View>
                  <Text style={styles.statValue}>{formatWholeNumber(totalScans)}</Text>
                  <Text style={styles.statLabel}>Items</Text>
                </View>

                <View style={styles.statCard}>
                  <View style={[styles.statIconWrap, { backgroundColor: 'rgba(129, 199, 255, 0.16)' }]}>
                    <MaterialCommunityIcons color="#8FD3FF" name="earth" size={18} />
                  </View>
                  <Text style={styles.statValue}>{formatWeightCompact(totalCO2Saved)}</Text>
                  <Text style={styles.statLabel}>CO2 Saved</Text>
                </View>
              </View>

              <View style={styles.segmentedControl}>
                <HapticPressable
                  accessibilityRole="button"
                  hapticType="selection"
                  onPress={() => setSelectedTab('overview')}
                  style={({ pressed }) => [
                    styles.segmentButton,
                    selectedTab === 'overview' ? styles.segmentButtonActive : null,
                    pressed ? styles.segmentButtonPressed : null,
                  ]}>
                  <Text
                    style={[
                      styles.segmentButtonText,
                      selectedTab === 'overview' ? styles.segmentButtonTextActive : null,
                    ]}>
                    Overview
                  </Text>
                </HapticPressable>

                <HapticPressable
                  accessibilityRole="button"
                  hapticType="selection"
                  onPress={() => setSelectedTab('settings')}
                  style={({ pressed }) => [
                    styles.segmentButton,
                    selectedTab === 'settings' ? styles.segmentButtonActive : null,
                    pressed ? styles.segmentButtonPressed : null,
                  ]}>
                  <Text
                    style={[
                      styles.segmentButtonText,
                      selectedTab === 'settings' ? styles.segmentButtonTextActive : null,
                    ]}>
                    Settings
                  </Text>
                </HapticPressable>
              </View>
            </View>
          </View>

          <View style={styles.bodyContent}>
            {selectedTab === 'overview' ? (
              <>
                <View style={styles.progressCard}>
                  <View pointerEvents="none" style={styles.progressGlow} />

                  <View style={styles.progressHeader}>
                    <View style={styles.progressCopy}>
                      <View style={styles.progressLevelChip}>
                        <MaterialCommunityIcons
                          color={Colors.brand.primaryDark}
                          name="medal-outline"
                          size={14}
                        />
                        <Text style={styles.progressLevelChipText}>{`Level ${currentLevel}`}</Text>
                      </View>

                      <Text style={styles.progressTitle}>{`Progress to Level ${nextLevel}`}</Text>
                      <Text style={styles.progressSubtitle}>
                        {hasActivity
                          ? 'Keep scanning to unlock your next level reward.'
                          : 'Start scanning items to begin building your progress.'}
                      </Text>
                    </View>

                    <View style={styles.progressSummary}>
                      <Text style={styles.progressValue}>{pointsToNextLevel}</Text>
                      <Text style={styles.progressValueLabel}>pts to go</Text>
                    </View>
                  </View>

                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: progressFillWidth }]} />
                  </View>

                  <View style={styles.progressMetaRow}>
                    <Text style={styles.progressMetaText}>{`${progressWithinLevel}/${POINTS_PER_LEVEL} pts`}</Text>
                    <Text style={styles.progressMetaText}>{`${progressPercentage}% complete`}</Text>
                  </View>

                  <View style={styles.progressHintRow}>
                    <MaterialCommunityIcons
                      color={Colors.brand.primaryDark}
                      name="star-four-points"
                      size={14}
                    />
                    <Text style={styles.progressHintText}>
                      Earn more points by scanning recyclable items and sorting them correctly.
                    </Text>
                  </View>
                </View>

                <View style={styles.card}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                      <MaterialCommunityIcons
                        color={Colors.brand.primaryDark}
                        name="chart-line"
                        size={18}
                      />
                      <Text style={styles.sectionTitle}>Impact Dashboard</Text>
                    </View>

                    <HapticPressable
                      accessibilityRole="button"
                      hapticType="selection"
                      onPress={() => router.push('/profile/impact-details')}
                      style={styles.inlineAction}>
                      <Text style={styles.inlineActionText}>View All</Text>
                      <MaterialCommunityIcons
                        color={Colors.brand.primary}
                        name="chevron-right"
                        size={16}
                      />
                    </HapticPressable>
                  </View>

                  <View style={styles.impactList}>
                    <View style={styles.impactRow}>
                      <View style={[styles.impactIconWrap, { backgroundColor: '#D9F8EC' }]}>
                        <MaterialCommunityIcons color="#23B980" name="earth" size={20} />
                      </View>

                      <View style={styles.impactCopy}>
                        <Text style={styles.impactLabel}>CO2 Saved</Text>
                        <Text style={styles.impactValue}>{formatWeightReadable(totalCO2Saved)}</Text>
                        <Text style={styles.impactBody}>
                          {hasActivity && treeEquivalent > 0
                            ? `Equivalent to planting ${treeEquivalent} tree${
                                treeEquivalent === 1 ? '' : 's'
                              }`
                            : 'Start scanning items to measure your climate impact.'}
                        </Text>
                      </View>
                    </View>

                  </View>

                  {hasActivity ? (
                    <View style={styles.topCategoriesSection}>
                      <View style={styles.topCategoriesHeader}>
                        <MaterialCommunityIcons
                          color={Colors.brand.primaryDark}
                          name="chart-box-outline"
                          size={18}
                        />
                        <Text style={styles.topCategoriesTitle}>Top Categories</Text>
                      </View>

                      <View style={styles.topCategoriesList}>
                        {topCategories.map((category) => (
                          <View key={category.slug} style={styles.topCategoryRow}>
                            <View
                              style={[
                                styles.topCategoryIconWrap,
                                {
                                  backgroundColor:
                                    categoryIconSoftBackgroundColors[category.slug],
                                },
                              ]}>
                              <MaterialCommunityIcons
                                color={category.iconBackgroundColor}
                                name={category.iconName}
                                size={20}
                              />
                            </View>

                            <View style={styles.topCategoryCopy}>
                              <Text style={styles.topCategoryName}>{category.name}</Text>
                              <Text style={styles.topCategorySubtitle}>
                                {`${category.sortedCount} item${
                                  category.sortedCount === 1 ? '' : 's'
                                } sorted`}
                              </Text>
                            </View>

                            <Text style={styles.topCategoryPoints}>
                              {`${formatWholeNumber(category.pointsEarned)} pts`}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.impactEmptyState}>
                      <Text style={styles.impactEmptyTitle}>No recycling activity yet</Text>
                      <Text style={styles.impactEmptyBody}>
                        Start scanning items to track your impact!
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <>
                <View style={styles.card}>
                  <Text style={styles.settingsSectionTitle}>Account</Text>

                  <View style={styles.settingsRow}>
                    <View style={[styles.settingsIconWrap, { backgroundColor: '#D9F8EC' }]}>
                      <MaterialCommunityIcons
                        color={Colors.brand.primaryDark}
                        name="account-outline"
                        size={18}
                      />
                    </View>
                    <View style={styles.settingsCopy}>
                      <Text style={styles.settingsLabel}>Display Name</Text>
                      <Text style={styles.settingsValue}>{profile.displayName}</Text>
                    </View>
                  </View>

                  <View style={styles.settingsDivider} />

                  <View style={styles.settingsRow}>
                    <View style={[styles.settingsIconWrap, { backgroundColor: '#ECF3FF' }]}>
                      <MaterialCommunityIcons color="#4A7DFF" name="email-outline" size={18} />
                    </View>
                    <View style={styles.settingsCopy}>
                      <Text style={styles.settingsLabel}>Email</Text>
                      <Text style={styles.settingsValue}>{profile.email}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.card}>
                  <Text style={styles.settingsSectionTitle}>Quick Access</Text>

                  <HapticPressable
                    accessibilityRole="button"
                    hapticType="selection"
                    onPress={() => router.push('/tips')}
                    style={({ pressed }) => [
                      styles.actionRow,
                      pressed ? styles.actionRowPressed : null,
                    ]}>
                    <View style={[styles.settingsIconWrap, { backgroundColor: '#FFF2D8' }]}>
                      <MaterialCommunityIcons color="#F59E0B" name="bookmark-outline" size={18} />
                    </View>
                    <View style={styles.settingsCopy}>
                      <Text style={styles.settingsLabel}>Saved Tips</Text>
                      <Text style={styles.settingsValue}>{`${savedTipCount} tip${
                        savedTipCount === 1 ? '' : 's'
                      } saved`}</Text>
                    </View>
                    <MaterialCommunityIcons color="#B0B8C4" name="chevron-right" size={18} />
                  </HapticPressable>

                  <View style={styles.settingsDivider} />

                  <HapticPressable
                    accessibilityRole="button"
                    hapticType="selection"
                    onPress={() => router.push('/categories')}
                    style={({ pressed }) => [
                      styles.actionRow,
                      pressed ? styles.actionRowPressed : null,
                    ]}>
                    <View style={[styles.settingsIconWrap, { backgroundColor: '#E7F7F0' }]}>
                      <MaterialCommunityIcons
                        color={Colors.brand.primaryDark}
                        name="recycle"
                        size={18}
                      />
                    </View>
                    <View style={styles.settingsCopy}>
                      <Text style={styles.settingsLabel}>Recycling Guide</Text>
                      <Text style={styles.settingsValue}>Browse waste categories</Text>
                    </View>
                    <MaterialCommunityIcons color="#B0B8C4" name="chevron-right" size={18} />
                  </HapticPressable>
                </View>

                <HapticPressable
                  accessibilityRole="button"
                  disabled={isSigningOut}
                  hapticType="medium"
                  onPress={handleSignOutPress}
                  style={({ pressed }) => [
                    styles.signOutButton,
                    pressed ? styles.signOutButtonPressed : null,
                    isSigningOut ? styles.signOutButtonDisabled : null,
                  ]}>
                  {isSigningOut ? (
                    <ActivityIndicator color={Colors.brand.onPrimary} size="small" />
                  ) : (
                    <MaterialCommunityIcons
                      color={Colors.brand.onPrimary}
                      name={isSignedIn ? 'logout' : 'login'}
                      size={18}
                    />
                  )}
                  <Text style={styles.signOutButtonText}>
                    {isSignedIn ? 'Sign Out' : 'Go to Login'}
                  </Text>
                </HapticPressable>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3FBF7',
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 132,
  },
  heroSection: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0D9F7A',
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    shadowColor: '#0B7F55',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 6,
  },
  heroGlowOne: {
    position: 'absolute',
    top: -44,
    left: -30,
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroGlowTwo: {
    position: 'absolute',
    right: -48,
    top: 60,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroGlowThree: {
    position: 'absolute',
    bottom: -72,
    left: 70,
    width: 240,
    height: 140,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    transform: [{ rotate: '-7deg' }],
  },
  heroContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 74,
    height: 74,
    borderRadius: Radii.pill,
    backgroundColor: Colors.brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  profileName: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.subtitle,
    lineHeight: LineHeights.subtitle,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    marginBottom: 2,
  },
  profileEmail: {
    color: 'rgba(255,255,255,0.94)',
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    marginBottom: Spacing.md,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    marginBottom: Spacing.lg,
  },
  levelBadgeText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    minHeight: 106,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    color: Colors.brand.onPrimary,
    fontSize: 22,
    lineHeight: 26,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    textAlign: 'center',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    textAlign: 'center',
  },
  segmentedControl: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: 20,
    backgroundColor: Colors.brand.surface,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: Colors.brand.primaryDark,
    shadowColor: Colors.brand.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 2,
  },
  segmentButtonPressed: {
    opacity: 0.95,
  },
  segmentButtonText: {
    color: Colors.brand.body,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  segmentButtonTextActive: {
    color: Colors.brand.onPrimary,
  },
  bodyContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  card: {
    borderRadius: 22,
    backgroundColor: Colors.brand.surface,
    padding: Spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  progressCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: '#F9FFFC',
    padding: Spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  progressGlow: {
    position: 'absolute',
    top: -32,
    right: -22,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(10, 163, 108, 0.10)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  progressCopy: {
    flex: 1,
    gap: Spacing.xs,
    paddingRight: Spacing.md,
  },
  progressLevelChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radii.pill,
    backgroundColor: '#DFF7EC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 2,
  },
  progressLevelChipText: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  progressTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.subtitle,
    lineHeight: LineHeights.subtitle,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  progressSubtitle: {
    color: '#5C7380',
    fontSize: FontSizes.sm,
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
  progressSummary: {
    minWidth: 76,
    alignItems: 'flex-end',
  },
  progressValue: {
    color: Colors.brand.primaryDark,
    fontSize: 28,
    lineHeight: 30,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  progressValueLabel: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  progressTrack: {
    height: 10,
    borderRadius: Radii.pill,
    backgroundColor: '#E8ECEF',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.pill,
    backgroundColor: Colors.brand.primary,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  progressMetaText: {
    color: '#718096',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  progressHintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E4F1EB',
  },
  progressHintText: {
    flex: 1,
    color: '#5C7380',
    fontSize: FontSizes.caption,
    lineHeight: 20,
    fontFamily: Fonts.sans,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  inlineActionText: {
    color: Colors.brand.primary,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  impactList: {
    gap: Spacing.lg,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  impactIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  impactCopy: {
    flex: 1,
  },
  impactLabel: {
    color: '#64748B',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    marginBottom: 2,
  },
  impactValue: {
    color: Colors.brand.text,
    fontSize: FontSizes.subtitle,
    lineHeight: LineHeights.subtitle,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    marginBottom: 2,
  },
  impactBody: {
    color: '#6C788C',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  impactEmptyState: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  impactEmptyTitle: {
    color: '#5B6573',
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    textAlign: 'center',
  },
  impactEmptyBody: {
    color: '#7B8798',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    textAlign: 'center',
  },
  topCategoriesSection: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  topCategoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  topCategoriesTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  topCategoriesList: {
    gap: Spacing.md,
  },
  topCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  topCategoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCategoryCopy: {
    flex: 1,
    gap: 2,
  },
  topCategoryName: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  topCategorySubtitle: {
    color: '#7B8798',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
  },
  topCategoryPoints: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  settingsSectionTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.lg,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionRowPressed: {
    opacity: 0.92,
  },
  settingsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsCopy: {
    flex: 1,
    gap: 2,
  },
  settingsLabel: {
    color: '#64748B',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
  },
  settingsValue: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: '#EEF2F5',
    marginVertical: Spacing.lg,
  },
  signOutButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: Colors.brand.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    shadowColor: Colors.brand.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 4,
  },
  signOutButtonPressed: {
    opacity: 0.94,
  },
  signOutButtonDisabled: {
    opacity: 0.8,
  },
  signOutButtonText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
});
