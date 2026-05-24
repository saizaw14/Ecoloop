import { type ComponentProps } from 'react';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

type HapticFeedbackType = 'light' | 'medium' | 'selection';

type HapticPressableProps = ComponentProps<typeof Pressable> & {
  hapticType?: HapticFeedbackType;
};

function triggerHapticFeedback(hapticType: HapticFeedbackType) {
  if (process.env.EXPO_OS === 'web') {
    return;
  }

  if (hapticType === 'selection') {
    Haptics.selectionAsync();
    return;
  }

  Haptics.impactAsync(
    hapticType === 'medium'
      ? Haptics.ImpactFeedbackStyle.Medium
      : Haptics.ImpactFeedbackStyle.Light
  );
}

export function HapticPressable({
  hapticType = 'light',
  onPressIn,
  ...props
}: HapticPressableProps) {
  return (
    <Pressable
      {...props}
      onPressIn={(event) => {
        triggerHapticFeedback(hapticType);
        onPressIn?.(event);
      }}
    />
  );
}
