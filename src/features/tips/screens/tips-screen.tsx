import { useEffect, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, type Href } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  ecoTipOfTheDay,
  getEcoTipById,
  type EcoTip,
} from '@/features/tips/data/eco-tips-content';
import { auth } from '@/firebase/firebaseConfig';
import {
  saveTipForUser,
  subscribeToSavedTipIds,
  unsaveTipForUser,
} from '@/services/tipsService';

export default function TipsScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [savedTipIds, setSavedTipIds] = useState<number[]>([]);
  const [pendingTipId, setPendingTipId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);

      if (!user) {
        setSavedTipIds([]);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    return subscribeToSavedTipIds(userId, setSavedTipIds);
  }, [userId]);

  const savedTips = savedTipIds
    .slice()
    .reverse()
    .map((tipId) => getEcoTipById(tipId))
    .filter((tip): tip is EcoTip => Boolean(tip));

  async function handleToggleSaved(tip: EcoTip) {
    if (!userId || pendingTipId === tip.id) {
      if (!userId) {
        setSaveError('Sign in to save eco tips to your account.');
      }
      return;
    }

    const isSaved = savedTipIds.includes(tip.id);

    setPendingTipId(tip.id);
    setSaveError(null);

    try {
      if (isSaved) {
        await unsaveTipForUser(userId, tip.id);
      } else {
        await saveTipForUser(userId, tip.id);
      }
    } catch {
      setSaveError('We could not update your saved tips right now. Please try again.');
    } finally {
      setPendingTipId(null);
    }
  }

  const isFeaturedSaved = savedTipIds.includes(ecoTipOfTheDay.id);
  const isFeaturedPending = pendingTipId === ecoTipOfTheDay.id;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <View style={styles.headerShell}>
          <HapticPressable
            accessibilityRole="button"
            hapticType="selection"
            onPress={() => router.replace('/(tabs)' as Href)}
            style={styles.backButton}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={20}
              color={Colors.brand.body}
            />
            <Text style={styles.backButtonText}>Back</Text>
          </HapticPressable>

          <View style={styles.titleRow}>
            <View style={styles.titleIconWrap}>
              <MaterialCommunityIcons
                color={Colors.brand.onPrimary}
                name="lightbulb-on-outline"
                size={22}
              />
            </View>

            <View style={styles.titleCopy}>
              <Text style={styles.title}>Eco Tips</Text>
              <Text style={styles.subtitle}>Learn and improve daily</Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.bodyShell}>
            <View style={styles.tipOfDayCard}>
              <View pointerEvents="none" style={styles.tipOfDayGlowOne} />
              <View pointerEvents="none" style={styles.tipOfDayGlowTwo} />

              <View style={styles.tipOfDayHeader}>
                <MaterialCommunityIcons
                  color={Colors.brand.onPrimary}
                  name="lightbulb-on-outline"
                  size={18}
                />
                <Text style={styles.tipOfDayHeaderText}>Tip of the Day</Text>
              </View>

              <View style={styles.tipOfDayInnerCard}>
                <View style={styles.tipOfDayTopRow}>
                  <View
                    style={[
                      styles.tipIconBadge,
                      { backgroundColor: ecoTipOfTheDay.iconBackgroundColor },
                    ]}>
                    <MaterialCommunityIcons
                      color={ecoTipOfTheDay.iconColor}
                      name={ecoTipOfTheDay.iconName}
                      size={22}
                    />
                  </View>

                  <HapticPressable
                    accessibilityLabel={
                      isFeaturedSaved ? 'Remove tip from saved tips' : 'Save tip to saved tips'
                    }
                    accessibilityRole="button"
                    hapticType="selection"
                    onPress={() => handleToggleSaved(ecoTipOfTheDay)}
                    style={styles.saveButton}>
                    {isFeaturedPending ? (
                      <ActivityIndicator color={Colors.brand.onPrimary} size="small" />
                    ) : (
                      <MaterialCommunityIcons
                        color={Colors.brand.onPrimary}
                        name={isFeaturedSaved ? 'bookmark' : 'bookmark-outline'}
                        size={20}
                      />
                    )}
                  </HapticPressable>
                </View>

                <Text style={styles.tipTitle}>{ecoTipOfTheDay.title}</Text>
                <Text style={styles.tipDescription}>{ecoTipOfTheDay.description}</Text>

                <View style={styles.tipCategoryChip}>
                  <Text style={styles.tipCategoryText}>{ecoTipOfTheDay.category}</Text>
                </View>
              </View>
            </View>

            <View style={styles.savedTipsCard}>
              <View style={styles.savedTipsHeader}>
                <View style={styles.savedTipsTitleRow}>
                  <MaterialCommunityIcons
                    color={Colors.brand.primaryDark}
                    name="bookmark-outline"
                    size={18}
                  />
                  <Text style={styles.savedTipsTitle}>Saved Tips</Text>
                </View>

                <Text style={styles.savedTipsCount}>{savedTips.length}</Text>
              </View>

              {savedTips.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyStateIcon}>
                    <MaterialCommunityIcons
                      color="#FDBA74"
                      name="bookmark-outline"
                      size={22}
                    />
                  </View>
                  <Text style={styles.emptyStateTitle}>No saved tips yet</Text>
                  <Text style={styles.emptyStateBody}>
                    Save the tip of the day to keep your favorite guidance here.
                  </Text>
                </View>
              ) : (
                <View style={styles.savedTipsList}>
                  {savedTips.map((tip) => {
                    const isPending = pendingTipId === tip.id;

                    return (
                      <View key={tip.id} style={styles.savedTipRow}>
                        <View
                          style={[
                            styles.savedTipIconWrap,
                            { backgroundColor: tip.iconBackgroundColor },
                          ]}>
                          <MaterialCommunityIcons
                            color={tip.iconColor}
                            name={tip.iconName}
                            size={20}
                          />
                        </View>

                        <View style={styles.savedTipCopy}>
                          <Text style={styles.savedTipTitle}>{tip.title}</Text>
                          <Text style={styles.savedTipDescription}>{tip.description}</Text>
                          <View style={styles.savedTipChip}>
                            <Text style={styles.savedTipChipText}>{tip.category}</Text>
                          </View>
                        </View>

                        <HapticPressable
                          accessibilityLabel={`Remove ${tip.title} from saved tips`}
                          accessibilityRole="button"
                          hapticType="selection"
                          onPress={() => handleToggleSaved(tip)}
                          style={styles.savedTipAction}>
                          {isPending ? (
                            <ActivityIndicator color="#F59E0B" size="small" />
                          ) : (
                            <MaterialCommunityIcons
                              color="#F59E0B"
                              name="bookmark"
                              size={20}
                            />
                          )}
                        </HapticPressable>
                      </View>
                    );
                  })}
                </View>
              )}

              {saveError ? <Text style={styles.saveErrorText}>{saveError}</Text> : null}
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
  scrollContent: {
    paddingBottom: 132,
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
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
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
  bodyShell: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  tipOfDayCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#FF9800',
    padding: Spacing.lg,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 6,
  },
  tipOfDayGlowOne: {
    position: 'absolute',
    top: -42,
    left: 112,
    width: 170,
    height: 170,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  tipOfDayGlowTwo: {
    position: 'absolute',
    right: -54,
    bottom: -62,
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tipOfDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tipOfDayHeaderText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  tipOfDayInnerCard: {
    borderRadius: 18,
    backgroundColor: '#FFAD33',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  tipOfDayTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tipIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    width: 34,
    height: 34,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.subtitle,
    lineHeight: LineHeights.subtitle,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  tipDescription: {
    color: 'rgba(255,255,255,0.96)',
    fontSize: FontSizes.sm,
    lineHeight: 24,
    fontFamily: Fonts.sans,
  },
  tipCategoryChip: {
    alignSelf: 'flex-start',
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  tipCategoryText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  savedTipsCard: {
    borderRadius: 22,
    backgroundColor: Colors.brand.surface,
    padding: Spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    gap: Spacing.md,
  },
  savedTipsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savedTipsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  savedTipsTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  savedTipsCount: {
    color: '#98A2B3',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  emptyState: {
    borderRadius: 18,
    backgroundColor: '#FFFBF5',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyStateIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF0DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  emptyStateBody: {
    color: '#6C788C',
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    textAlign: 'center',
  },
  savedTipsList: {
    gap: Spacing.md,
  },
  savedTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  savedTipIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  savedTipCopy: {
    flex: 1,
    gap: 6,
    paddingRight: Spacing.xs,
  },
  savedTipTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  savedTipDescription: {
    color: '#667387',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  savedTipChip: {
    alignSelf: 'flex-start',
    borderRadius: Radii.pill,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  savedTipChipText: {
    color: '#8A95A5',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
  },
  savedTipAction: {
    width: 30,
    height: 30,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  saveErrorText: {
    color: Colors.brand.error,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
  },
});
