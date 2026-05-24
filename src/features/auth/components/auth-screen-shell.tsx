import type { PropsWithChildren, ReactNode } from 'react';
import { Image } from 'expo-image';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

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
import { AppImages } from '@/assets/images';

type AuthScreenShellProps = PropsWithChildren<{
  subtitle: string;
  title: string;
  footer?: ReactNode;
}>;

export function AuthScreenShell({
  children,
  footer,
  subtitle,
  title,
}: AuthScreenShellProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
        <View style={styles.contentContainer}>
          <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
              style={styles.keyboardContainer}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.mainContent}>
                <View style={styles.headerBlock}>
                  <View style={styles.logoWrap}>
                    <Image
                      source={AppImages.ecoloopLogo}
                      contentFit="contain"
                      style={styles.logo}
                    />
                  </View>

                  <View style={styles.textBlock}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                  </View>
                </View>

                <View style={styles.formCard}>{children}</View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
          {footer ? <View style={styles.footerSlot}>{footer}</View> : null}
        </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.brand.authBackground,
  },
  keyboardContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    justifyContent: 'space-between',
  },
  mainContent: {
    gap: Spacing.xl,
  },
  headerBlock: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  logoWrap: {
    alignItems: 'center',
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: Radii.pill,
    ...Shadows.button,
  },
  textBlock: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    color: Colors.brand.text,
    textAlign: 'center',
    fontSize: FontSizes.title,
    lineHeight: LineHeights.title,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  subtitle: {
    color: Colors.brand.body,
    textAlign: 'center',
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
  },
  formCard: {
    borderRadius: Radii.lg,
    flexShrink: 1,
  },
  footerSlot: {
    paddingTop: Spacing.md,
  },
});
