import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { reload, updateProfile as updateAuthProfile, verifyBeforeUpdateEmail } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
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
import { useAuthSession } from '@/hooks/use-auth-session';
import { logoutUser } from '@/services/authService';
import { isValidEmailAddress } from '@/utils/is-valid-email-address';
import { resolveUserDisplayName } from '@/utils/resolve-user-display-name';

const POINTS_PER_LEVEL = 50;
const CO2_KG_PER_TREE = 0.8;
const pendingEmailChangeStorageKey = 'ecoloop:pending-email-change';

const categoryIconSoftBackgroundColors: Record<WasteCategorySlug, string> = {
  cardboard: '#FCE8D8',
  glass: '#DAF5F1',
  metal: '#E8EDF3',
  paper: '#F0E8FB',
  plastic: '#E0F5EA',
  general: '#FEE8E4',
};

type ProfileTab = 'overview' | 'settings';
type SettingsSheetKey = 'manage-account' | 'privacy';

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

function formatWholeNumber(value: number) {
  return Math.max(0, Math.floor(value)).toLocaleString();
}

function formatWeightCompact(value: number) {
  return `${Math.max(0, value).toFixed(2)}kg`;
}

function formatWeightReadable(value: number) {
  return `${Math.max(0, value).toFixed(2)} kg`;
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
  const [pendingEmailChange, setPendingEmailChange] = useState<string | null>(null);
  const [isRefreshingEmail, setIsRefreshingEmail] = useState(false);
  const [privacyPreferences, setPrivacyPreferences] = useState<PrivacyPreferences>({
    activityReminders: true,
    profileVisibleToFriends: false,
    usageInsights: true,
  });
  const { categoryScanCounts, totalCO2Saved, totalEcoPoints, totalScans } = useUserWasteStats();
  const { isReady, user } = useAuthSession();

  useEffect(() => {
    let isActive = true;

    if (!isReady) {
      return;
    }

    if (!user) {
      setProfile(defaultProfileIdentity);
      return;
    }

    const activeUserId = user.uid;
    const fallbackName = resolveUserDisplayName({
      candidates: [user.displayName],
      email: user.email,
      fallback: defaultProfileIdentity.displayName,
    });
    const fallbackEmail = user.email?.trim() || 'No email on file';

    setProfile({
      displayName: fallbackName,
      email: fallbackEmail,
      userId: user.uid,
    });

    void (async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!isActive || activeUserId !== user.uid || !userDoc.exists()) {
          return;
        }

        const data = userDoc.data();
        const savedName = typeof data.name === 'string' ? data.name.trim() : '';
        const savedEmail = typeof data.email === 'string' ? data.email.trim() : '';

        setProfile({
          displayName: resolveUserDisplayName({
            candidates: [savedName, user.displayName],
            email: user.email,
            fallback: defaultProfileIdentity.displayName,
          }),
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
    })();

    return () => {
      isActive = false;
    };
  }, [isReady, user?.displayName, user?.email, user?.uid]);

  useEffect(() => {
    setDisplayNameDraft(profile.displayName);
  }, [profile.displayName]);

  const refreshVerifiedEmail = useCallback(async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return false;
    }

    setIsRefreshingEmail(true);

    try {
      await reload(currentUser);
      const refreshedEmail = currentUser.email?.trim();

      if (!refreshedEmail || refreshedEmail === profile.email) {
        return false;
      }

      setProfile((currentProfile) => ({
        ...currentProfile,
        email: refreshedEmail,
      }));
      setPendingEmailChange(null);
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          email: refreshedEmail,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return true;
    } catch {
      return false;
    } finally {
      setIsRefreshingEmail(false);
    }
  }, [profile.email]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState !== 'active') {
        return;
      }

      void refreshVerifiedEmail();
    });

    return () => subscription.remove();
  }, [refreshVerifiedEmail]);

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
  const categoriesByPoints = scannedCategories
    .map((category) => ({
      ...category,
      pointsEarned: category.sortedCount * calculateWasteEcoPoints(category.slug, false),
    }))
    .sort(
      (leftCategory, rightCategory) =>
        rightCategory.pointsEarned - leftCategory.pointsEarned ||
        rightCategory.sortedCount - leftCategory.sortedCount ||
        leftCategory.name.localeCompare(rightCategory.name)
    );
  const isSavingAccountChanges = isSavingProfile || isPreparingEmailChange;

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

    if (sheet === 'manage-account') {
      setDisplayNameDraft(profile.displayName);
      setNewEmailDraft('');
      setConfirmEmailDraft('');
    }

    setActiveSettingsSheet(sheet);
  }

  function closeSettingsSheet() {
    if (isSavingAccountChanges) {
      return;
    }

    setActiveSettingsSheet(null);
  }

  async function handleRefreshVerifiedEmail() {
    const hasUpdatedEmail = await refreshVerifiedEmail();

    if (!hasUpdatedEmail) {
      Alert.alert(
        'Not verified yet',
        'Open the verification link in your new email first, then tap this button again.'
      );
    }
  }

  async function handlePullToRefresh() {
    await refreshVerifiedEmail();
  }

  async function saveDisplayName(trimmedName: string) {
    const currentUser = auth.currentUser;
    setIsSavingProfile(true);

    try {
      if (!currentUser) {
        Alert.alert('Sign in required', 'Please sign in to edit your profile.');
        return false;
      }

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
      return true;
    } catch {
      Alert.alert('Unable to update profile', 'Please try again in a moment.');
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  }

  function validateEmailChangeDrafts() {
    const trimmedNewEmail = newEmailDraft.trim();
    const trimmedConfirmEmail = confirmEmailDraft.trim();

    if (!trimmedNewEmail && !trimmedConfirmEmail) {
      return null;
    }

    if (!trimmedNewEmail || !trimmedConfirmEmail) {
      Alert.alert('Email required', 'Please enter and confirm your new email address.');
      return false;
    }

    if (!isValidEmailAddress(trimmedNewEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return false;
    }

    if (trimmedNewEmail !== trimmedConfirmEmail) {
      Alert.alert('Emails do not match', 'Please make sure both email fields match.');
      return false;
    }

    if (trimmedNewEmail.toLowerCase() === profile.email.trim().toLowerCase()) {
      Alert.alert('Same email address', 'Please enter a different email address.');
      return false;
    }

    return trimmedNewEmail;
  }

  async function handleSaveAccountChanges() {
    const trimmedName = displayNameDraft.trim();

    if (!trimmedName) {
      Alert.alert('Username required', 'Please enter a username.');
      return;
    }

    const nameChanged = trimmedName !== profile.displayName.trim();
    const validatedEmailChange = validateEmailChangeDrafts();

    if (validatedEmailChange === false) {
      return;
    }

    if (!nameChanged && !validatedEmailChange) {
      setActiveSettingsSheet(null);
      return;
    }

    let savedName = false;

    if (nameChanged) {
      savedName = await saveDisplayName(trimmedName);

      if (!savedName) {
        return;
      }
    }

    if (validatedEmailChange) {
      setIsPreparingEmailChange(true);

      let savedEmail = false;

      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          Alert.alert('Sign in required', 'Please sign in to change your email address.');
          return;
        }

        await verifyBeforeUpdateEmail(currentUser, validatedEmailChange);
        try {
          await AsyncStorage.setItem(pendingEmailChangeStorageKey, validatedEmailChange);
        } catch {
          // The in-memory notice still guides the user if local storage is unavailable.
        }
        setPendingEmailChange(validatedEmailChange);
        savedEmail = true;

        Alert.alert(
          'Verify your new email',
          savedName
            ? 'Your username has been updated. Open the verification link sent to your new email address; then return to EcoLoop and it will be shown here.'
            : 'Open the verification link sent to your new email address; then return to EcoLoop and it will be shown here.'
        );
      } catch (error) {
        const errorCode =
          typeof error === 'object' && error && 'code' in error
            ? String(error.code)
            : '';
        const message =
          errorCode === 'auth/requires-recent-login'
            ? 'For security, please sign out and sign in again before changing your email address.'
            : errorCode === 'auth/email-already-in-use'
              ? 'That email address is already in use by another account.'
              : errorCode === 'auth/network-request-failed'
                ? 'Please check your internet connection and try again.'
              : 'We could not update your email address. Please try again.';

        Alert.alert('Unable to update email', message);
      } finally {
        setIsPreparingEmailChange(false);
      }

      if (!savedEmail) {
        return;
      }

      setActiveSettingsSheet(null);
      return;
    }

    Alert.alert('Changes saved', 'Your account details have been updated.');
    setActiveSettingsSheet(null);
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
          refreshControl={
            <RefreshControl
              colors={[Colors.brand.primaryDark]}
              onRefresh={() => {
                void handlePullToRefresh();
              }}
              refreshing={isRefreshingEmail}
              tintColor={Colors.brand.primaryDark}
            />
          }
          showsVerticalScrollIndicator={false}>
          <View style={styles.pageContent}>
            <View style={styles.heroSection}>
              <View pointerEvents="none" style={styles.heroAccentLarge} />
              <View pointerEvents="none" style={styles.heroAccentSmall} />
              <View pointerEvents="none" style={styles.heroAccentMedium} />

              <View style={styles.heroTopRow}>
                <View style={styles.profileHeaderCopy}>
                  <View style={styles.profileStatusBadge}>
                    <View style={styles.profileStatusDot} />
                    <Text style={styles.profileStatusText}>
                      {isSignedIn ? 'EcoLoop Member' : 'Guest Profile'}
                    </Text>
                  </View>

                  <Text numberOfLines={1} style={styles.profileName}>
                    {profile.displayName}
                  </Text>
                  <Text numberOfLines={1} style={styles.profileEmail}>
                    {profile.email}
                  </Text>
                </View>

                <View style={styles.heroLevelCard}>
                  <Text style={styles.heroLevelLabel}>Level</Text>
                  <Text style={styles.heroLevelValue}>{currentLevel}</Text>
                  <Text style={styles.heroLevelHint}>Eco tier</Text>
                </View>
              </View>

              <View style={styles.heroMiniStatsRow}>
                <View style={styles.heroMiniStatCard}>
                  <View style={[styles.heroMiniStatIconWrap, { backgroundColor: 'rgba(255, 244, 204, 0.18)' }]}>
                    <MaterialCommunityIcons color="#FFD76A" name="star-four-points" size={18} />
                  </View>
                  <Text style={styles.heroMiniStatValue}>{formatWholeNumber(totalEcoPoints)}</Text>
                  <Text style={styles.heroMiniStatLabel}>Points</Text>
                </View>

                <View style={styles.heroMiniStatCard}>
                  <View style={[styles.heroMiniStatIconWrap, { backgroundColor: 'rgba(186, 245, 220, 0.18)' }]}>
                    <MaterialCommunityIcons color="#7CF7C1" name="recycle" size={18} />
                  </View>
                  <Text style={styles.heroMiniStatValue}>{formatWholeNumber(totalScans)}</Text>
                  <Text style={styles.heroMiniStatLabel}>Items Sorted</Text>
                </View>

                <View style={styles.heroMiniStatCard}>
                  <View style={[styles.heroMiniStatIconWrap, { backgroundColor: 'rgba(202, 232, 255, 0.18)' }]}>
                    <MaterialCommunityIcons color="#8FD3FF" name="earth" size={18} />
                  </View>
                  <Text style={styles.heroMiniStatValue}>{formatWeightCompact(totalCO2Saved)}</Text>
                  <Text style={styles.heroMiniStatLabel}>CO2 Saved</Text>
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

                <View style={[styles.card, styles.impactDashboardCard]}>
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
                        <Text style={styles.topCategoriesTitle}>Categories by Points</Text>
                      </View>

                      <View style={styles.topCategoriesList}>
                        {categoriesByPoints.map((category) => (
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
                  <Text style={styles.settingsSectionTitle}>Account & Privacy</Text>
                  <Text style={styles.settingsSectionBody}>
                    Update your username, email, and personal preferences in one place.
                  </Text>

                  <HapticPressable
                    accessibilityRole="button"
                    hapticType="selection"
                    onPress={() => handleOpenSettingsSheet('manage-account')}
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
                        <Text style={styles.settingsMenuLabel}>Manage Account</Text>
                        <Text style={styles.settingsMenuHint}>Edit your username and review email settings.</Text>
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
                            activeSettingsSheet === 'manage-account'
                              ? 'account-cog-outline'
                              : 'shield-outline'
                          }
                          size={20}
                        />
                      </View>

                      <View style={styles.sheetTitleCopy}>
                        <Text style={styles.sheetTitle}>
                          {activeSettingsSheet === 'manage-account'
                            ? 'Manage Account'
                            : 'Privacy & Security'}
                        </Text>
                        <Text style={styles.sheetSubtitle}>
                          {activeSettingsSheet === 'manage-account'
                            ? 'Update your username and prepare a secure email change in one place.'
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
                  {activeSettingsSheet === 'manage-account' ? (
                    <>
                      <View style={styles.sheetSectionCard}>
                        <View style={styles.sheetSectionHeader}>
                          <Text style={styles.sheetSectionTitle}>Username</Text>
                        </View>

                        <View style={styles.sheetInputGroup}>
                          <Text style={styles.sheetInputLabel}>Change Username</Text>
                          <View style={styles.sheetInputWrap}>
                            <MaterialCommunityIcons
                              color="#94A3B8"
                              name="account-outline"
                              size={18}
                            />
                            <TextInput
                              onChangeText={setDisplayNameDraft}
                              placeholder="Enter your username"
                              placeholderTextColor="#94A3B8"
                              style={styles.sheetTextInput}
                              value={displayNameDraft}
                            />
                          </View>
                        </View>
                      </View>

                      <View style={styles.sheetSectionCard}>
                        <View style={styles.sheetSectionHeader}>
                          <Text style={styles.sheetSectionTitle}>Email Address</Text>
                        </View>

                        <View style={styles.sheetInfoCard}>
                          <Text style={styles.sheetInfoLabel}>Current Email</Text>
                          <Text style={styles.sheetInfoValue}>{profile.email}</Text>
                        </View>

                        {pendingEmailChange ? (
                          <View style={styles.sheetNoticeCard}>
                            <MaterialCommunityIcons
                              color="#C67A00"
                              name="email-check-outline"
                              size={18}
                            />
                            <View style={styles.sheetNoticeCopy}>
                              <Text style={styles.sheetNoticeText}>
                                Verify {pendingEmailChange}, then refresh your email here.
                              </Text>
                              <HapticPressable
                                accessibilityRole="button"
                                disabled={isRefreshingEmail}
                                hapticType="selection"
                                onPress={() => {
                                  void handleRefreshVerifiedEmail();
                                }}
                                style={({ pressed }) => [
                                  styles.sheetTertiaryButton,
                                  pressed && !isRefreshingEmail
                                    ? styles.sheetPrimaryButtonPressed
                                    : null,
                                ]}>
                                {isRefreshingEmail ? (
                                  <ActivityIndicator color={Colors.brand.primaryDark} size="small" />
                                ) : null}
                                <Text style={styles.sheetTertiaryButtonText}>
                                  {isRefreshingEmail ? 'Refreshing...' : "I've verified — Refresh email"}
                                </Text>
                              </HapticPressable>
                            </View>
                          </View>
                        ) : null}

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
                            We will send a verification link to your new email before updating it.
                          </Text>
                        </View>
                      </View>

                      <HapticPressable
                        accessibilityRole="button"
                        disabled={isSavingAccountChanges}
                        hapticType="medium"
                        onPress={handleSaveAccountChanges}
                        style={({ pressed }) => [
                          styles.sheetPrimaryButton,
                          pressed && !isSavingAccountChanges ? styles.sheetPrimaryButtonPressed : null,
                          isSavingAccountChanges ? styles.sheetPrimaryButtonDisabled : null,
                        ]}>
                        {isSavingAccountChanges ? (
                          <ActivityIndicator color={Colors.brand.onPrimary} size="small" />
                        ) : null}
                        <Text style={styles.sheetPrimaryButtonText}>
                          {isSavingAccountChanges ? 'Saving...' : 'Save Changes'}
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
    borderRadius: 30,
    backgroundColor: '#0C7A60',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  heroAccentLarge: {
    position: 'absolute',
    top: -70,
    right: -24,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroAccentSmall: {
    position: 'absolute',
    left: -28,
    bottom: -68,
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroAccentMedium: {
    position: 'absolute',
    top: 118,
    right: 68,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  profileHeaderCopy: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 4,
  },
  profileStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: Spacing.xs,
  },
  profileStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7CF7C1',
  },
  profileStatusText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  profileName: {
    color: Colors.brand.onPrimary,
    fontSize: 30,
    lineHeight: 34,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
  profileEmail: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: FontSizes.sm,
    lineHeight: 20,
    fontFamily: Fonts.sans,
  },
  heroLevelCard: {
    minWidth: 90,
    borderRadius: 22,
    backgroundColor: 'rgba(7, 54, 43, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  heroLevelLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    textTransform: 'uppercase',
  },
  heroLevelValue: {
    color: Colors.brand.onPrimary,
    fontSize: 28,
    lineHeight: 30,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
  heroLevelHint: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
  },
  heroMiniStatsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  heroMiniStatCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 116,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  heroMiniStatIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroMiniStatLabel: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: FontSizes.caption,
    lineHeight: 18,
    fontFamily: Fonts.sans,
    textAlign: 'center',
  },
  heroMiniStatValue: {
    color: Colors.brand.onPrimary,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
    textAlign: 'center',
    marginBottom: 4,
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
  impactDashboardCard: {
    marginBottom: Spacing.xxxl,
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
    marginBottom: Spacing.xxxl,
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
    backgroundColor: 'rgba(15, 23, 42, 0.34)',
  },
  sheetHost: {
    justifyContent: 'flex-end',
  },
  sheetCard: {
    maxHeight: '88%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#F6FAF8',
    borderTopWidth: 1,
    borderColor: '#DDEAE3',
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
    width: 54,
    height: 6,
    borderRadius: Radii.pill,
    backgroundColor: '#C9D7D0',
    marginBottom: Spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2EEE7',
    padding: Spacing.md,
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
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#E6F7EF',
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
    width: 38,
    height: 38,
    borderRadius: Radii.pill,
    backgroundColor: '#EFF5F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScrollContent: {
    gap: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  sheetSectionCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2EEE7',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sheetSectionHeader: {
    gap: 4,
  },
  sheetSectionEyebrow: {
    color: Colors.brand.primary,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    textTransform: 'uppercase',
  },
  sheetSectionTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
  sheetSectionBody: {
    color: '#667387',
    fontSize: FontSizes.sm,
    lineHeight: 21,
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
    borderColor: '#D8E5DE',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F2F8F5',
    borderWidth: 1,
    borderColor: '#DFECE5',
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
    borderWidth: 1,
    borderColor: '#F5E1B2',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  sheetNoticeCopy: {
    flex: 1,
    gap: Spacing.sm,
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
  sheetSecondaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#EDF7F2',
    borderWidth: 1,
    borderColor: '#CFE7DB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
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
  sheetSecondaryButtonText: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
  sheetTertiaryButton: {
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E9E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTertiaryButtonText: {
    color: '#5E6F66',
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  privacySection: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2EEE7',
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
