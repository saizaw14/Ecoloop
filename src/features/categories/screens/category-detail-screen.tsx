import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
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
import { getWasteCategory } from '@/features/categories/data/category-content';

export default function CategoryDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const normalizedSlug = Array.isArray(slug) ? slug[0] : slug;
  const category = normalizedSlug ? getWasteCategory(normalizedSlug) : undefined;

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/categories' as Href);
  }

  if (!category) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.notFoundWrap}>
          <Text style={styles.notFoundTitle}>Category not found</Text>
          <HapticPressable
            accessibilityRole="button"
            hapticType="selection"
            onPress={() => router.replace('/categories' as Href)}
            style={styles.backButton}>
            <MaterialCommunityIcons
              color={Colors.brand.body}
              name="chevron-left"
              size={20}
            />
            <Text style={styles.backButtonText}>Back to Categories</Text>
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
          <HapticPressable
            accessibilityRole="button"
            hapticType="selection"
            onPress={handleBack}
            style={styles.backButton}>
            <MaterialCommunityIcons
              color={Colors.brand.body}
              name="chevron-left"
              size={20}
            />
            <Text style={styles.backButtonText}>Back to Categories</Text>
          </HapticPressable>

          <View style={styles.categoryHeaderRow}>
            <View
              style={[
                styles.categoryIconWrap,
                { backgroundColor: category.iconBackgroundColor },
              ]}>
              <MaterialCommunityIcons
                color={Colors.brand.onPrimary}
                name={category.iconName}
                size={28}
              />
            </View>

            <View style={styles.categoryHeaderCopy}>
              <Text style={styles.categoryHeaderTitle}>{category.name}</Text>
              <Text style={styles.categoryHeaderSubtitle}>{category.detailSubtitle}</Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons
                color="#2563EB"
                name="information-outline"
                size={18}
              />
              <Text style={styles.sectionTitle}>About {category.name}</Text>
            </View>
            <Text style={styles.sectionBody}>{category.description}</Text>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons
                color="#16A34A"
                name="check-circle-outline"
                size={18}
              />
              <Text style={styles.sectionTitle}>Accepted Items</Text>
            </View>

            <View style={styles.bulletGrid}>
              {category.accepted.map((item) => (
                <View key={item} style={styles.bulletItem}>
                  <View style={[styles.bulletDot, styles.acceptedDot]} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons
                color="#FF3B30"
                name="close-circle-outline"
                size={18}
              />
              <Text style={styles.sectionTitle}>Not Accepted</Text>
            </View>

            <View style={styles.bulletGrid}>
              {category.notAccepted.map((item) => (
                <View key={item} style={styles.bulletItem}>
                  <View style={[styles.bulletDot, styles.notAcceptedDot]} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Preparation Steps</Text>

            <View style={styles.stepStack}>
              {category.preparationSteps.map((step, index) => (
                <View key={step} style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.tipsCard}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons
                color="#F59E0B"
                name="lightbulb-on-outline"
                size={18}
              />
              <Text style={[styles.sectionTitle, styles.tipsTitle]}>Pro Tips</Text>
            </View>

            <View style={styles.tipStack}>
              {category.tips.map((tip) => (
                <View key={tip} style={styles.tipRow}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.impactCard}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons color="#A7F3D0" name="earth" size={18} />
              <Text style={[styles.sectionTitle, styles.impactTitle]}>
                Environmental Impact
              </Text>
            </View>

            <Text style={styles.impactText}>{category.environmentalImpact}</Text>
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
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  categoryIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryHeaderCopy: {
    gap: 2,
    flex: 1,
  },
  categoryHeaderTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  categoryHeaderSubtitle: {
    color: '#708090',
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 124,
    gap: Spacing.lg,
  },
  sectionCard: {
    borderRadius: 20,
    backgroundColor: Colors.brand.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
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
  sectionBody: {
    color: Colors.brand.body,
    fontSize: FontSizes.sm,
    lineHeight: 24,
    fontFamily: Fonts.sans,
  },
  bulletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.sm,
  },
  bulletItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: Radii.pill,
    marginTop: 7,
  },
  acceptedDot: {
    backgroundColor: '#22C55E',
  },
  notAcceptedDot: {
    backgroundColor: '#FF3B30',
  },
  bulletText: {
    flex: 1,
    color: Colors.brand.text,
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  stepStack: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: Radii.pill,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
  stepText: {
    flex: 1,
    color: Colors.brand.text,
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  tipsCard: {
    borderRadius: 20,
    backgroundColor: '#FFF8E8',
    borderWidth: 1,
    borderColor: '#F5D46B',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  tipsTitle: {
    color: '#C67A00',
  },
  tipStack: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  tipBullet: {
    color: '#F59E0B',
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
  },
  tipText: {
    flex: 1,
    color: '#8A5A00',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  impactCard: {
    borderRadius: 20,
    backgroundColor: '#10B095',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    shadowColor: Colors.brand.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  impactTitle: {
    color: Colors.brand.onPrimary,
  },
  impactText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: FontSizes.sm,
    lineHeight: 24,
    fontFamily: Fonts.sans,
  },
  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  notFoundTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.title,
    lineHeight: LineHeights.title,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
});
