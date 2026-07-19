import { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppImages } from '@/assets/images';
import { HapticPressable } from '@/components/ui/haptic-pressable';
import { AuthInput } from '@/features/auth/components/auth-input';
import { ForgotPasswordSheet } from '@/features/auth/components/forgot-password-sheet';
import {
  getLoginAuthError,
  getPasswordResetAuthError,
} from '@/features/auth/utils/get-auth-error-message';
import { useAuthSession } from '@/hooks/use-auth-session';
import { loginUser, sendResetPasswordEmail } from '@/services/authService';
import { isValidEmailAddress } from '@/utils/is-valid-email-address';
import {
  Colors,
  Fonts,
  FontSizes,
  FontWeights,
  LineHeights,
  Radii,
  Shadows,
  Spacing,
} from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { isReady, user } = useAuthSession();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordSheetVisible, setIsForgotPasswordSheetVisible] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState<string | undefined>();
  const [sentResetEmail, setSentResetEmail] = useState<string | undefined>();
  const [hasSentResetEmail, setHasSentResetEmail] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const isBusy = isLoading || isResettingPassword;

  if (isReady && user) {
    return <Redirect href="/(tabs)" />;
  }

  function handleDismissKeyboard() {
    Keyboard.dismiss();
  }

  function handleEmailChange(value: string) {
    setEmail(value);
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
  }

  function getEmailValidationError(value: string) {
    const normalizedEmail = value.trim();

    if (!normalizedEmail) {
      return 'Please enter your email address.';
    }

    if (!isValidEmailAddress(normalizedEmail)) {
      return 'Please enter a valid email address.';
    }

    return undefined;
  }

  function openForgotPasswordSheet() {
    setForgotPasswordEmail(email.trim());
    setForgotPasswordError(undefined);
    setSentResetEmail(undefined);
    setHasSentResetEmail(false);
    setIsForgotPasswordSheetVisible(true);
  }

  function closeForgotPasswordSheet() {
    if (isResettingPassword) {
      return;
    }

    setIsForgotPasswordSheetVisible(false);
    setForgotPasswordError(undefined);
    setSentResetEmail(undefined);
    setHasSentResetEmail(false);
  }

  function handleForgotPasswordEmailChange(value: string) {
    setForgotPasswordEmail(value);

    if (forgotPasswordError) {
      setForgotPasswordError(undefined);
    }
  }

  async function handleLogin() {
    const nextErrors: typeof errors = {};
    const normalizedEmail = email.trim();
    const emailError = getEmailValidationError(normalizedEmail);

    if (emailError) {
      nextErrors.email = emailError;
    }

    if (!password) {
      nextErrors.password = 'Please enter your password.';
    } else if (password.length < 6) {
      nextErrors.password = 'Your password must be at least 6 characters.';
    }

    if (nextErrors.email || nextErrors.password) {
      setErrors(nextErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await loginUser(normalizedEmail, password);
      router.replace('/(tabs)');
    } catch (error) {
      const authError = getLoginAuthError(error);
      setErrors({ [authError.field]: authError.message });
    } finally {
      setIsLoading(false);
    }
  }

  async function submitForgotPasswordReset(emailValue: string) {
    const normalizedEmail = emailValue.trim();
    const emailError = getEmailValidationError(normalizedEmail);

    if (emailError) {
      setForgotPasswordError(emailError);
      setHasSentResetEmail(false);
      return;
    }

    setIsResettingPassword(true);
    setForgotPasswordError(undefined);

    try {
      await sendResetPasswordEmail(normalizedEmail);
      setSentResetEmail(normalizedEmail);
      setHasSentResetEmail(true);
      setEmail(normalizedEmail);
    } catch (error) {
      const authError = getPasswordResetAuthError(error);
      setForgotPasswordError(authError.message);
      setHasSentResetEmail(false);
    } finally {
      setIsResettingPassword(false);
    }
  }

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />
        <Pressable
          accessible={false}
          onPress={handleDismissKeyboard}
          style={styles.screen}>
          <KeyboardAvoidingView
            pointerEvents="box-none"
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.heroSection}>
              <Image
                source={AppImages.loginRecyclingHero}
                contentFit="cover"
                style={styles.heroImage}
              />
            </View>

            <View
              style={[
                styles.bottomSheet,
                {
                  paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.sm,
                },
              ]}>
              <View style={styles.headerBlock}>
                <Text style={styles.title}>Welcome Back!</Text>
                <Text style={styles.subtitle}>Continue your eco-friendly journey</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Email</Text>
                  <AuthInput
                    editable={!isBusy}
                    errorMessage={errors.email}
                    iconName="email-outline"
                    keyboardType="email-address"
                    onChangeText={handleEmailChange}
                    placeholder="your.email@example.com"
                    value={email}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Password</Text>
                  <AuthInput
                    editable={!isBusy}
                    errorMessage={errors.password}
                    iconName="lock-outline"
                    onChangeText={handlePasswordChange}
                    placeholder="Enter your password"
                    secureTextEntry
                    value={password}
                  />
                </View>

                <HapticPressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  hapticType="selection"
                  onPress={openForgotPasswordSheet}
                  style={styles.forgotWrap}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </HapticPressable>

                <HapticPressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  hapticType="medium"
                  onPress={handleLogin}
                  style={[styles.primaryButton, isBusy && styles.disabledButton]}>
                  <View style={styles.buttonContent}>
                    {isLoading ? (
                      <ActivityIndicator color={Colors.brand.onPrimary} size="small" />
                    ) : null}
                    <Text style={styles.primaryButtonText}>
                      {isLoading ? 'Logging In...' : 'Log In'}
                    </Text>
                  </View>
                </HapticPressable>
              </View>

              <View style={styles.footerTextRow}>
                <Text style={styles.footerText}>Don&apos;t have an account? </Text>
                <HapticPressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  hapticType="selection"
                  onPress={() => router.push('/signup')}>
                  <Text style={styles.footerLink}>Sign Up</Text>
                </HapticPressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </SafeAreaView>

      <ForgotPasswordSheet
        email={forgotPasswordEmail}
        errorMessage={forgotPasswordError}
        isSubmitting={isResettingPassword}
        isSuccess={hasSentResetEmail}
        sentEmail={sentResetEmail}
        visible={isForgotPasswordSheetVisible}
        onChangeEmail={handleForgotPasswordEmailChange}
        onClose={closeForgotPasswordSheet}
        onResend={() => {
          void submitForgotPasswordReset(sentResetEmail ?? forgotPasswordEmail);
        }}
        onSubmit={() => {
          void submitForgotPasswordReset(forgotPasswordEmail);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E8F5EE',
  },
  screen: {
    flex: 1,
    backgroundColor: '#E8F5EE',
  },
  keyboardContainer: {
    flex: 1,
  },
  heroSection: {
    flex: 1,
    minHeight: 280,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Colors.brand.surface,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: '#E3EEE8',
  },
  headerBlock: {
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  form: {
    gap: Spacing.md,
  },
  title: {
    color: Colors.brand.text,
    fontSize: FontSizes.hero,
    lineHeight: LineHeights.hero,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
  subtitle: {
    color: '#607284',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  label: {
    color: Colors.brand.text,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: -2,
  },
  forgotText: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: Radii.lg,
    backgroundColor: Colors.brand.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.button,
  },
  disabledButton: {
    opacity: 0.8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryButtonText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.button,
    lineHeight: LineHeights.button,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
  footerTextRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    color: Colors.brand.body,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
  footerLink: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
});
