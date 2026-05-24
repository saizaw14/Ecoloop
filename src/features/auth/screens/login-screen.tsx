import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { HapticPressable } from '@/components/ui/haptic-pressable';
import { AuthInput } from '@/features/auth/components/auth-input';
import { AuthScreenShell } from '@/features/auth/components/auth-screen-shell';
import { AuthSocialButton } from '@/features/auth/components/auth-social-button';
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

  function enterApp() {
    router.replace('/(tabs)');
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
            iconName="email-outline"
            keyboardType="email-address"
            placeholder="your.email@example.com"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <AuthInput iconName="lock-outline" placeholder="Enter your password" secureTextEntry />
        </View>

        <HapticPressable accessibilityRole="button" hapticType="selection" style={styles.forgotWrap}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </HapticPressable>

        <HapticPressable
          accessibilityRole="button"
          hapticType="medium"
          onPress={enterApp}
          style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Log In</Text>
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
            onPress={enterApp}
          />
          <AuthSocialButton
            iconName="apple"
            label="Continue with Apple"
            onPress={enterApp}
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
    color: Colors.brand.primary,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: Radii.lg,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.button,
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
    color: Colors.brand.primary,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
});
