import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, type Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/scan' as Href);
  }

  function handleScanAgain() {
    clearLatestScanResult();
    router.replace('/scan' as Href);
  }

  function handleClose() {
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
            Capture a waste item first so we can show the mock classification result.
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
                onPress={handleBack}
                style={styles.backButton}>
                <MaterialCommunityIcons color={Colors.brand.body} name="chevron-left" size={20} />
                <Text style={styles.backButtonText}>Back to Camera</Text>
              </HapticPressable>

              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle}>Classification Result</Text>
                <View style={styles.mockBadge}>
                  <Text style={styles.mockBadgeText}>Mock</Text>
                </View>
              </View>

              <Text style={styles.headerSubtitle}>
                This is a sample result flow using mock classification before the real AI model.
              </Text>
            </View>

            <HapticPressable
              accessibilityLabel="Close scan result"
              accessibilityRole="button"
              hapticType="selection"
              onPress={handleClose}
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
                  { backgroundColor: result.iconBackgroundColor },
                ]}>
                <MaterialCommunityIcons
                  color={Colors.brand.onPrimary}
                  name={result.iconName}
                  size={24}
                />
              </View>

              <View style={styles.previewMetaCopy}>
                <Text style={styles.resultCategory}>{result.categoryName}</Text>
                <Text style={styles.resultConfidence}>{formatConfidence(result.confidence)}</Text>
              </View>

              <View
                style={[
                  styles.statusChip,
                  result.recyclable ? styles.recyclableChip : styles.generalChip,
                ]}>
                <Text style={styles.statusChipText}>
                  {result.recyclable ? 'Recyclable' : result.categoryName}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>What we found</Text>
            <Text style={styles.summaryBody}>{result.summary}</Text>
            <Text style={styles.descriptionBody}>{result.description}</Text>
          </View>

          <View style={styles.guidanceCard}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons color={Colors.brand.primaryDark} name="clipboard-check-outline" size={18} />
              <Text style={styles.sectionTitle}>Next step</Text>
            </View>
            <Text style={styles.guidanceBody}>{result.nextStep}</Text>

            <View style={styles.preparationList}>
              {result.preparationSteps.map((step, index) => (
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
              {result.acceptedExamples.map((item) => (
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
            <Text style={styles.impactBody}>{result.environmentalImpact}</Text>
            <Text style={styles.impactFootnote}>
              Mock estimate: {result.co2SavedKg.toFixed(2)} kg CO2 saved for this classification flow.
            </Text>
          </View>

          <View style={styles.actionRow}>
            <HapticPressable
              accessibilityRole="button"
              hapticType="selection"
              onPress={() => router.push(`/categories/${result.categorySlug}` as Href)}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.secondaryButtonPressed : null,
              ]}>
              <Text style={styles.secondaryButtonText}>View Category Guide</Text>
            </HapticPressable>

            <HapticPressable
              accessibilityRole="button"
              hapticType="medium"
              onPress={handleScanAgain}
              style={({ pressed }) => [
                styles.primaryButton,
                styles.scanAgainButton,
                pressed ? styles.primaryButtonPressed : null,
              ]}>
              <Text style={styles.primaryButtonText}>Scan Again</Text>
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
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.title,
    lineHeight: LineHeights.title,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  mockBadge: {
    borderRadius: Radii.pill,
    backgroundColor: '#FFF0DB',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  mockBadgeText: {
    color: '#C67A00',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
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
  summaryCard: {
    borderRadius: 20,
    backgroundColor: Colors.brand.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
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
  summaryBody: {
    color: Colors.brand.body,
    fontSize: FontSizes.body,
    lineHeight: 24,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  descriptionBody: {
    color: '#5F6E80',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
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
  secondaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: Colors.brand.surface,
    borderWidth: 1,
    borderColor: Colors.brand.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  secondaryButtonPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  secondaryButtonText: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: Colors.brand.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  scanAgainButton: {
    marginBottom: Spacing.sm,
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
