import { useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import { Image } from 'expo-image';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  headerVisual?: ReactNode;
}>;

export function AuthScreenShell({
  children,
  footer,
  headerVisual,
  subtitle,
  title,
}: AuthScreenShellProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  function handleDismissKeyboard() {
    Keyboard.dismiss();
  }

  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      });
    });
    const keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <Pressable
        accessible={false}
        onPress={handleDismissKeyboard}
        style={styles.contentContainer}>
        <KeyboardAvoidingView
          pointerEvents="box-none"
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            scrollEnabled={isKeyboardVisible}
            showsVerticalScrollIndicator={false}>
            <View pointerEvents="box-none" style={styles.screenStack}>
              <View pointerEvents="box-none" style={styles.mainContent}>
                <View pointerEvents="none" style={styles.headerBlock}>
                  {headerVisual ? (
                    <View style={styles.headerVisualWrap}>{headerVisual}</View>
                  ) : (
                    <View style={styles.logoWrap}>
                      <Image
                        source={AppImages.ecoloopLogo}
                        contentFit="contain"
                        style={styles.logo}
                      />
                    </View>
                  )}

                  <View style={styles.textBlock}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                  </View>
                </View>

                <View pointerEvents="box-none" style={styles.formCard}>
                  {children}
                </View>
              </View>
              {footer ? <View style={styles.footerSlot}>{footer}</View> : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Pressable>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.xl,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  screenStack: {
    flexGrow: 1,
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
  headerVisualWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
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
  },
  footerSlot: {
    marginTop: 'auto',
    paddingTop: Spacing.md,
  },
});
