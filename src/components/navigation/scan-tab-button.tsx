import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet, Text, View } from 'react-native';

import {
  Colors,
  Fonts,
  FontWeights,
  Radii,
} from '@/constants/theme';

export function ScanTabButton({
  accessibilityLabel,
  onLongPress,
  onPress,
  testID,
}: BottomTabBarButtonProps) {
  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <PlatformPressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onLongPress={onLongPress}
        onPress={onPress}
        onPressIn={() => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }}
        style={styles.pressable}
        testID={testID}>
        <View style={styles.circle}>
          <MaterialCommunityIcons
            name="camera-outline"
            size={24}
            color={Colors.brand.onPrimary}
          />
        </View>
        <Text style={styles.label}>Scan</Text>
      </PlatformPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: -20,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: Radii.pill,
    backgroundColor: Colors.brand.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.brand.surface,
    shadowColor: Colors.brand.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 5,
  },
  label: {
    marginTop: 3,
    color: Colors.brand.primaryDark,
    fontSize: 11,
    lineHeight: 13,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
});
