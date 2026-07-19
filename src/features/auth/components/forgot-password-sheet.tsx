import { useCallback, useEffect, useMemo, useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticPressable } from '@/components/ui/haptic-pressable';
import {
  Colors,
  Fonts,
  FontSizes,
  FontWeights,
  IconSizes,
  LineHeights,
  Radii,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { AuthInput } from '@/features/auth/components/auth-input';

type ForgotPasswordSheetProps = {
  email: string;
  errorMessage?: string;
  isSubmitting: boolean;
  isSuccess: boolean;
  sentEmail?: string;
  visible: boolean;
  onChangeEmail: (value: string) => void;
  onClose: () => void;
  onResend: () => void;
  onSubmit: () => void;
};

export function ForgotPasswordSheet({
  email,
  errorMessage,
  isSubmitting,
  isSuccess,
  sentEmail,
  visible,
  onChangeEmail,
  onClose,
  onResend,
  onSubmit,
}: ForgotPasswordSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const displayedEmail = sentEmail?.trim() || email.trim();
  const hiddenOffset = Math.max(420, windowHeight * 0.7);
  const translateY = useRef(new Animated.Value(hiddenOffset)).current;
  const isClosingRef = useRef(false);
  const backdropOpacity = translateY.interpolate({
    inputRange: [0, hiddenOffset],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const animateSheetOpen = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      damping: 22,
      mass: 0.9,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const animateSheetReset = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      damping: 24,
      mass: 0.9,
      stiffness: 240,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const requestClose = useCallback(() => {
    if (isSubmitting || isClosingRef.current) {
      return;
    }

    isClosingRef.current = true;

    Animated.timing(translateY, {
      toValue: hiddenOffset,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        isClosingRef.current = false;
        return;
      }

      onClose();
    });
  }, [hiddenOffset, isSubmitting, onClose, translateY]);

  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (isSubmitting) {
            return false;
          }

          return gestureState.dy > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        },
        onPanResponderMove: (_, gestureState) => {
          const nextTranslate = gestureState.dy > 0 ? gestureState.dy : gestureState.dy * 0.16;
          translateY.setValue(nextTranslate);
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldClose = gestureState.dy > 120 || gestureState.vy > 1.05;

          if (shouldClose) {
            requestClose();
            return;
          }

          animateSheetReset();
        },
        onPanResponderTerminate: () => {
          animateSheetReset();
        },
      }),
    [animateSheetReset, isSubmitting, requestClose, translateY]
  );

  useEffect(() => {
    if (!visible) {
      translateY.setValue(hiddenOffset);
      isClosingRef.current = false;
      return;
    }

    isClosingRef.current = false;
    translateY.setValue(hiddenOffset);
    animateSheetOpen();
  }, [animateSheetOpen, hiddenOffset, translateY, visible]);

  return (
    <Modal
      onRequestClose={requestClose}
      statusBarTranslucent
      transparent
      visible={visible}>
      <View style={styles.modalRoot}>
        <Animated.View pointerEvents="box-none" style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={requestClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetHost}>
          <Animated.View
            style={[
              styles.sheetCard,
              {
                paddingBottom: Math.max(insets.bottom, Spacing.lg),
                transform: [{ translateY }],
              },
            ]}>
            <View {...dragResponder.panHandlers} style={styles.dragHandleArea}>
              <View style={styles.sheetHandle} />
            </View>

            {isSuccess ? (
              <View style={styles.successContent}>
                <View style={styles.successArtWrap}>
                  <View style={styles.successHalo}>
                    <View style={styles.successCircle}>
                      <MaterialCommunityIcons
                        color={Colors.brand.primaryDark}
                        name="check"
                        size={34}
                      />
                    </View>

                    <View style={styles.successBadge}>
                      <MaterialCommunityIcons
                        color="#5876D8"
                        name="email-fast-outline"
                        size={14}
                      />
                    </View>
                  </View>
                </View>

                <Text style={styles.successTitle}>Check your email</Text>
                <Text style={styles.successBody}>
                  If an account exists for this email, we&apos;ve sent a password reset link to
                </Text>

                <View style={styles.emailChip}>
                  <Text numberOfLines={1} style={styles.emailChipText}>
                    {displayedEmail}
                  </Text>
                </View>

                <Text style={styles.successHint}>
                  The link will expire in 30 minutes. If you don&apos;t receive it, check your
                  spam folder.
                </Text>

                <HapticPressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  hapticType="selection"
                  onPress={onResend}
                  style={styles.resendLink}>
                  <Text style={styles.resendLinkText}>
                    {isSubmitting ? 'Resending...' : "Didn't receive it? Resend email"}
                  </Text>
                </HapticPressable>

                <HapticPressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  hapticType="medium"
                  onPress={requestClose}
                  style={styles.backButton}>
                  <MaterialCommunityIcons
                    color={Colors.brand.primaryDark}
                    name="arrow-left"
                    size={IconSizes.sm}
                  />
                  <Text style={styles.backButtonText}>Back to Log In</Text>
                </HapticPressable>
              </View>
            ) : (
              <View style={styles.formContent}>
                <HapticPressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  hapticType="selection"
                  onPress={requestClose}
                  style={styles.topBackLink}>
                  <MaterialCommunityIcons
                    color={Colors.brand.primaryDark}
                    name="arrow-left"
                    size={18}
                  />
                  <Text style={styles.topBackLinkText}>Back to Log In</Text>
                </HapticPressable>

                <Text style={styles.description}>
                  No worries! Enter the email address linked to your account and we&apos;ll send
                  you a reset link.
                </Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <AuthInput
                    editable={!isSubmitting}
                    errorMessage={errorMessage}
                    iconName="email-outline"
                    keyboardType="email-address"
                    onChangeText={onChangeEmail}
                    placeholder="your.email@example.com"
                    value={email}
                  />
                </View>

                <HapticPressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  hapticType="medium"
                  onPress={onSubmit}
                  style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}>
                  <MaterialCommunityIcons
                    color={Colors.brand.onPrimary}
                    name="send-outline"
                    size={IconSizes.sm}
                  />
                  <Text style={styles.primaryButtonText}>
                    {isSubmitting ? 'Sending reset link...' : 'Send Reset Link'}
                  </Text>
                </HapticPressable>

                <View style={styles.noticeCard}>
                  <MaterialCommunityIcons
                    color="#D58A10"
                    name="lightbulb-on-outline"
                    size={IconSizes.sm}
                  />
                  <Text style={styles.noticeText}>
                    Check your spam folder if you don&apos;t see the email within a few minutes.
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.34)',
  },
  sheetHost: {
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#F8FBF9',
    borderTopWidth: 1,
    borderColor: '#DCE9E2',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 54,
    height: 6,
    borderRadius: Radii.pill,
    backgroundColor: '#CDD9D3',
  },
  dragHandleArea: {
    paddingBottom: Spacing.lg,
  },
  formContent: {
    gap: Spacing.lg,
  },
  topBackLink: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  topBackLinkText: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  description: {
    color: '#667387',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    color: '#596879',
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: Colors.brand.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.button,
  },
  buttonDisabled: {
    opacity: 0.82,
  },
  primaryButtonText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
  noticeCard: {
    borderRadius: 18,
    backgroundColor: '#FFF8E8',
    borderWidth: 1,
    borderColor: '#F3DFB0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  noticeText: {
    flex: 1,
    color: '#B56612',
    fontSize: FontSizes.sm,
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
  successContent: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  successArtWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  successHalo: {
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: '#E4F7EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F8FFFB',
    borderWidth: 2,
    borderColor: Colors.brand.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBadge: {
    position: 'absolute',
    top: 12,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF2C7',
    borderWidth: 1,
    borderColor: '#F2E2A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.subtitle,
    lineHeight: LineHeights.subtitle,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  successBody: {
    color: '#6C788C',
    fontSize: FontSizes.sm,
    lineHeight: 21,
    fontFamily: Fonts.sans,
    textAlign: 'center',
  },
  emailChip: {
    maxWidth: '100%',
    borderRadius: Radii.pill,
    backgroundColor: '#ECF9F2',
    borderWidth: 1,
    borderColor: '#BEE9D0',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  emailChipText: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  successHint: {
    color: '#7A8795',
    fontSize: FontSizes.sm,
    lineHeight: 21,
    fontFamily: Fonts.sans,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  resendLink: {
    marginTop: Spacing.sm,
  },
  resendLinkText: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
  backButton: {
    minHeight: 52,
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BDE9D3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  backButtonText: {
    color: Colors.brand.primaryDark,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.semibold,
  },
});
