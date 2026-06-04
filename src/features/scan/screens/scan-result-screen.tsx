import { useState } from 'react';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, type Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  getWasteCategory,
  wasteCategorySlugs,
} from '@/features/categories/data/category-content';
import {
  calculateWasteEcoPoints,
  ecoPointRules,
  getWasteSortingGuidance,
  getWasteSortingSummary,
} from '@/features/scan/services/waste-sorting-rewards';
import { recordWasteScan } from '@/features/scan/services/user-waste-stats-service';
import {
  clearLatestScanResult,
  getLatestScanResult,
} from '@/features/scan/store/scan-session';

function formatConfidence(confidence: number) {
  return `${confidence}% confidence`;
}

export default function ScanResultScreen() {
  const router = useRouter();
  const result = getLatestScanResult();
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(
    result?.categorySlug ?? 'general'
  );
  const [isSaving, setIsSaving] = useState(false);

  function handleDiscardToCamera() {
    clearLatestScanResult();
    router.replace('/scan' as Href);
  }

  function handleDiscardToHome() {
    clearLatestScanResult();
    router.replace('/(tabs)' as Href);
  }

  if (!result) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <MaterialCommunityIcons
              color={Colors.brand.primaryDark}
              name="camera-off-outline"
              size={28}
            />
          </View>
          <Text style={styles.emptyTitle}>No scan result yet</Text>
          <Text style={styles.emptyBody}>
            Capture a waste item first so we can show your scan result.
          </Text>
          <HapticPressable
            accessibilityRole="button"
            hapticType="medium"
            onPress={() => router.replace('/scan' as Href)}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.primaryButtonPressed : null,
            ]}>
            <Text style={styles.primaryButtonText}>Open Camera</Text>
          </HapticPressable>
        </View>
      </SafeAreaView>
    );
  }

  const selectedCategory =
    getWasteCategory(selectedCategorySlug) ?? getWasteCategory(result.categorySlug);

  if (!selectedCategory) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Category unavailable</Text>
          <Text style={styles.emptyBody}>
            We could not load the selected waste category for this result.
          </Text>
          <HapticPressable
            accessibilityRole="button"
            hapticType="medium"
            onPress={handleDiscardToCamera}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.primaryButtonPressed : null,
            ]}>
            <Text style={styles.primaryButtonText}>Back to Camera</Text>
          </HapticPressable>
        </View>
      </SafeAreaView>
    );
  }

  const confirmedCategory = selectedCategory;
  const wasCategoryCorrected = confirmedCategory.slug !== result.categorySlug;
  const sortingGuidance = getWasteSortingGuidance(confirmedCategory.slug);
  const sortingSummary = getWasteSortingSummary(
    confirmedCategory.slug,
    wasCategoryCorrected
  );
  const ecoPointsEarned = calculateWasteEcoPoints(
    confirmedCategory.slug,
    wasCategoryCorrected
  );

  async function handleSaveAndViewGuide() {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);

      const didSave = await recordWasteScan({
        categorySlug: confirmedCategory.slug,
        co2SavedKg: sortingGuidance.co2SavedKg,
        ecoPointsEarned,
      });

      if (!didSave) {
        Alert.alert(
          'Could not save sorting',
          'Please make sure you are signed in and try again.'
        );
        return;
      }

      clearLatestScanResult();
      router.replace(`/categories/${confirmedCategory.slug}` as Href);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <View style={styles.headerShell}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerMain}>
              <HapticPressable
                accessibilityRole="button"
                hapticType="selection"
                onPress={handleDiscardToCamera}
                style={styles.backButton}>
                <MaterialCommunityIcons color={Colors.brand.body} name="chevron-left" size={20} />
                <Text style={styles.backButtonText}>Scan Again</Text>
              </HapticPressable>

              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle}>Sort This Item</Text>
              </View>

              <Text style={styles.headerSubtitle}>
                Choose the right bin, then save to view the recycling guide.
              </Text>
            </View>

            <HapticPressable
              accessibilityLabel="Close scan result"
              accessibilityRole="button"
              hapticType="selection"
              onPress={handleDiscardToHome}
              style={({ pressed }) => [
                styles.closeButton,
                pressed ? styles.closeButtonPressed : null,
              ]}>
              <MaterialCommunityIcons color={Colors.brand.text} name="close" size={22} />
            </HapticPressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}>
          <View style={styles.previewCard}>
            <Image source={{ uri: result.imageUri }} contentFit="cover" style={styles.previewImage} />

            <View style={styles.previewMetaRow}>
              <View
                style={[
                  styles.resultIconWrap,
                  { backgroundColor: confirmedCategory.iconBackgroundColor },
                ]}>
                <MaterialCommunityIcons
                  color={Colors.brand.onPrimary}
                  name={confirmedCategory.iconName}
                  size={24}
                />
              </View>

              <View style={styles.previewMetaCopy}>
                <Text style={styles.resultCategory}>{confirmedCategory.name}</Text>
                <Text style={styles.resultConfidence}>
                  {wasCategoryCorrected
                    ? `Manually corrected from ${result.categoryName}`
                    : `AI prediction at ${formatConfidence(result.confidence)}`}
                </Text>
              </View>

              <View
                style={[
                  styles.statusChip,
                  confirmedCategory.recyclable
                    ? styles.recyclableChip
                    : styles.generalChip,
                ]}>
                <Text style={styles.statusChipText}>
                  {confirmedCategory.recyclable ? 'Recyclable' : confirmedCategory.name}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.correctionCard}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons
                color={Colors.brand.primaryDark}
                name="tune-variant"
                size={18}
              />
              <Text style={styles.sectionTitle}>Choose the right bin</Text>
            </View>

            <Text style={styles.correctionBody}>
              If the AI guessed wrong, correct it below. Sorting it into the right bin
              earns your normal eco points, and corrections earn +{ecoPointRules.manualCorrectionBonus}.
            </Text>

            <View style={styles.categoryOptionWrap}>
              {wasteCategorySlugs.map((categorySlug) => {
                const category = getWasteCategory(categorySlug);

                if (!category) {
                  return null;
                }

                const isActive = category.slug === confirmedCategory.slug;

                return (
                  <HapticPressable
                    key={category.slug}
                    accessibilityRole="button"
                    hapticType="selection"
                    onPress={() => setSelectedCategorySlug(category.slug)}
                    style={({ pressed }) => [
                      styles.categoryOption,
                      isActive ? styles.categoryOptionActive : null,
                      pressed ? styles.categoryOptionPressed : null,
                    ]}>
                    <View
                      style={[
                        styles.categoryOptionIconWrap,
                        { backgroundColor: category.iconBackgroundColor },
                      ]}>
                      <MaterialCommunityIcons
                        color={Colors.brand.onPrimary}
                        name={category.iconName}
                        size={16}
                      />
                    </View>
                    <Text style={styles.categoryOptionLabel}>{category.name}</Text>
                  </HapticPressable>
                );
              })}
            </View>

            {wasCategoryCorrected ? (
              <View style={styles.correctionNote}>
                <MaterialCommunityIcons
                  color="#0B7F55"
                  name="leaf-circle-outline"
                  size={16}
                />
                <Text style={styles.correctionNoteText}>
                  Great catch. You helped sort this item into the right bin.
                </Text>
              </View>
            ) : null}

            <View style={styles.rewardCard}>
              <Text style={styles.rewardLabel}>You&apos;ll earn</Text>
              <Text style={styles.rewardValue}>+{ecoPointsEarned} eco points</Text>
              <Text style={styles.rewardHint}>
                {sortingGuidance.co2SavedKg.toFixed(2)} kg CO2 saved
                {wasCategoryCorrected
                  ? ` | includes +${ecoPointRules.manualCorrectionBonus} correction bonus`
                  : ''}
              </Text>
            </View>
          </View>

          <View style={styles.scoresCard}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons
                color={Colors.brand.primaryDark}
                name="chart-bar"
                size={18}
              />
              <Text style={styles.sectionTitle}>Model scores</Text>
            </View>

            <Text style={styles.scoresIntro}>
              {sortingSummary} The AI predicted {result.categoryName} with{' '}
              {formatConfidence(result.confidence)}.
            </Text>

            <View style={styles.scoresList}>
              {result.labelScores.map((score) => (
                <View
                  key={score.label}
                  style={[
                    styles.scoreRow,
                    score.label === result.topLabel ? styles.scoreRowActive : null,
                  ]}>
                  <Text style={styles.scoreLabel}>{score.label}</Text>
                  <Text style={styles.scoreValue}>{score.confidence.toFixed(1)}%</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.guidanceCard}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons
                color={Colors.brand.primaryDark}
                name="clipboard-check-outline"
                size={18}
              />
              <Text style={styles.sectionTitle}>Next step</Text>
            </View>
            <Text style={styles.guidanceBody}>{sortingGuidance.nextStep}</Text>

            <View style={styles.preparationList}>
              {confirmedCategory.preparationSteps.slice(0, 3).map((step, index) => (
                <View key={step} style={styles.preparationRow}>
                  <View style={styles.preparationBadge}>
                    <Text style={styles.preparationBadgeText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.preparationText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.examplesCard}>
            <Text style={styles.sectionTitle}>Accepted examples</Text>
            <View style={styles.examplesWrap}>
              {confirmedCategory.accepted.slice(0, 4).map((item) => (
                <View key={item} style={styles.exampleChip}>
                  <Text style={styles.exampleChipText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.impactCard}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons color="#A7F3D0" name="earth" size={18} />
              <Text style={[styles.sectionTitle, styles.impactTitle]}>Environmental impact</Text>
            </View>
            <Text style={styles.impactBody}>{confirmedCategory.environmentalImpact}</Text>
            <Text style={styles.impactFootnote}>
              Confirming this sort adds {sortingGuidance.co2SavedKg.toFixed(2)} kg CO2
              saved to your impact totals.
            </Text>
          </View>

          <View style={styles.actionRow}>
            <HapticPressable
              accessibilityRole="button"
              disabled={isSaving}
              hapticType="medium"
              onPress={handleSaveAndViewGuide}
              style={({ pressed }) => [
                styles.primaryButton,
                isSaving ? styles.actionDisabled : null,
                pressed && !isSaving ? styles.primaryButtonPressed : null,
              ]}>
              <Text style={styles.primaryButtonText}>
                {isSaving ? 'Saving...' : 'Save & View Guidance'}
              </Text>
            </HapticPressable>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#DDE9E2',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  headerMain: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    marginBottom: Spacing.lg,
  },
  backButtonText: {
    color: Colors.brand.body,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.title,
    lineHeight: LineHeights.title,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  headerSubtitle: {
    color: '#708090',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: Radii.pill,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 124,
    gap: Spacing.lg,
  },
  previewCard: {
    borderRadius: 24,
    backgroundColor: Colors.brand.surface,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  previewImage: {
    width: '100%',
    height: 260,
    backgroundColor: '#DDE5EA',
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  resultIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewMetaCopy: {
    flex: 1,
    gap: 2,
  },
  resultCategory: {
    color: Colors.brand.text,
    fontSize: FontSizes.subtitle,
    lineHeight: LineHeights.subtitle,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  resultConfidence: {
    color: '#708090',
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
  statusChip: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  recyclableChip: {
    backgroundColor: '#E8FAEC',
  },
  generalChip: {
    backgroundColor: '#FEECEC',
  },
  statusChipText: {
    color: Colors.brand.text,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  correctionCard: {
    borderRadius: 20,
    backgroundColor: Colors.brand.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  correctionBody: {
    color: '#5F6E80',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  categoryOptionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.sm,
  },
  categoryOption: {
    width: '31%',
    borderRadius: 18,
    backgroundColor: '#F4F7FA',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 86,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 12,
  },
  categoryOptionActive: {
    backgroundColor: '#E7F8F0',
    borderWidth: 1,
    borderColor: '#B8E2CC',
  },
  categoryOptionPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  categoryOptionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryOptionLabel: {
    color: Colors.brand.text,
    fontSize: FontSizes.caption,
    lineHeight: 18,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    textAlign: 'center',
  },
  correctionNote: {
    borderRadius: 16,
    backgroundColor: '#E7F8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  correctionNoteText: {
    flex: 1,
    color: '#0B7F55',
    fontSize: FontSizes.caption,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  rewardCard: {
    borderRadius: 18,
    backgroundColor: '#10B095',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  rewardLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    marginBottom: 4,
  },
  rewardValue: {
    color: Colors.brand.onPrimary,
    fontSize: 30,
    lineHeight: 34,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.xs,
  },
  rewardHint: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  scoresCard: {
    borderRadius: 20,
    backgroundColor: Colors.brand.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  scoresIntro: {
    color: '#5F6E80',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    marginBottom: Spacing.lg,
  },
  scoresList: {
    gap: Spacing.sm,
  },
  scoreRow: {
    borderRadius: 16,
    backgroundColor: '#F4F7FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  scoreRowActive: {
    backgroundColor: '#E7F8F0',
    borderWidth: 1,
    borderColor: '#B8E2CC',
  },
  scoreLabel: {
    color: Colors.brand.text,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  scoreValue: {
    color: Colors.brand.body,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  guidanceCard: {
    borderRadius: 20,
    backgroundColor: Colors.brand.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  guidanceBody: {
    color: Colors.brand.body,
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    marginBottom: Spacing.lg,
  },
  preparationList: {
    gap: Spacing.sm,
  },
  preparationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  preparationBadge: {
    width: 22,
    height: 22,
    borderRadius: Radii.pill,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preparationBadgeText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
  preparationText: {
    flex: 1,
    color: Colors.brand.text,
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  examplesCard: {
    borderRadius: 20,
    backgroundColor: Colors.brand.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  examplesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  exampleChip: {
    borderRadius: Radii.pill,
    backgroundColor: '#EEF2F6',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  exampleChipText: {
    color: '#6C788C',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
  },
  impactCard: {
    borderRadius: 20,
    backgroundColor: '#10B095',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  impactTitle: {
    color: Colors.brand.onPrimary,
  },
  impactBody: {
    color: 'rgba(255,255,255,0.94)',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    marginBottom: Spacing.sm,
  },
  impactFootnote: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
  },
  actionRow: {
    gap: Spacing.md,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: Colors.brand.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  primaryButtonPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  actionDisabled: {
    opacity: 0.6,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#E7F8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.title,
    lineHeight: LineHeights.title,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.sm,
  },
  emptyBody: {
    color: '#667387',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});
