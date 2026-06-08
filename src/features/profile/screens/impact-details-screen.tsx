import { useEffect, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { getWasteCategories } from '@/features/categories/data/category-content';
import { useUserWasteStats } from '@/features/scan/hooks/use-user-waste-stats';
import { calculateWasteEcoPoints } from '@/features/scan/services/waste-sorting-rewards';
import { auth, db } from '@/firebase/firebaseConfig';

const CO2_KG_PER_TREE = 0.8;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

type AchievementDefinition = {
  accentColor: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  lockedAccentColor: string;
  requirementLabel: string;
  surfaceColor: string;
  title: string;
  type: 'scans' | 'streak';
  unlockAt: number;
};

const achievementDefinitions: AchievementDefinition[] = [
  {
    accentColor: '#FF9800',
    iconName: 'sprout',
    lockedAccentColor: '#B9C1CC',
    requirementLabel: 'First item scanned',
    surfaceColor: '#FFF1DE',
    title: 'Getting Started',
    type: 'scans',
    unlockAt: 1,
  },
  {
    accentColor: '#12B886',
    iconName: 'recycle',
    lockedAccentColor: '#B9C1CC',
    requirementLabel: '10 items scanned',
    surfaceColor: '#E6FAF3',
    title: 'Eco Enthusiast',
    type: 'scans',
    unlockAt: 10,
  },
  {
    accentColor: '#377CF1',
    iconName: 'earth',
    lockedAccentColor: '#B9C1CC',
    requirementLabel: '50 items scanned',
    surfaceColor: '#EBF3FF',
    title: 'Planet Protector',
    type: 'scans',
    unlockAt: 50,
  },
  {
    accentColor: '#8B5CF6',
    iconName: 'trophy-outline',
    lockedAccentColor: '#B9C1CC',
    requirementLabel: '100 items scanned',
    surfaceColor: '#F2ECFF',
    title: 'Eco Champion',
    type: 'scans',
    unlockAt: 100,
  },
  {
    accentColor: '#F97316',
    iconName: 'fire',
    lockedAccentColor: '#B9C1CC',
    requirementLabel: '7 day streak',
    surfaceColor: '#FFF0E6',
    title: 'On Fire',
    type: 'streak',
    unlockAt: 7,
  },
  {
    accentColor: '#F59E0B',
    iconName: 'star-outline',
    lockedAccentColor: '#B9C1CC',
    requirementLabel: '30 day streak',
    surfaceColor: '#FFF6DD',
    title: 'All-Star',
    type: 'streak',
    unlockAt: 30,
  },
] as const;

function formatWholeNumber(value: number) {
  return Math.max(0, Math.floor(value)).toLocaleString();
}

function formatWeightReadable(value: number) {
  return `${Math.max(0, value).toFixed(2)} kg`;
}

function formatShortMonthYear(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalizeFirestoreDate(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as { toDate?: unknown };

  if (typeof candidate.toDate !== 'function') {
    return null;
  }

  const date = candidate.toDate();

  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
}

function getGuaranteedStreakDays(lastSyncedAt: Date | null, hasActivity: boolean) {
  if (!hasActivity || !lastSyncedAt) {
    return 0;
  }

  const dayDifference = Math.floor(
    (startOfDay(new Date()).getTime() - startOfDay(lastSyncedAt).getTime()) / DAY_IN_MS
  );

  return dayDifference <= 1 ? 1 : 0;
}

export default function ImpactDetailsScreen() {
  const router = useRouter();
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const { categoryScanCounts, totalCO2Saved, totalEcoPoints, totalScans } = useUserWasteStats();

  useEffect(() => {
    let isMounted = true;
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeUserDoc?.();
      unsubscribeUserDoc = null;

      if (!isMounted) {
        return;
      }

      if (!user) {
        setLastSyncedAt(null);
        return;
      }

      unsubscribeUserDoc = onSnapshot(
        doc(db, 'users', user.uid),
        (snapshot) => {
          if (!isMounted) {
            return;
          }

          if (!snapshot.exists()) {
            setLastSyncedAt(null);
            return;
          }

          setLastSyncedAt(normalizeFirestoreDate(snapshot.data().updatedAt));
        },
        () => {
          if (isMounted) {
            setLastSyncedAt(null);
          }
        }
      );
    });

    return () => {
      isMounted = false;
      unsubscribeUserDoc?.();
      unsubscribeAuth();
    };
  }, []);

  const hasActivity = totalScans > 0;
  const currentPeriodDate = lastSyncedAt ?? new Date();
  const currentPeriodLabel = formatShortMonthYear(currentPeriodDate);
  const currentStreakDays = getGuaranteedStreakDays(lastSyncedAt, hasActivity);
  const treeEquivalent =
    totalCO2Saved > 0 ? Math.max(1, Math.round(totalCO2Saved / CO2_KG_PER_TREE)) : 0;
  const activeCategories = getWasteCategories(categoryScanCounts).filter(
    (category) => category.sortedCount > 0
  );
  const categoriesByPoints = activeCategories
    .map((category) => ({
      ...category,
      pointsEarned: category.sortedCount * calculateWasteEcoPoints(category.slug, false),
    }))
    .sort(
      (leftCategory, rightCategory) =>
        rightCategory.pointsEarned - leftCategory.pointsEarned ||
        rightCategory.sortedCount - leftCategory.sortedCount
    );
  const topCategory = categoriesByPoints[0] ?? null;
  const unlockedAchievements = achievementDefinitions.map((achievement) => {
    const progressSource = achievement.type === 'scans' ? totalScans : currentStreakDays;

    return {
      ...achievement,
      unlocked: progressSource >= achievement.unlockAt,
    };
  });
  const unlockedAchievementCount = unlockedAchievements.filter(
    (achievement) => achievement.unlocked
  ).length;

  function handleBackToImpact() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/profile');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <View style={styles.headerShell}>
          <HapticPressable
            accessibilityRole="button"
            hapticType="selection"
            onPress={handleBackToImpact}
            style={styles.backButton}>
            <MaterialCommunityIcons
              color={Colors.brand.body}
              name="chevron-left"
              size={20}
            />
            <Text style={styles.backButtonText}>Back to Impact</Text>
          </HapticPressable>

          <View style={styles.titleRow}>
            <View style={styles.titleIconWrap}>
              <MaterialCommunityIcons
                color={Colors.brand.primaryDark}
                name="calendar-month-outline"
                size={22}
              />
            </View>

            <View style={styles.titleCopy}>
              <Text style={styles.title}>Detailed Statistics</Text>
              <Text style={styles.subtitle}>Your complete journey</Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.bodyShell}>
            <View style={styles.card}>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons color="#FF7A00" name="medal-outline" size={18} />
                <Text style={styles.sectionTitle}>Recycling Streak</Text>
              </View>

              <View style={styles.streakHero}>
                <View style={styles.streakIconOrb}>
                  <MaterialCommunityIcons color="#FF7A00" name="fire" size={44} />
                </View>
                <Text style={styles.streakValue}>{currentStreakDays}</Text>
                <Text style={styles.streakLabel}>
                  {`day${currentStreakDays === 1 ? '' : 's'} in a row`}
                </Text>
              </View>

              <View style={styles.streakMessageBox}>
                <Text style={styles.streakMessageText}>
                  {hasActivity
                    ? 'Keep it up! You are making a difference every day.'
                    : 'Scan your first item to start your recycling streak.'}
                </Text>
              </View>

              <Text style={styles.helperCaption}>
                {hasActivity && lastSyncedAt
                  ? 'Streak currently reflects the latest guaranteed synced day.'
                  : 'Daily streaks become more detailed as more scan history is tracked.'}
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.monthlyHeader}>
                <View>
                  <Text style={styles.monthlyTitle}>Monthly Breakdown</Text>
                  <Text style={styles.monthlySubtitle}>Current synced overview</Text>
                </View>

                <View style={styles.monthlyItemsBadge}>
                  <Text style={styles.monthlyItemsText}>
                    {`${formatWholeNumber(totalScans)} item${totalScans === 1 ? '' : 's'}`}
                  </Text>
                </View>
              </View>

              <View style={styles.periodHeader}>
                <Text style={styles.periodLabel}>{currentPeriodLabel}</Text>
                <Text style={styles.periodMetaText}>
                  {hasActivity ? 'Updated from your latest totals' : 'No synced activity yet'}
                </Text>
              </View>

              <View style={styles.monthlyStatsRow}>
                <View style={styles.monthlyStatItem}>
                  <Text style={styles.monthlyStatLabel}>Points</Text>
                  <Text style={styles.monthlyStatValue}>{formatWholeNumber(totalEcoPoints)}</Text>
                </View>

                <View style={styles.monthlyStatItem}>
                  <Text style={styles.monthlyStatLabel}>CO2</Text>
                  <Text style={styles.monthlyStatValue}>{formatWeightReadable(totalCO2Saved)}</Text>
                </View>

                <View style={styles.monthlyStatItem}>
                  <Text style={styles.monthlyStatLabel}>Categories</Text>
                  <Text style={styles.monthlyStatValue}>{formatWholeNumber(activeCategories.length)}</Text>
                </View>
              </View>

              <View style={styles.highlightStrip}>
                <View style={styles.highlightCopy}>
                  <Text style={styles.highlightLabel}>Best Category</Text>
                  <Text style={styles.highlightValue}>
                    {topCategory ? topCategory.name : 'No scans yet'}
                  </Text>
                </View>

                <View style={styles.highlightCopy}>
                  <Text style={styles.highlightLabel}>Tree Impact</Text>
                  <Text style={styles.highlightValue}>
                    {treeEquivalent > 0
                      ? `${treeEquivalent} tree${treeEquivalent === 1 ? '' : 's'}`
                      : '0 trees'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.achievementsHeader}>
                <Text style={styles.achievementsTitle}>Achievements</Text>
                <Text style={styles.achievementsCount}>
                  {`${unlockedAchievementCount}/${achievementDefinitions.length} unlocked`}
                </Text>
              </View>

              <View style={styles.achievementsGrid}>
                {unlockedAchievements.map((achievement) => (
                  <View
                    key={achievement.title}
                    style={[
                      styles.achievementCard,
                      achievement.unlocked
                        ? { backgroundColor: achievement.surfaceColor }
                        : styles.achievementCardLocked,
                    ]}>
                    <View
                      style={[
                        styles.achievementIconWrap,
                        achievement.unlocked
                          ? { backgroundColor: '#FFFFFF' }
                          : styles.achievementIconWrapLocked,
                      ]}>
                      <MaterialCommunityIcons
                        color={
                          achievement.unlocked
                            ? achievement.accentColor
                            : achievement.lockedAccentColor
                        }
                        name={achievement.iconName}
                        size={20}
                      />
                    </View>

                    <Text
                      style={[
                        styles.achievementTitle,
                        achievement.unlocked ? null : styles.achievementTitleLocked,
                      ]}>
                      {achievement.title}
                    </Text>
                    <Text style={styles.achievementRequirement}>
                      {achievement.requirementLabel}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.brand.authBackground,
  },
  screen: {
    flex: 1,
  },
  headerShell: {
    backgroundColor: Colors.brand.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EFEC',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: -4,
    gap: 2,
  },
  backButtonText: {
    color: Colors.brand.body,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  titleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#DFF7EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCopy: {
    gap: 2,
  },
  title: {
    color: Colors.brand.text,
    fontSize: FontSizes.title,
    lineHeight: LineHeights.title,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  subtitle: {
    color: '#667387',
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
  scrollContent: {
    paddingBottom: 132,
  },
  bodyShell: {
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
  streakHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  streakIconOrb: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFF4E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  streakValue: {
    color: Colors.brand.text,
    fontSize: 40,
    lineHeight: 42,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    marginBottom: 4,
  },
  streakLabel: {
    color: Colors.brand.body,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
  },
  streakMessageBox: {
    borderRadius: 18,
    backgroundColor: '#FFF8E8',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  streakMessageText: {
    color: '#B25A00',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    textAlign: 'center',
  },
  helperCaption: {
    color: '#8A94A6',
    fontSize: FontSizes.caption,
    lineHeight: 18,
    fontFamily: Fonts.sans,
    textAlign: 'center',
  },
  monthlyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  monthlyTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  monthlySubtitle: {
    color: '#7B8798',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    marginTop: 2,
  },
  monthlyItemsBadge: {
    borderRadius: Radii.pill,
    backgroundColor: '#E6FAF3',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  monthlyItemsText: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  periodHeader: {
    marginBottom: Spacing.md,
  },
  periodLabel: {
    color: Colors.brand.text,
    fontSize: FontSizes.subtitle,
    lineHeight: LineHeights.subtitle,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  periodMetaText: {
    color: '#7B8798',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    marginTop: 4,
  },
  monthlyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  monthlyStatItem: {
    flex: 1,
  },
  monthlyStatLabel: {
    color: '#7B8798',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    marginBottom: 4,
  },
  monthlyStatValue: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  highlightStrip: {
    flexDirection: 'row',
    gap: Spacing.md,
    borderRadius: 18,
    backgroundColor: '#F5FBF8',
    padding: Spacing.md,
  },
  highlightCopy: {
    flex: 1,
    gap: 4,
  },
  highlightLabel: {
    color: '#7B8798',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
  },
  highlightValue: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  achievementsTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  achievementsCount: {
    color: '#7B8798',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  achievementCard: {
    width: '47.5%',
    borderRadius: 18,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    minHeight: 138,
  },
  achievementCardLocked: {
    backgroundColor: '#F4F6F8',
  },
  achievementIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  achievementIconWrapLocked: {
    backgroundColor: '#FFFFFF',
  },
  achievementTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementTitleLocked: {
    color: '#606C80',
  },
  achievementRequirement: {
    color: '#7B8798',
    fontSize: FontSizes.caption,
    lineHeight: 18,
    fontFamily: Fonts.sans,
    textAlign: 'center',
  },
});
