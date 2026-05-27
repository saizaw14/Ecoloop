import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, type Href } from 'expo-router';
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
  categoriesOverviewIconName,
  wasteCategories,
} from '@/features/categories/data/category-content';

export default function CategoriesScreen() {
  const router = useRouter();

  function handleBack() {
    router.replace('/(tabs)' as Href);
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
            <Text style={styles.backButtonText}>Back</Text>
          </HapticPressable>

          <View style={styles.headerRow}>
            <View style={styles.headerIconWrap}>
              <MaterialCommunityIcons
                color={Colors.brand.onPrimary}
                name={categoriesOverviewIconName}
                size={24}
              />
            </View>

            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Waste Categories</Text>
              <Text style={styles.headerSubtitle}>Learn about recycling</Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}>
          <View style={styles.tipCard}>
            <Text style={styles.tipCardTitle}>Recycling Tips</Text>
            <Text style={styles.tipCardBody}>
              Tap on any category to learn detailed recycling instructions and see which items
              you&apos;ve sorted in that category.
            </Text>
          </View>

          {wasteCategories.map((category) => (
            <HapticPressable
              key={category.slug}
              accessibilityRole="button"
              hapticType="selection"
              onPress={() => router.push(`/categories/${category.slug}` as Href)}
              style={({ pressed }) => [
                styles.categoryCard,
                pressed ? styles.categoryCardPressed : null,
              ]}>
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

              <View style={styles.categoryContent}>
                <Text style={styles.categoryTitle}>{category.name}</Text>
                <Text numberOfLines={2} style={styles.categoryDescription}>
                  {category.previewDescription}
                </Text>

                <View style={styles.tagWrap}>
                  {category.previewTags.map((tag) => (
                    <View key={tag} style={styles.tagChip}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </HapticPressable>
          ))}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#14B8A6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    gap: 2,
    flex: 1,
  },
  headerTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.subtitle,
    lineHeight: LineHeights.subtitle,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  headerSubtitle: {
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
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
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
  categoryCardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.992 }],
  },
  categoryIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  categoryTitle: {
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  categoryDescription: {
    color: Colors.brand.body,
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  tagChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    backgroundColor: '#F1F4F8',
  },
  tagText: {
    color: '#758396',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
  },
  tipCard: {
    borderRadius: 18,
    backgroundColor: '#10B095',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    shadowColor: Colors.brand.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  tipCardTitle: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.sm,
  },
  tipCardBody: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
});
