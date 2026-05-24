import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { onboardingSlides, type OnboardingSlide } from '@/features/onboarding/data/onboarding-slides';
import { Fonts } from '@/theme/fonts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const BRAND_GREEN = '#0AA36C';
const BODY_TEXT = '#233041';
const MUTED_TEXT = '#B6BCC7';
const DOT_INACTIVE = '#D7DCE3';
const DOT_ACTIVE = '#0AA36C';

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
    router.replace('/(tabs)');
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
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={finishOnboarding}
              style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
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
                <MaterialCommunityIcons name={item.iconName} size={24} color="#111827" />
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
                    isActive && { backgroundColor: currentSlide.accentColor || DOT_ACTIVE },
                  ]}
                />
              );
            })}
          </View>

          <Pressable accessibilityRole="button" onPress={handleNext} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{currentSlide.buttonLabel}</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  headerSpacer: {
    width: 48,
    height: 24,
  },
  skipButton: {
    minWidth: 48,
    alignItems: 'flex-end',
  },
  skipText: {
    color: MUTED_TEXT,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    fontWeight: '600',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 84,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  heroImage: {
    width: 176,
    height: 176,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 18,
  },
  title: {
    color: '#111827',
    fontSize: 24,
    lineHeight: 30,
    fontFamily: Fonts.sans,
    fontWeight: '500',
    textAlign: 'center',
  },
  description: {
    maxWidth: 292,
    color: BODY_TEXT,
    fontSize: 21,
    lineHeight: 32,
    textAlign: 'center',
    fontFamily: Fonts.sans,
  },
  footer: {
    paddingHorizontal: 28,
    paddingTop: 16,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  activeDot: {
    width: 28,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: DOT_INACTIVE,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: BRAND_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#0B7F55',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: Fonts.sans,
    fontWeight: '600',
  },
});
