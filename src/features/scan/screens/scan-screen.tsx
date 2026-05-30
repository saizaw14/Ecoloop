import { useEffect, useRef, useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { CameraView, type CameraType, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, type Href } from 'expo-router';
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
import {
  classifyWasteImage,
  warmUpWasteClassifier,
} from '@/features/scan/services/waste-classification-service';
import { setLatestScanResult } from '@/features/scan/store/scan-session';

export default function ScanScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
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
      } catch (error) {
        if (isMounted) {
          setClassifierStatus('error');
          setClassifierErrorMessage(
            error instanceof Error
              ? error.message
              : 'The TensorFlow.js model could not be prepared.'
          );
        }
      }
    }

    prepareClassifier();

    return () => {
      isMounted = false;
    };
  }, []);

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

      const result = await classifyWasteImage(picture.uri);
      setLatestScanResult(result);
      router.push('/scan/result' as Href);
    } catch {
      Alert.alert(
        'Capture failed',
        'We could not classify that item just now. Please try capturing the image again.'
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function handleFlipCamera() {
    setFacing((currentFacing) => (currentFacing === 'back' ? 'front' : 'back'));
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
      ? 'Model Error'
      : classifierStatus === 'ready'
        ? 'TensorFlow.js Ready'
        : 'Loading TensorFlow.js';

  function renderCameraContent() {
    if (!permission) {
      return (
        <View style={styles.permissionCard}>
          <ActivityIndicator color={Colors.brand.primaryDark} size="large" />
          <Text style={styles.permissionTitle}>Preparing camera</Text>
          <Text style={styles.permissionBody}>
            We&apos;re getting the camera ready for your waste classification flow.
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
            Allow camera access so EcoLoop can capture a waste item and run on-device
            waste classification.
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
        <CameraView ref={cameraRef} facing={facing} style={styles.camera} />

        <View pointerEvents="none" style={styles.cameraTopOverlay}>
          <View style={[styles.classifierChip, classifierChipStyle]}>
            <MaterialCommunityIcons
              color={Colors.brand.onPrimary}
              name="brain"
              size={14}
            />
            <Text style={styles.classifierChipText}>{classifierChipText}</Text>
          </View>
        </View>

        <View pointerEvents="none" style={styles.cameraBottomOverlay}>
          <Text style={styles.cameraHintTitle}>Frame your waste item clearly</Text>
          <Text style={styles.cameraHintBody}>
            Capture one item at a time for the best TensorFlow.js classification
            result.
          </Text>
          {classifierStatus === 'error' && classifierErrorMessage ? (
            <Text style={styles.cameraErrorBody}>{classifierErrorMessage}</Text>
          ) : null}
        </View>

        {isProcessing ? (
          <View style={styles.processingOverlay}>
            <ActivityIndicator color={Colors.brand.onPrimary} size="large" />
            <Text style={styles.processingTitle}>Classifying image...</Text>
            <Text style={styles.processingBody}>
              We&apos;re running the bundled TensorFlow.js model on this captured
              waste item.
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View style={styles.screen}>
        <View style={styles.headerShell}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Scan Waste Item</Text>
              <Text style={styles.headerSubtitle}>
                Capture a photo to test your on-device waste classifier in Expo Go.
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
                color={Colors.brand.onPrimary}
                name="close"
                size={22}
              />
            </HapticPressable>
          </View>
        </View>

        <View style={styles.cameraCard}>{renderCameraContent()}</View>

        <View style={styles.controlsRow}>
          <HapticPressable
            accessibilityLabel="Flip camera"
            accessibilityRole="button"
            disabled={captureDisabled}
            hapticType="selection"
            onPress={handleFlipCamera}
            style={({ pressed }) => [
              styles.secondaryControl,
              captureDisabled ? styles.controlDisabled : null,
              pressed && !captureDisabled ? styles.secondaryControlPressed : null,
            ]}>
            <MaterialCommunityIcons
              color={Colors.brand.text}
              name="camera-flip-outline"
              size={24}
            />
          </HapticPressable>

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

          <View style={styles.sideSpacer} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  screen: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  headerShell: {
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
    color: Colors.brand.onPrimary,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  cameraCard: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#131D2E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  cameraWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraTopOverlay: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.lg,
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
    backgroundColor: 'rgba(11,127,85,0.88)',
  },
  classifierChipLoading: {
    backgroundColor: 'rgba(59,130,246,0.88)',
  },
  classifierChipError: {
    backgroundColor: 'rgba(220,38,38,0.88)',
  },
  classifierChipText: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
  cameraBottomOverlay: {
    margin: Spacing.lg,
    borderRadius: 18,
    backgroundColor: 'rgba(8,14,24,0.60)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  cameraHintTitle: {
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.xs,
  },
  cameraHintBody: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: FontSizes.sm,
    lineHeight: 22,
    fontFamily: Fonts.sans,
  },
  cameraErrorBody: {
    color: '#FECACA',
    fontSize: FontSizes.caption,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    marginTop: Spacing.sm,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,10,18,0.72)',
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
    color: 'rgba(255,255,255,0.78)',
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
    color: Colors.brand.onPrimary,
    fontSize: FontSizes.subtitle,
    lineHeight: LineHeights.subtitle,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.sm,
  },
  permissionBody: {
    color: 'rgba(255,255,255,0.74)',
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
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  secondaryControl: {
    width: 58,
    height: 58,
    borderRadius: Radii.pill,
    backgroundColor: Colors.brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryControlPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  captureButton: {
    width: 82,
    height: 82,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
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
  controlDisabled: {
    opacity: 0.55,
  },
  sideSpacer: {
    width: 58,
  },
});
