import { type ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { HapticPressable } from '@/components/ui/haptic-pressable';
import {
  Colors,
  Fonts,
  FontSizes,
  FontWeights,
  IconSizes,
  LineHeights,
  Radii,
  Spacing,
} from '@/constants/theme';

type AuthSocialButtonProps = {
  iconName: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress: () => void;
};

export function AuthSocialButton({ iconName, label, onPress }: AuthSocialButtonProps) {
  return (
    <HapticPressable
      accessibilityRole="button"
      hapticType="selection"
      onPress={onPress}
      style={styles.button}>
      <View style={styles.iconSlot}>
        <MaterialCommunityIcons name={iconName} size={IconSizes.lg} color={Colors.brand.text} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </HapticPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: Colors.brand.inputBorder,
    borderRadius: Radii.lg,
    backgroundColor: Colors.brand.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  iconSlot: {
    width: 28,
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  label: {
    color: Colors.brand.text,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
});
