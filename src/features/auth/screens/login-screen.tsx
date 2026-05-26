import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { HapticPressable } from '@/components/ui/haptic-pressable';
import { AuthInput } from '@/features/auth/components/auth-input';
import { AuthScreenShell } from '@/features/auth/components/auth-screen-shell';
import { AuthSocialButton } from '@/features/auth/components/auth-social-button';
import { getLoginAuthError } from '@/features/auth/utils/get-auth-error-message';
import { isGmailAddress } from '@/features/auth/utils/is-gmail-address';
import { loginUser } from '@/services/authService';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  function showComingSoonAlert(featureName: string) {
    Alert.alert(`${featureName} Unavailable`, `Please use email and password for now.`);
  }

  function handleEmailChange(value: string) {
    setEmail(value);
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
  }

  async function handleLogin() {
    const nextErrors: typeof errors = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      nextErrors.email = 'Please enter your email address.';
    } else if (!isGmailAddress(normalizedEmail)) {
      nextErrors.email = 'Please enter a valid Gmail address ending with @gmail.com.';
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

  return (
    <AuthScreenShell
      subtitle="Continue your eco-friendly journey"
      title="Welcome Back!"
      footer={
        <View style={styles.footerTextRow}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <HapticPressable
            accessibilityRole="button"
            disabled={isLoading}
            hapticType="selection"
            onPress={() => router.push('/signup')}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </HapticPressable>
        </View>
      }>
      <View style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <AuthInput
            editable={!isLoading}
            errorMessage={errors.email}
            iconName="email-outline"
            keyboardType="email-address"
            onChangeText={handleEmailChange}
            placeholder="your.email@gmail.com"
            value={email}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <AuthInput
            editable={!isLoading}
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
          disabled={isLoading}
          hapticType="selection"
          onPress={() => showComingSoonAlert('Forgot Password')}
          style={styles.forgotWrap}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </HapticPressable>

        <HapticPressable
          accessibilityRole="button"
          disabled={isLoading}
          hapticType="medium"
          onPress={handleLogin}
          style={[styles.primaryButton, isLoading && styles.disabledButton]}>
          <View style={styles.buttonContent}>
            {isLoading ? (
              <ActivityIndicator color={Colors.brand.onPrimary} size="small" />
            ) : null}
            <Text style={styles.primaryButtonText}>{isLoading ? 'Logging In...' : 'Log In'}</Text>
          </View>
        </HapticPressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialStack}>
          <AuthSocialButton
            iconName="google"
            label="Continue with Google"
            onPress={() => showComingSoonAlert('Google Sign-In')}
          />
        </View>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.md,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.brand.inputBorder,
  },
  dividerText: {
    color: Colors.brand.body,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
  socialStack: {
    gap: Spacing.sm,
  },
  footerTextRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
