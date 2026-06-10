import { useEffect, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { onAuthStateChanged, updateProfile as updateAuthProfile } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
type SettingsSheetKey = 'edit-profile' | 'change-email' | 'privacy';

type ProfileIdentity = {
  displayName: string;
  email: string;
  userId: string | null;
};

type PrivacyPreferences = {
  activityReminders: boolean;
  profileVisibleToFriends: boolean;
  usageInsights: boolean;
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

function isLikelyEmailAddress(value: string) {
  return /\S+@\S+\.\S+/.test(value.trim());
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState<ProfileTab>('overview');
  const [profile, setProfile] = useState<ProfileIdentity>(defaultProfileIdentity);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [activeSettingsSheet, setActiveSettingsSheet] = useState<SettingsSheetKey | null>(null);
  const [displayNameDraft, setDisplayNameDraft] = useState(defaultProfileIdentity.displayName);
  const [newEmailDraft, setNewEmailDraft] = useState('');
  const [confirmEmailDraft, setConfirmEmailDraft] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isPreparingEmailChange, setIsPreparingEmailChange] = useState(false);
  const [privacyPreferences, setPrivacyPreferences] = useState<PrivacyPreferences>({
    activityReminders: true,
    profileVisibleToFriends: false,
    usageInsights: true,
  });
  const { categoryScanCounts, totalCO2Saved, totalEcoPoints, totalScans } = useUserWasteStats();

  useEffect(() => {
    let isActive = true;
    let activeUserId: string | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      activeUserId = user?.uid ?? null;

      if (!isActive) {
        return;
      }

      if (!user) {
        setProfile(defaultProfileIdentity);
        return;
      }

      const fallbackName = getFallbackName(user.email, user.displayName);
      const fallbackEmail = user.email?.trim() || 'No email on file';

      setProfile({
        displayName: fallbackName,
        email: fallbackEmail,
        userId: user.uid,
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
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    setDisplayNameDraft(profile.displayName);
  }, [profile.displayName]);

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

  function handleOpenSettingsSheet(sheet: SettingsSheetKey) {
    if (!isSignedIn) {
      Alert.alert('Sign in required', 'Please sign in to manage your account settings.');
      return;
    }

    if (sheet === 'edit-profile') {
      setDisplayNameDraft(profile.displayName);
    }

    if (sheet === 'change-email') {
      setNewEmailDraft('');
      setConfirmEmailDraft('');
    }

    setActiveSettingsSheet(sheet);
  }

  function closeSettingsSheet() {
    if (isSavingProfile || isPreparingEmailChange) {
      return;
    }

    setActiveSettingsSheet(null);
  }

  async function handleSaveProfileChanges() {
    const currentUser = auth.currentUser;
    const trimmedName = displayNameDraft.trim();

    if (!currentUser) {
      Alert.alert('Sign in required', 'Please sign in to edit your profile.');
      return;
    }

    if (!trimmedName) {
      Alert.alert('Display name required', 'Please enter a display name.');
      return;
    }

    setIsSavingProfile(true);

    try {
      await updateAuthProfile(currentUser, {
        displayName: trimmedName,
      });

      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          email: currentUser.email?.trim() || profile.email,
          name: trimmedName,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setProfile((currentProfile) => ({
        ...currentProfile,
        displayName: trimmedName,
      }));
      setActiveSettingsSheet(null);
      Alert.alert('Profile updated', 'Your display name has been saved.');
    } catch {
      Alert.alert('Unable to update profile', 'Please try again in a moment.');
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePrepareEmailChange() {
    const trimmedNewEmail = newEmailDraft.trim();
    const trimmedConfirmEmail = confirmEmailDraft.trim();

    if (!trimmedNewEmail || !trimmedConfirmEmail) {
      Alert.alert('Email required', 'Please enter and confirm your new email address.');
      return;
    }

    if (!isLikelyEmailAddress(trimmedNewEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    if (trimmedNewEmail !== trimmedConfirmEmail) {
      Alert.alert('Emails do not match', 'Please make sure both email fields match.');
      return;
    }

    if (trimmedNewEmail.toLowerCase() === profile.email.trim().toLowerCase()) {
      Alert.alert('Same email address', 'Please enter a different email address.');
      return;
    }

    setIsPreparingEmailChange(true);

    try {
      Alert.alert(
        'Secure Email Change',
        'This design is ready, but the full email-change flow still needs re-authentication before it can safely update your account.'
      );
    } finally {
      setIsPreparingEmailChange(false);
    }
  }

  function togglePrivacyPreference(key: keyof PrivacyPreferences) {
    setPrivacyPreferences((currentPreferences) => ({
      ...currentPreferences,
      [key]: !currentPreferences[key],
    }));
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, Spacing.xl) + Spacing.xl },
          ]}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.pageContent}>
            <View style={styles.heroSection}>
              <View pointerEvents="none" style={styles.heroAccentLarge} />
              <View pointerEvents="none" style={styles.heroAccentSmall} />

              <View style={styles.profileHeaderRow}>
                <View style={styles.avatarCircle}>
                  <MaterialCommunityIcons
                    color={Colors.brand.primaryDark}
                    name="account-outline"
                    size={34}
                  />
                </View>

                <View style={styles.profileHeaderCopy}>
                  <Text style={styles.profileEyebrow}>Profile</Text>
                  <Text numberOfLines={1} style={styles.profileName}>
                    {profile.displayName}
                  </Text>
                  <Text numberOfLines={1} style={styles.profileEmail}>
                    {profile.email}
                  </Text>
                </View>
              </View>

              <View style={styles.levelRow}>
                <View style={styles.levelBadge}>
                  <MaterialCommunityIcons
                    color={Colors.brand.primaryDark}
                    name="medal-outline"
                    size={16}
                  />
                  <Text style={styles.levelBadgeText}>{`Level ${currentLevel} Eco Champion`}</Text>
                </View>

                <Text style={styles.levelSupportText}>
                  {hasActivity
                    ? `${pointsToNextLevel} points until Level ${nextLevel}`
                    : 'Start scanning items to begin your progress.'}
                </Text>
              </View>

              <View style={styles.statsRow}>
                <View style={[styles.statCard, styles.statCardWarm]}>
                  <View style={[styles.statIconWrap, { backgroundColor: '#FFF4CC' }]}>
                    <MaterialCommunityIcons color="#D8A114" name="star-four-points" size={18} />
                  </View>
                  <Text style={styles.statValue}>{formatWholeNumber(totalEcoPoints)}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>

                <View style={[styles.statCard, styles.statCardMint]}>
                  <View style={[styles.statIconWrap, { backgroundColor: '#DFF7EC' }]}>
                    <MaterialCommunityIcons color="#19966B" name="recycle" size={18} />
                  </View>
                  <Text style={styles.statValue}>{formatWholeNumber(totalScans)}</Text>
                  <Text style={styles.statLabel}>Items</Text>
                </View>

                <View style={[styles.statCard, styles.statCardSky]}>
                  <View style={[styles.statIconWrap, { backgroundColor: '#E3F1FF' }]}>
                    <MaterialCommunityIcons color="#3B82F6" name="earth" size={18} />
                  </View>
                  <Text style={styles.statValue}>{formatWeightCompact(totalCO2Saved)}</Text>
                  <Text style={styles.statLabel}>CO2 Saved</Text>
                </View>
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

            {selectedTab === 'overview' ? (
              <>
                <View style={styles.progressCard}>
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
                    <View style={styles.impactHighlightCard}>
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

                            <View style={styles.topCategoryPointsBadge}>
                              <Text style={styles.topCategoryPoints}>
                                {`${formatWholeNumber(category.pointsEarned)} pts`}
                              </Text>
                            </View>
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
                  <Text style={styles.settingsSectionTitle}>Manage Account</Text>
                  <Text style={styles.settingsSectionBody}>
                    Update your profile details, email, and privacy preferences in one place.
                  </Text>

                  <HapticPressable
                    accessibilityRole="button"
                    hapticType="selection"
                    onPress={() => handleOpenSettingsSheet('edit-profile')}
                    style={({ pressed }) => [
                      styles.settingsMenuRow,
                      pressed ? styles.actionRowPressed : null,
                    ]}>
                    <View style={styles.settingsMenuLeading}>
                      <View style={styles.settingsMenuIconWrap}>
                        <MaterialCommunityIcons
                          color={Colors.brand.primaryDark}
                          name="account-outline"
                          size={18}
                        />
                      </View>
                      <View style={styles.settingsMenuCopy}>
                        <Text style={styles.settingsMenuLabel}>Edit Profile</Text>
                        <Text style={styles.settingsMenuHint}>Change your name and profile details.</Text>
                      </View>
                    </View>
                    <View style={styles.settingsMenuArrowWrap}>
                      <MaterialCommunityIcons color={Colors.brand.primaryDark} name="chevron-right" size={18} />
                    </View>
                  </HapticPressable>

                  <View style={styles.settingsMenuSpacer} />

                  <HapticPressable
                    accessibilityRole="button"
                    hapticType="selection"
                    onPress={() => handleOpenSettingsSheet('change-email')}
                    style={({ pressed }) => [
                      styles.settingsMenuRow,
                      pressed ? styles.actionRowPressed : null,
                    ]}>
                    <View style={styles.settingsMenuLeading}>
                      <View style={styles.settingsMenuIconWrap}>
                        <MaterialCommunityIcons
                          color={Colors.brand.primaryDark}
                          name="email-outline"
                          size={18}
                        />
                      </View>
                      <View style={styles.settingsMenuCopy}>
                        <Text style={styles.settingsMenuLabel}>Change Email</Text>
                        <Text style={styles.settingsMenuHint}>Prepare a secure update for your account email.</Text>
                      </View>
                    </View>
                    <View style={styles.settingsMenuArrowWrap}>
                      <MaterialCommunityIcons color={Colors.brand.primaryDark} name="chevron-right" size={18} />
                    </View>
                  </HapticPressable>

                  <View style={styles.settingsMenuSpacer} />

                  <HapticPressable
                    accessibilityRole="button"
                    hapticType="selection"
                    onPress={() => handleOpenSettingsSheet('privacy')}
                    style={({ pressed }) => [
                      styles.settingsMenuRow,
                      pressed ? styles.actionRowPressed : null,
                    ]}>
                    <View style={styles.settingsMenuLeading}>
                      <View style={styles.settingsMenuIconWrap}>
                        <MaterialCommunityIcons
                          color={Colors.brand.primaryDark}
                          name="shield-outline"
                          size={18}
                        />
                      </View>
                      <View style={styles.settingsMenuCopy}>
                        <Text style={styles.settingsMenuLabel}>Privacy & Security</Text>
                        <Text style={styles.settingsMenuHint}>Control reminders, visibility, and app insights.</Text>
                      </View>
                    </View>
                    <View style={styles.settingsMenuArrowWrap}>
                      <MaterialCommunityIcons color={Colors.brand.primaryDark} name="chevron-right" size={18} />
                    </View>
                  </HapticPressable>
                </View>

                <HapticPressable
                  accessibilityRole="button"
                  disabled={isSigningOut}
                  hapticType="medium"
                  onPress={handleSignOutPress}
                  style={({ pressed }) => [
                    styles.signOutCard,
                    pressed ? styles.signOutButtonPressed : null,
                    isSigningOut ? styles.signOutButtonDisabled : null,
                  ]}>
                  <View style={styles.signOutIconWrap}>
                    {isSigningOut ? (
                      <ActivityIndicator color="#F04438" size="small" />
                    ) : (
                      <MaterialCommunityIcons
                        color="#F04438"
                        name="logout"
                        size={18}
                      />
                    )}
                  </View>
                  <View style={styles.signOutCopy}>
                    <Text style={styles.signOutButtonText}>
                      {isSignedIn ? 'Log Out' : 'Go to Login'}
                    </Text>
                    <Text style={styles.signOutHint}>
                      {isSignedIn ? 'You can sign back in anytime.' : 'Return to the login screen.'}
                    </Text>
                  </View>
                </HapticPressable>
              </>
            )}
          </View>
        </ScrollView>

        <Modal
          animationType="fade"
          onRequestClose={closeSettingsSheet}
          transparent
          visible={activeSettingsSheet !== null}>
          <View style={styles.sheetModalRoot}>
            <Pressable onPress={closeSettingsSheet} style={styles.sheetBackdrop} />

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.sheetHost}>
              <View
                style={[
                  styles.sheetCard,
                  { paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.sm },
                ]}>
                <View style={styles.sheetHandle} />

                <View style={styles.sheetHeader}>
                  <View style={styles.sheetHeaderCopy}>
                    <View style={styles.sheetTitleRow}>
                      <View style={styles.sheetTitleIconWrap}>
                        <MaterialCommunityIcons
                          color={Colors.brand.primaryDark}
                          name={
                            activeSettingsSheet === 'edit-profile'
                              ? 'account-edit-outline'
                              : activeSettingsSheet === 'change-email'
                                ? 'email-edit-outline'
                                : 'shield-outline'
                          }
                          size={20}
                        />
                      </View>

                      <View style={styles.sheetTitleCopy}>
                        <Text style={styles.sheetTitle}>
                          {activeSettingsSheet === 'edit-profile'
                            ? 'Edit Profile'
                            : activeSettingsSheet === 'change-email'
                              ? 'Change Email'
                              : 'Privacy & Security'}
                        </Text>
                        <Text style={styles.sheetSubtitle}>
                          {activeSettingsSheet === 'edit-profile'
                            ? 'Keep your account details up to date.'
                            : activeSettingsSheet === 'change-email'
                              ? 'Prepare a secure email update flow.'
                              : 'Control how your account feels and behaves.'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <HapticPressable
                    accessibilityRole="button"
                    hapticType="selection"
                    onPress={closeSettingsSheet}
                    style={styles.sheetCloseButton}>
                    <MaterialCommunityIcons color={Colors.brand.body} name="close" size={18} />
                  </HapticPressable>
                </View>

                <ScrollView
                  contentContainerStyle={styles.sheetScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}>
                  {activeSettingsSheet === 'edit-profile' ? (
                    <>
                      <View style={styles.sheetProfileHero}>
                        <View style={styles.sheetAvatarCircle}>
                          <MaterialCommunityIcons
                            color={Colors.brand.primaryDark}
                            name="account-outline"
                            size={26}
                          />
                        </View>

                        <View style={styles.sheetProfileCopy}>
                          <Text style={styles.sheetProfileName}>{profile.displayName}</Text>
                          <Text style={styles.sheetProfileEmail}>{profile.email}</Text>
                        </View>
                      </View>

                      <View style={styles.sheetInputGroup}>
                        <Text style={styles.sheetInputLabel}>Display Name</Text>
                        <View style={styles.sheetInputWrap}>
                          <MaterialCommunityIcons
                            color="#94A3B8"
                            name="account-outline"
                            size={18}
                          />
                          <TextInput
                            onChangeText={setDisplayNameDraft}
                            placeholder="Enter your display name"
                            placeholderTextColor="#94A3B8"
                            style={styles.sheetTextInput}
                            value={displayNameDraft}
                          />
                        </View>
                      </View>

                      <View style={styles.sheetInfoCard}>
                        <Text style={styles.sheetInfoLabel}>Current Email</Text>
                        <Text style={styles.sheetInfoValue}>{profile.email}</Text>
                        <Text style={styles.sheetInfoBody}>
                          Your email stays unchanged here. Use the email sheet when you are ready.
                        </Text>
                      </View>

                      <HapticPressable
                        accessibilityRole="button"
                        disabled={isSavingProfile}
                        hapticType="medium"
                        onPress={handleSaveProfileChanges}
                        style={({ pressed }) => [
                          styles.sheetPrimaryButton,
                          pressed && !isSavingProfile ? styles.sheetPrimaryButtonPressed : null,
                          isSavingProfile ? styles.sheetPrimaryButtonDisabled : null,
                        ]}>
                        {isSavingProfile ? (
                          <ActivityIndicator color={Colors.brand.onPrimary} size="small" />
                        ) : null}
                        <Text style={styles.sheetPrimaryButtonText}>
                          {isSavingProfile ? 'Saving...' : 'Save Changes'}
                        </Text>
                      </HapticPressable>
                    </>
                  ) : null}

                  {activeSettingsSheet === 'change-email' ? (
                    <>
                      <View style={styles.sheetInfoCard}>
                        <Text style={styles.sheetInfoLabel}>Current Email</Text>
                        <Text style={styles.sheetInfoValue}>{profile.email}</Text>
                        <Text style={styles.sheetInfoBody}>
                          Changing your email will require a secure verification step.
                        </Text>
                      </View>

                      <View style={styles.sheetInputGroup}>
                        <Text style={styles.sheetInputLabel}>New Email</Text>
                        <View style={styles.sheetInputWrap}>
                          <MaterialCommunityIcons
                            color="#94A3B8"
                            name="email-outline"
                            size={18}
                          />
                          <TextInput
                            autoCapitalize="none"
                            keyboardType="email-address"
                            onChangeText={setNewEmailDraft}
                            placeholder="new.email@example.com"
                            placeholderTextColor="#94A3B8"
                            style={styles.sheetTextInput}
                            value={newEmailDraft}
                          />
                        </View>
                      </View>

                      <View style={styles.sheetInputGroup}>
                        <Text style={styles.sheetInputLabel}>Confirm New Email</Text>
                        <View style={styles.sheetInputWrap}>
                          <MaterialCommunityIcons
                            color="#94A3B8"
                            name="check-decagram-outline"
                            size={18}
                          />
                          <TextInput
                            autoCapitalize="none"
                            keyboardType="email-address"
                            onChangeText={setConfirmEmailDraft}
                            placeholder="Repeat your new email"
                            placeholderTextColor="#94A3B8"
                            style={styles.sheetTextInput}
                            value={confirmEmailDraft}
                          />
                        </View>
                      </View>

                      <View style={styles.sheetNoticeCard}>
                        <MaterialCommunityIcons
                          color="#C67A00"
                          name="shield-check-outline"
                          size={18}
                        />
                        <Text style={styles.sheetNoticeText}>
                          For security, this flow should ask for a recent sign-in before applying a real email change.
                        </Text>
                      </View>

                      <HapticPressable
                        accessibilityRole="button"
                        disabled={isPreparingEmailChange}
                        hapticType="medium"
                        onPress={handlePrepareEmailChange}
                        style={({ pressed }) => [
                          styles.sheetPrimaryButton,
                          pressed && !isPreparingEmailChange ? styles.sheetPrimaryButtonPressed : null,
                          isPreparingEmailChange ? styles.sheetPrimaryButtonDisabled : null,
                        ]}>
                        {isPreparingEmailChange ? (
                          <ActivityIndicator color={Colors.brand.onPrimary} size="small" />
                        ) : null}
                        <Text style={styles.sheetPrimaryButtonText}>
                          {isPreparingEmailChange ? 'Preparing...' : 'Review Email Change'}
                        </Text>
                      </HapticPressable>
                    </>
                  ) : null}

                  {activeSettingsSheet === 'privacy' ? (
                    <>
                      <View style={styles.privacySection}>
                        <View style={styles.privacyRow}>
                          <View style={styles.privacyCopy}>
                            <Text style={styles.privacyLabel}>Activity Reminders</Text>
                            <Text style={styles.privacyBody}>
                              Gentle nudges to keep your recycling streak going.
                            </Text>
                          </View>
                          <Switch
                            onValueChange={() => togglePrivacyPreference('activityReminders')}
                            thumbColor="#FFFFFF"
                            trackColor={{ false: '#D7DEE6', true: '#13B27D' }}
                            value={privacyPreferences.activityReminders}
                          />
                        </View>

                        <View style={styles.settingsDivider} />

                        <View style={styles.privacyRow}>
                          <View style={styles.privacyCopy}>
                            <Text style={styles.privacyLabel}>Visible to Friends</Text>
                            <Text style={styles.privacyBody}>
                              Share your profile activity more openly in future social features.
                            </Text>
                          </View>
                          <Switch
                            onValueChange={() => togglePrivacyPreference('profileVisibleToFriends')}
                            thumbColor="#FFFFFF"
                            trackColor={{ false: '#D7DEE6', true: '#13B27D' }}
                            value={privacyPreferences.profileVisibleToFriends}
                          />
                        </View>

                        <View style={styles.settingsDivider} />

                        <View style={styles.privacyRow}>
                          <View style={styles.privacyCopy}>
                            <Text style={styles.privacyLabel}>Usage Insights</Text>
                            <Text style={styles.privacyBody}>
                              Help improve EcoLoop with anonymous experience insights.
                            </Text>
                          </View>
                          <Switch
                            onValueChange={() => togglePrivacyPreference('usageInsights')}
                            thumbColor="#FFFFFF"
                            trackColor={{ false: '#D7DEE6', true: '#13B27D' }}
                            value={privacyPreferences.usageInsights}
                          />
                        </View>
                      </View>

                      <View style={styles.sheetInfoCard}>
                        <Text style={styles.sheetInfoLabel}>Account Security</Text>
                        <Text style={styles.sheetInfoValue}>Protected by Firebase Authentication</Text>
                        <Text style={styles.sheetInfoBody}>
                          Your sign-in session and account credentials are handled through the app authentication layer.
                        </Text>
                      </View>

                      <HapticPressable
                        accessibilityRole="button"
                        hapticType="medium"
                        onPress={closeSettingsSheet}
                        style={({ pressed }) => [
                          styles.sheetPrimaryButton,
                          pressed ? styles.sheetPrimaryButtonPressed : null,
                        ]}>
                        <Text style={styles.sheetPrimaryButtonText}>Done</Text>
                      </HapticPressable>
                    </>
                  ) : null}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6FAF8',
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  pageContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  heroSection: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#0F8A68',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  heroAccentLarge: {
    position: 'absolute',
    top: -54,
    right: -42,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroAccentSmall: {
    position: 'absolute',
    left: -24,
    bottom: -54,
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  profileHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  profileEyebrow: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.subtitle,
    lineHeight: LineHeights.subtitle,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  profileEmail: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
  levelRow: {
    gap: Spacing.sm,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  levelBadgeText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  levelSupportText: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: FontSizes.sm,
    lineHeight: 20,
    fontFamily: Fonts.sans,
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    minHeight: 96,
  },
  statCardWarm: {
    backgroundColor: 'rgba(255, 245, 204, 0.18)',
  },
  statCardMint: {
    backgroundColor: 'rgba(223, 247, 236, 0.14)',
  },
  statCardSky: {
    backgroundColor: 'rgba(227, 241, 255, 0.14)',
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
    fontSize: 20,
    lineHeight: 24,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    textAlign: 'center',
  },
  segmentedControl: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1ECE6',
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
  },
  segmentButtonPressed: {
    opacity: 0.88,
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
  card: {
    borderRadius: 22,
    backgroundColor: Colors.brand.surface,
    borderWidth: 1,
    borderColor: '#E2EEE8',
    padding: Spacing.lg,
  },
  progressCard: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E9E0',
    padding: Spacing.lg,
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
    borderRadius: 18,
    backgroundColor: '#EFF8F2',
    borderWidth: 1,
    borderColor: '#D8ECE0',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
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
    height: 12,
    borderRadius: Radii.pill,
    backgroundColor: '#E7F0EA',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.pill,
    backgroundColor: '#12A36F',
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
    borderRadius: Radii.pill,
    backgroundColor: '#EFF8F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  impactHighlightCard: {
    borderRadius: 20,
    backgroundColor: '#F5FBF8',
    borderWidth: 1,
    borderColor: '#E1EEE7',
    padding: Spacing.md,
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
    marginTop: Spacing.lg,
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
    marginTop: Spacing.lg,
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
    gap: Spacing.sm,
  },
  topCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: 18,
    backgroundColor: '#F7FBF8',
    borderWidth: 1,
    borderColor: '#E5F0EA',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
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
  topCategoryPointsBadge: {
    borderRadius: Radii.pill,
    backgroundColor: '#EAF7F1',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  topCategoryPoints: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  settingsSectionTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.xs,
  },
  settingsSectionBody: {
    color: '#667387',
    fontSize: FontSizes.sm,
    lineHeight: 21,
    fontFamily: Fonts.sans,
    marginBottom: Spacing.md,
  },
  settingsMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 76,
    borderRadius: 18,
    backgroundColor: '#F7FBF8',
    borderWidth: 1,
    borderColor: '#E6F0EA',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  settingsMenuLeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    flex: 1,
  },
  settingsMenuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#E8F7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsMenuCopy: {
    flex: 1,
    gap: 2,
  },
  actionRowPressed: {
    opacity: 0.9,
  },
  settingsMenuLabel: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  settingsMenuHint: {
    color: '#7A8795',
    fontSize: FontSizes.caption,
    lineHeight: 18,
    fontFamily: Fonts.sans,
  },
  settingsMenuArrowWrap: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    backgroundColor: '#EEF5F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsMenuSpacer: {
    height: Spacing.sm,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: '#EEF2F5',
    marginVertical: Spacing.sm,
  },
  signOutCard: {
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: '#FFF7F7',
    borderWidth: 1,
    borderColor: '#F2D8DC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  signOutButtonPressed: {
    opacity: 0.94,
  },
  signOutButtonDisabled: {
    opacity: 0.8,
  },
  signOutIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFE9EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutCopy: {
    flex: 1,
    gap: 2,
  },
  signOutButtonText: {
    color: '#F04438',
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
  signOutHint: {
    color: '#A35C65',
    fontSize: FontSizes.caption,
    lineHeight: 18,
    fontFamily: Fonts.sans,
  },
  sheetModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.26)',
  },
  sheetHost: {
    justifyContent: 'flex-end',
  },
  sheetCard: {
    maxHeight: '86%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Colors.brand.surface,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: Radii.pill,
    backgroundColor: '#D7DEE6',
    marginBottom: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sheetHeaderCopy: {
    flex: 1,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  sheetTitleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#DFF7EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitleCopy: {
    flex: 1,
    gap: 2,
  },
  sheetTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.subtitle,
    lineHeight: LineHeights.subtitle,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  sheetSubtitle: {
    color: '#667387',
    fontSize: FontSizes.sm,
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
  sheetCloseButton: {
    width: 34,
    height: 34,
    borderRadius: Radii.pill,
    backgroundColor: '#F4F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScrollContent: {
    gap: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  sheetProfileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: 20,
    backgroundColor: '#F5FBF8',
    padding: Spacing.md,
  },
  sheetAvatarCircle: {
    width: 56,
    height: 56,
    borderRadius: Radii.pill,
    backgroundColor: '#E2F8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetProfileCopy: {
    flex: 1,
    gap: 2,
  },
  sheetProfileName: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  sheetProfileEmail: {
    color: '#667387',
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
  sheetInputGroup: {
    gap: Spacing.sm,
  },
  sheetInputLabel: {
    color: Colors.brand.text,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  sheetInputWrap: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D7DEE6',
    backgroundColor: '#FAFCFD',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  sheetTextInput: {
    flex: 1,
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    paddingVertical: 0,
  },
  sheetInfoCard: {
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  sheetInfoLabel: {
    color: '#7B8798',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
  },
  sheetInfoValue: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  sheetInfoBody: {
    color: '#667387',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  sheetNoticeCard: {
    borderRadius: 18,
    backgroundColor: '#FFF8E8',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  sheetNoticeText: {
    flex: 1,
    color: '#B25A00',
    fontSize: FontSizes.sm,
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
  sheetPrimaryButton: {
    minHeight: 54,
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
  sheetPrimaryButtonPressed: {
    opacity: 0.94,
  },
  sheetPrimaryButtonDisabled: {
    opacity: 0.8,
  },
  sheetPrimaryButtonText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
  privacySection: {
    borderRadius: 20,
    backgroundColor: Colors.brand.surface,
    borderWidth: 1,
    borderColor: '#EEF2F5',
    padding: Spacing.lg,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  privacyCopy: {
    flex: 1,
    gap: 2,
    paddingRight: Spacing.md,
  },
  privacyLabel: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  privacyBody: {
    color: '#667387',
    fontSize: FontSizes.sm,
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
});
