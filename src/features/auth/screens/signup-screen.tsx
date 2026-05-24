import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { HapticPressable } from '@/components/ui/haptic-pressable';
import { AuthInput } from '@/features/auth/components/auth-input';
import { AuthScreenShell } from '@/features/auth/components/auth-screen-shell';
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
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  function createAccount() {
    router.replace('/(tabs)');
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
            iconName="account-outline"
            placeholder="John Doe"
          />
        </View>

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
          <AuthInput iconName="lock-outline" placeholder="Create a password" secureTextEntry />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <AuthInput
            iconName="lock-outline"
            placeholder="Re-enter your password"
            secureTextEntry
          />
        </View>

        <HapticPressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: hasAcceptedTerms }}
          hapticType="selection"
          onPress={() => setHasAcceptedTerms((value) => !value)}
          style={styles.agreementRow}>
          <View style={[styles.checkbox, hasAcceptedTerms && styles.checkboxChecked]}>
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
        </HapticPressable>

        <HapticPressable
          accessibilityRole="button"
          hapticType="medium"
          onPress={createAccount}
          style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </HapticPressable>
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
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
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
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  agreementText: {
    flex: 1,
    color: Colors.brand.body,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
  agreementLink: {
    color: Colors.brand.primary,
    fontWeight: FontWeights.semibold,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: Radii.lg,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    ...Shadows.button,
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
    color: Colors.brand.primary,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
});
