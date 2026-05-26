import { useEffect, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppImages } from '@/assets/images';
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
import { auth, db } from '@/firebase/firebaseConfig';

type ShortcutCard = {
  accentColor: string;
  href?: Href;
  iconName: ComponentProps<typeof MaterialCommunityIcons>['name'];
  subtitle: string;
  title: string;
};

type HomeProfile = {
  displayName: string;
  totalCO2Saved: number;
  totalEcoPoints: number;
  totalScans: number;
};

const defaultHomeProfile: HomeProfile = {
  displayName: 'Eco Warrior',
  totalCO2Saved: 0,
  totalEcoPoints: 0,
  totalScans: 0,
};

const shortcutCards: ShortcutCard[] = [
  {
    accentColor: '#3B82F6',
    href: '/profile',
    iconName: 'account-outline',
    subtitle: 'View impact & stats',
    title: 'My Profile',
  },
  {
    accentColor: '#A855F7',
    href: '/explore',
    iconName: 'map-marker-outline',
    subtitle: 'Nearby locations',
    title: 'Find Centers',
  },
  {
    accentColor: '#F59E0B',
    href: '/tips',
    iconName: 'lightbulb-on-outline',
    subtitle: 'Daily guidance',
    title: 'Eco Tips',
  },
  {
    accentColor: '#14B8A6',
    href: '/categories',
    iconName: 'recycle',
    subtitle: 'Learn recycling',
    title: 'Categories',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<HomeProfile>(defaultHomeProfile);

  useEffect(() => {
    let isActive = true;

    function getFallbackName(email?: string | null, displayName?: string | null) {
      const trimmedDisplayName = displayName?.trim();

      if (trimmedDisplayName) {
        return trimmedDisplayName;
      }

      const emailPrefix = email?.split('@')[0]?.trim();
      return emailPrefix || defaultHomeProfile.displayName;
    }

    function getNumberValue(value: unknown) {
      return typeof value === 'number' && Number.isFinite(value) ? value : 0;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isActive) {
        return;
      }

      if (!user) {
        setProfile(defaultHomeProfile);
        return;
      }

      const fallbackName = getFallbackName(user.email, user.displayName);

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!isActive) {
          return;
        }

        if (userDoc.exists()) {
          const data = userDoc.data();
          const savedName = typeof data.name === 'string' ? data.name.trim() : '';

          setProfile({
            displayName: savedName || fallbackName,
            totalCO2Saved: getNumberValue(data.totalCO2Saved),
            totalEcoPoints: getNumberValue(data.totalEcoPoints),
            totalScans: getNumberValue(data.totalScans),
          });
          return;
        }
      } catch {
        // Keep the home screen usable even if profile lookup fails.
      }

      if (!isActive) {
        return;
      }

      setProfile({
        ...defaultHomeProfile,
        displayName: fallbackName,
      });
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroCopy}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.heroTitle}>{profile.displayName}</Text>
            <Text style={styles.heroSubtitle}>Ready to make a difference today?</Text>
          </View>

          <HapticPressable
            accessibilityRole="button"
            hapticType="selection"
            onPress={() => router.push('/profile')}
            style={styles.heroAvatarButton}>
            <Image
              source={AppImages.ecoloopLogoHeader}
              contentFit="contain"
              style={styles.heroAvatar}
            />
          </HapticPressable>
        </View>

        <View style={styles.pointsCard}>
          <View pointerEvents="none" style={styles.pointsCardGlowOne} />
          <View pointerEvents="none" style={styles.pointsCardGlowTwo} />
          <View pointerEvents="none" style={styles.pointsCardSheen} />

          <View style={styles.pointsCardContent}>
            <View style={styles.pointsHeader}>
              <View style={styles.pointsSummary}>
                <Text style={styles.pointsLabel}>Total Eco Points</Text>
                <Text style={styles.pointsValue}>{profile.totalEcoPoints}</Text>
              </View>
            </View>

            <View style={styles.pointsDivider} />

            <View style={styles.pointsStatsRow}>
              <View style={styles.pointsStatItem}>
                <Text style={styles.pointsStatLabel}>Items Sorted</Text>
                <Text style={styles.pointsStatValue}>{profile.totalScans}</Text>
              </View>

              <View style={styles.pointsStatItem}>
                <Text style={styles.pointsStatLabel}>CO2 Saved</Text>
                <Text style={styles.pointsStatValue}>{profile.totalCO2Saved.toFixed(1)}kg</Text>
              </View>
            </View>
          </View>
        </View>

        <HapticPressable
          accessibilityRole="button"
          hapticType="medium"
          onPress={() => router.push('/scan')}
          style={styles.scanButton}>
          <MaterialCommunityIcons
            name="camera-outline"
            size={20}
            color={Colors.brand.onPrimary}
          />
          <Text style={styles.scanButtonText}>Scan Waste Item</Text>
        </HapticPressable>

        <View style={styles.shortcutGrid}>
          {shortcutCards.map((card) => {
            const href = card.href;

            return (
              <HapticPressable
                key={card.title}
                accessibilityRole="button"
                disabled={!href}
                hapticType="selection"
                onPress={href ? () => router.push(href) : undefined}
                style={({ pressed }) => [
                  styles.shortcutCard,
                  pressed && href ? styles.shortcutCardPressed : null,
                ]}>
                <View style={[styles.shortcutIconWrap, { backgroundColor: card.accentColor }]}>
                  <MaterialCommunityIcons
                    name={card.iconName}
                    size={22}
                    color={Colors.brand.onPrimary}
                  />
                </View>

                <Text style={styles.shortcutTitle}>{card.title}</Text>
                <Text style={styles.shortcutSubtitle}>{card.subtitle}</Text>
              </HapticPressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.brand.authBackground,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: 120,
    gap: Spacing.lg,
  },
  heroSection: {
    borderRadius: 24,
    backgroundColor: '#F6FFFB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.xs,
    paddingRight: Spacing.md,
  },
  welcomeText: {
    color: '#5C7380',
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
  heroTitle: {
    color: Colors.brand.text,
    fontSize: 34,
    lineHeight: 40,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  heroSubtitle: {
    color: Colors.brand.body,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
  },
  heroAvatarButton: {
    width: 56,
    height: 56,
    borderRadius: Radii.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 4,
  },
  heroAvatar: {
    width: '100%',
    height: '100%',
  },
  pointsCard: {
    position: 'relative',
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#10B095',
    padding: Spacing.lg,
    shadowColor: Colors.brand.primaryDark,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 5,
  },
  pointsCardGlowOne: {
    position: 'absolute',
    top: -34,
    left: -42,
    width: 210,
    height: 122,
    borderRadius: 90,
    backgroundColor: '#19C79D',
    opacity: 0.8,
    transform: [{ rotate: '-8deg' }],
  },
  pointsCardGlowTwo: {
    position: 'absolute',
    right: -82,
    bottom: -66,
    width: 214,
    height: 154,
    borderRadius: 110,
    backgroundColor: '#0C9F8B',
    opacity: 0.9,
    transform: [{ rotate: '16deg' }],
  },
  pointsCardSheen: {
    position: 'absolute',
    top: -30,
    right: 54,
    width: 90,
    height: 210,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ rotate: '18deg' }],
  },
  pointsCardContent: {
    zIndex: 1,
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  pointsSummary: {
    gap: Spacing.xs,
  },
  pointsLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
  pointsValue: {
    color: Colors.brand.onPrimary,
    fontSize: 42,
    lineHeight: 44,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  pointsDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: Spacing.md,
  },
  pointsStatsRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  pointsStatItem: {
    gap: 2,
  },
  pointsStatLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
  },
  pointsStatValue: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.subtitle,
    lineHeight: LineHeights.subtitle,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  scanButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: Colors.brand.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    shadowColor: Colors.brand.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 4,
  },
  scanButtonText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.button,
    lineHeight: LineHeights.button,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  shortcutCard: {
    width: '47.5%',
    minHeight: 126,
    borderRadius: 18,
    backgroundColor: Colors.brand.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  shortcutCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  shortcutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  shortcutTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.xs,
  },
  shortcutSubtitle: {
    color: '#667387',
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
});
