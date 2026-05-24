import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticPressable } from '@/components/ui/haptic-pressable';
import {
  Colors,
  Fonts,
  FontSizes,
  FontWeights,
  IconSizes,
  LineHeights,
  Radii,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { onboardingSlides, type OnboardingSlide } from '@/features/onboarding/data/onboarding-slides';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const lastIndex = onboardingSlides.length - 1;
  const currentSlide = onboardingSlides[currentIndex];
  const showSkip = currentIndex < lastIndex;

  function finishOnboarding() {
    router.replace('/login');
  }

  function handleNext() {
    if (currentIndex >= lastIndex) {
      finishOnboarding();
      return;
    }

    const nextIndex = currentIndex + 1;
    listRef.current?.scrollToIndex({ animated: true, index: nextIndex });
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);

    if (nextIndex !== currentIndex) {
      setCurrentIndex(nextIndex);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          {showSkip ? (
            <HapticPressable
              accessibilityRole="button"
              hapticType="selection"
              hitSlop={10}
              onPress={finishOnboarding}
              style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </HapticPressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <FlatList
          ref={listRef}
          data={onboardingSlides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          keyExtractor={(item) => item.id}
          onMomentumScrollEnd={handleScrollEnd}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              <View style={styles.heroSection}>
                <Image
                  source={item.image}
                  contentFit="contain"
                  style={styles.heroImage}
                  transition={200}
                />
              </View>

              <View style={styles.titleRow}>
                <MaterialCommunityIcons name={item.iconName} size={IconSizes.lg} color={Colors.brand.text} />
                <Text style={styles.title}>{item.title}</Text>
              </View>

              <Text style={styles.description}>{item.description}</Text>
            </View>
          )}
        />

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.dots}>
            {onboardingSlides.map((slide, index) => {
              const isActive = index === currentIndex;

              return (
                <View
                  key={slide.id}
                  style={[
                    styles.dot,
                    isActive ? styles.activeDot : styles.inactiveDot,
                    isActive && { backgroundColor: Colors.brand.primary },
                  ]}
                />
              );
            })}
          </View>

          <HapticPressable
            accessibilityRole="button"
            hapticType="medium"
            onPress={handleNext}
            style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{currentSlide.buttonLabel}</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={IconSizes.md}
              color={Colors.brand.onPrimary}
            />
          </HapticPressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.brand.surface,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.brand.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  headerSpacer: {
    width: Spacing.wide,
    height: LineHeights.body,
  },
  skipButton: {
    minWidth: Spacing.wide,
    alignItems: 'flex-end',
  },
  skipText: {
    color: Colors.brand.muted,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.bodyTight,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.heroTop,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  heroImage: {
    width: 176,
    height: 176,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: FontSizes.button,
  },
  title: {
    color: Colors.brand.text,
    fontSize: FontSizes.title,
    lineHeight: LineHeights.title,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    textAlign: 'center',
  },
  description: {
    maxWidth: 292,
    color: Colors.brand.body,
    fontSize: FontSizes.bodyLarge,
    lineHeight: LineHeights.bodyLarge,
    textAlign: 'center',
    fontFamily: Fonts.sans,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  dot: {
    height: Spacing.sm,
    borderRadius: Radii.pill,
  },
  activeDot: {
    width: Spacing.xxl,
  },
  inactiveDot: {
    width: Spacing.sm,
    backgroundColor: Colors.brand.dotInactive,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: Radii.lg,
    backgroundColor: Colors.brand.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + 2,
    ...Shadows.button,
  },
  primaryButtonText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.button,
    lineHeight: LineHeights.button,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
});
