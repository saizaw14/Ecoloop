import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { HapticPressable } from '@/components/ui/haptic-pressable';
import { AuthInput } from '@/features/auth/components/auth-input';
import { AuthScreenShell } from '@/features/auth/components/auth-screen-shell';
import { getSignupAuthError } from '@/features/auth/utils/get-auth-error-message';
import { isGmailAddress } from '@/features/auth/utils/is-gmail-address';
import { registerUser } from '@/services/authService';
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

export default function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  function handleNameChange(value: string) {
    setFullName(value);
  }

  function handleEmailChange(value: string) {
    setEmail(value);
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
  }

  function handleConfirmPasswordChange(value: string) {
    setConfirmPassword(value);
  }

  function handleToggleTerms() {
    setHasAcceptedTerms((value) => {
      const nextValue = !value;

      if (nextValue) {
        setErrors((currentErrors) => {
          if (!currentErrors.terms) {
            return currentErrors;
          }

          return {
            ...currentErrors,
            terms: undefined,
          };
        });
      }

      return nextValue;
    });
  }

  async function createAccount() {
    const nextErrors: typeof errors = {};
    const normalizedEmail = email.trim();

    if (!fullName.trim()) {
      nextErrors.name = 'Please enter your full name.';
    }

    if (!normalizedEmail) {
      nextErrors.email = 'Please enter your email address.';
    } else if (!isGmailAddress(normalizedEmail)) {
      nextErrors.email = 'Please enter a valid Gmail address ending with @gmail.com.';
    }

    if (!password) {
      nextErrors.password = 'Please create a password.';
    } else if (password.length < 6) {
      nextErrors.password = 'Your password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please re-enter your password.';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Please make sure both passwords are the same.';
    }

    if (!hasAcceptedTerms) {
      nextErrors.terms = 'Please agree to the Terms & Conditions and Privacy Policy.';
    }

    if (
      nextErrors.name ||
      nextErrors.email ||
      nextErrors.password ||
      nextErrors.confirmPassword ||
      nextErrors.terms
    ) {
      setErrors(nextErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await registerUser({
        name: fullName,
        email: normalizedEmail,
        password,
      });
      router.replace('/login');
    } catch (error) {
      const authError = getSignupAuthError(error);
      if (authError.field === 'password') {
        setErrors({ password: authError.message });
        return;
      }

      setErrors({ email: authError.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthScreenShell
      subtitle="Start your sustainable journey today"
      title="Join EcoLoop"
      footer={
        <View style={styles.footerTextRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <HapticPressable
            accessibilityRole="button"
            disabled={isLoading}
            hapticType="selection"
            onPress={() => router.push('/login')}>
            <Text style={styles.footerLink}>Log In</Text>
          </HapticPressable>
        </View>
      }>
      <View style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full Name</Text>
          <AuthInput
            autoCapitalize="words"
            editable={!isLoading}
            errorMessage={errors.name}
            iconName="account-outline"
            onChangeText={handleNameChange}
            placeholder="John Doe"
            value={fullName}
          />
        </View>

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
            placeholder="Create a password"
            secureTextEntry
            value={password}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <AuthInput
            editable={!isLoading}
            errorMessage={errors.confirmPassword}
            iconName="lock-outline"
            onChangeText={handleConfirmPasswordChange}
            placeholder="Re-enter your password"
            secureTextEntry
            value={confirmPassword}
          />
        </View>

        <HapticPressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: hasAcceptedTerms }}
          disabled={isLoading}
          hapticType="selection"
          onPress={handleToggleTerms}
          style={styles.agreementSection}>
          <View style={styles.agreementRow}>
            <View
              style={[
                styles.checkbox,
                hasAcceptedTerms && styles.checkboxChecked,
                errors.terms && styles.checkboxError,
              ]}>
              {hasAcceptedTerms ? (
                <MaterialCommunityIcons
                  name="check"
                  size={10}
                  color={Colors.brand.onPrimary}
                />
              ) : null}
            </View>
            <Text style={styles.agreementText}>
              I agree to the <Text style={styles.agreementLink}>Terms & Conditions</Text> and{' '}
              <Text style={styles.agreementLink}>Privacy Policy</Text>
            </Text>
          </View>

          {errors.terms ? <Text style={styles.errorText}>{errors.terms}</Text> : null}
        </HapticPressable>

        <HapticPressable
          accessibilityRole="button"
          disabled={isLoading}
          hapticType="medium"
          onPress={createAccount}
          style={[styles.primaryButton, isLoading && styles.disabledButton]}>
          <View style={styles.buttonContent}>
            {isLoading ? (
              <ActivityIndicator color={Colors.brand.onPrimary} size="small" />
            ) : null}
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </View>
        </HapticPressable>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.sm,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  label: {
    color: Colors.brand.text,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  agreementSection: {
    gap: Spacing.xs,
    marginVertical: 0,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.brand.text,
    backgroundColor: Colors.brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.brand.primaryDark,
    borderColor: Colors.brand.primaryDark,
  },
  checkboxError: {
    borderColor: Colors.brand.error,
  },
  agreementText: {
    flex: 1,
    color: Colors.brand.body,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
  agreementLink: {
    color: Colors.brand.primaryDark,
    fontWeight: FontWeights.semibold,
  },
  errorText: {
    color: Colors.brand.error,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
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
