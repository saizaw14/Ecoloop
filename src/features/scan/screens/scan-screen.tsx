import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { SCAN_PREVIEW_IMAGE_HEIGHT } from '@/features/scan/constants/scan-preview';
import {
  classifyWasteImage,
  warmUpWasteClassifier,
} from '@/features/scan/services/waste-classification-service';
import { setLatestScanResult } from '@/features/scan/store/scan-session';

export default function ScanScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView | null>(null);
  const focusLineOffset = useRef(new Animated.Value(0)).current;
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [classifierStatus, setClassifierStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [classifierErrorMessage, setClassifierErrorMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    async function prepareClassifier() {
      try {
        setClassifierStatus('loading');
        setClassifierErrorMessage(null);
        await warmUpWasteClassifier();

        if (isMounted) {
          setClassifierStatus('ready');
        }
      } catch {
        if (isMounted) {
          setClassifierStatus('error');
          setClassifierErrorMessage(
            'We could not get the scanner ready right now. Please try again in a moment.'
          );
        }
      }
    }

    prepareClassifier();

    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setCapturedImageUri(null);
      setIsProcessing(false);

      focusLineOffset.stopAnimation();
      focusLineOffset.setValue(0);

      if (!permission?.granted) {
        return undefined;
      }

      const guideLineAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(focusLineOffset, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(focusLineOffset, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      guideLineAnimation.start();

      return () => {
        guideLineAnimation.stop();
        focusLineOffset.stopAnimation();
        focusLineOffset.setValue(0);
      };
    }, [focusLineOffset, permission?.granted])
  );

  async function handleRequestPermission() {
    await requestPermission();
  }

  async function handleCapture() {
    if (!cameraRef.current || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.7,
      });

      if (!picture?.uri) {
        throw new Error('No image captured');
      }

      setCapturedImageUri(picture.uri);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      const result = await classifyWasteImage(picture.uri);
      setLatestScanResult(result);
      router.push('/scan/result' as Href);
    } catch {
      setCapturedImageUri(null);
      Alert.alert(
        'Capture failed',
        'We could not classify that item just now. Please try capturing the image again.'
      );
    } finally {
      setIsProcessing(false);
    }
  }

  const captureDisabled =
    !permission?.granted || isProcessing || classifierStatus === 'error';
  const classifierChipStyle =
    classifierStatus === 'error'
      ? styles.classifierChipError
      : classifierStatus === 'ready'
        ? styles.classifierChipReady
        : styles.classifierChipLoading;
  const classifierChipText =
    classifierStatus === 'error'
      ? 'Scanner unavailable'
      : classifierStatus === 'ready'
        ? 'Ready to scan'
        : 'Preparing scanner';
  const showLiveCameraLayout = permission?.granted ?? false;
  const focusLineTranslateY = focusLineOffset.interpolate({
    inputRange: [0, 1],
    outputRange: [-64, 64],
  });

  function renderCameraContent() {
    if (!permission) {
      return (
        <View style={styles.permissionCard}>
          <ActivityIndicator color={Colors.brand.primaryDark} size="large" />
          <Text style={styles.permissionTitle}>Preparing camera</Text>
          <Text style={styles.permissionBody}>
            We&apos;re getting everything ready so you can scan your item.
          </Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionCard}>
          <View style={styles.permissionIconWrap}>
            <MaterialCommunityIcons
              color={Colors.brand.primaryDark}
              name="camera-outline"
              size={30}
            />
          </View>

          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            Allow camera access so EcoLoop can scan your item and suggest the right
            waste category.
          </Text>

          <HapticPressable
            accessibilityRole="button"
            hapticType="medium"
            onPress={handleRequestPermission}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.primaryButtonPressed : null,
            ]}>
            <Text style={styles.primaryButtonText}>Allow Camera Access</Text>
          </HapticPressable>
        </View>
      );
    }

    return (
      <View style={styles.cameraWrap}>
        {capturedImageUri ? (
          <Image
            source={{ uri: capturedImageUri }}
            contentFit="cover"
            style={styles.camera}
          />
        ) : (
          <CameraView ref={cameraRef} facing="back" style={styles.camera} />
        )}

        {!capturedImageUri ? (
          <View pointerEvents="none" style={styles.focusGuide}>
            <View style={styles.focusGuideBorder}>
              <View style={[styles.focusCorner, styles.focusCornerTopLeft]} />
              <View style={[styles.focusCorner, styles.focusCornerTopRight]} />
              <View style={[styles.focusCorner, styles.focusCornerBottomLeft]} />
              <View style={[styles.focusCorner, styles.focusCornerBottomRight]} />
              <Animated.View
                style={[
                  styles.focusLine,
                  { transform: [{ translateY: focusLineTranslateY }] },
                ]}
              />
            </View>
          </View>
        ) : null}

        {isProcessing ? (
          <View style={styles.processingOverlay}>
            <ActivityIndicator color={Colors.brand.onPrimary} size="large" />
            <Text style={styles.processingTitle}>Checking your item...</Text>
            <Text style={styles.processingBody}>
              We&apos;re identifying your item and matching it to the most likely
              waste category.
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <View style={styles.headerShell}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Scan Waste Item</Text>
              <Text style={styles.headerSubtitle}>
                Take one clear photo and EcoLoop will help you sort it into the
                right category.
              </Text>
            </View>

            <HapticPressable
              accessibilityLabel="Close scan"
              accessibilityRole="button"
              hapticType="selection"
              onPress={() => router.replace('/(tabs)' as Href)}
              style={({ pressed }) => [
                styles.closeButton,
                pressed ? styles.closeButtonPressed : null,
              ]}>
              <MaterialCommunityIcons
                color={Colors.brand.text}
                name="close"
                size={22}
              />
            </HapticPressable>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.previewPanel}>
            {showLiveCameraLayout ? (
              <View style={styles.previewHeader}>
                <View style={[styles.classifierChip, classifierChipStyle]}>
                  <MaterialCommunityIcons
                    color={Colors.brand.onPrimary}
                    name="brain"
                    size={14}
                  />
                  <Text style={styles.classifierChipText}>{classifierChipText}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.cameraCard}>{renderCameraContent()}</View>

            {showLiveCameraLayout ? (
              <View style={styles.previewFooter}>
                <View style={styles.previewCopy}>
                  <Text style={styles.previewTitle}>Center your item inside the guide</Text>
                  <Text style={styles.previewBody}>
                    Capture one item at a time in good lighting for the most accurate
                    result.
                  </Text>
                </View>
                {classifierStatus === 'error' && classifierErrorMessage ? (
                  <Text style={styles.cameraErrorBody}>{classifierErrorMessage}</Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {showLiveCameraLayout ? (
            <View style={styles.captureDock}>
              <HapticPressable
                accessibilityLabel="Capture waste item"
                accessibilityRole="button"
                disabled={captureDisabled}
                hapticType="medium"
                onPress={handleCapture}
                style={({ pressed }) => [
                  styles.captureButton,
                  captureDisabled ? styles.controlDisabled : null,
                  pressed && !captureDisabled ? styles.captureButtonPressed : null,
                ]}>
                <View style={styles.captureButtonInner}>
                  {isProcessing ? (
                    <ActivityIndicator color={Colors.brand.onPrimary} size="small" />
                  ) : (
                    <MaterialCommunityIcons
                      color={Colors.brand.onPrimary}
                      name="camera-outline"
                      size={30}
                    />
                  )}
                </View>
              </HapticPressable>

              <Text style={styles.captureButtonLabel}>
                {isProcessing ? 'Scanning your item...' : 'Tap to capture'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.brand.authBackground,
  },
  screen: {
    flex: 1,
    backgroundColor: Colors.brand.authBackground,
  },
  headerShell: {
    backgroundColor: Colors.brand.authBackground,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  headerTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.title,
    lineHeight: LineHeights.title,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  headerSubtitle: {
    color: '#5F6E80',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    maxWidth: 280,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: Radii.pill,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
    justifyContent: 'space-between',
  },
  previewPanel: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(221,233,226,0.9)',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 4,
    justifyContent: 'space-between',
  },
  previewHeader: {
    minHeight: 52,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  previewTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  previewBody: {
    color: '#5F6E80',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  cameraCard: {
    flex: 1,
    minHeight: 220,
    maxHeight: SCAN_PREVIEW_IMAGE_HEIGHT,
    marginVertical: Spacing.sm,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#DDE5EA',
  },
  cameraWrap: {
    flex: 1,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  focusGuide: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  focusGuideBorder: {
    width: '82%',
    height: '82%',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  focusCorner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#C9FFEA',
  },
  focusCornerTopLeft: {
    top: 12,
    left: 12,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  focusCornerTopRight: {
    top: 12,
    right: 12,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  focusCornerBottomLeft: {
    bottom: 12,
    left: 12,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  focusCornerBottomRight: {
    right: 12,
    bottom: 12,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  focusLine: {
    position: 'absolute',
    top: '50%',
    left: '23%',
    right: '23%',
    height: 4,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(111,255,195,0.88)',
  },
  classifierChip: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  classifierChipReady: {
    backgroundColor: 'rgba(11,127,85,0.92)',
  },
  classifierChipLoading: {
    backgroundColor: 'rgba(59,130,246,0.92)',
  },
  classifierChipError: {
    backgroundColor: 'rgba(220,38,38,0.92)',
  },
  classifierChipText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  previewCopy: {
    gap: 2,
  },
  previewFooter: {
    minHeight: 72,
    justifyContent: 'center',
  },
  cameraErrorBody: {
    color: Colors.brand.error,
    fontSize: FontSizes.caption,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    marginTop: Spacing.xs,
  },
  captureDock: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  captureButton: {
    width: 82,
    height: 82,
    borderRadius: Radii.pill,
    backgroundColor: '#D9F3E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: Radii.pill,
    backgroundColor: Colors.brand.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  captureButtonLabel: {
    color: Colors.brand.text,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  controlDisabled: {
    opacity: 0.55,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,10,18,0.64)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  processingTitle: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.subtitle,
    lineHeight: LineHeights.subtitle,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  processingBody: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    textAlign: 'center',
  },
  permissionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  permissionIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#E7F8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  permissionTitle: {
    color: Colors.brand.text,
    fontSize: FontSizes.subtitle,
    lineHeight: LineHeights.subtitle,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.sm,
  },
  permissionBody: {
    color: '#667387',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: Colors.brand.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  primaryButtonPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
});
