import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

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

type AuthInputProps = {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  iconName: ComponentProps<typeof MaterialCommunityIcons>['name'];
  keyboardType?: ComponentProps<typeof TextInput>['keyboardType'];
  placeholder: string;
  secureTextEntry?: boolean;
};

export function AuthInput({
  autoCapitalize = 'none',
  iconName,
  keyboardType = 'default',
  placeholder,
  secureTextEntry = false,
}: AuthInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const shouldHideText = secureTextEntry && !isPasswordVisible;

  return (
    <View style={styles.field}>
      <MaterialCommunityIcons
        name={iconName}
        size={IconSizes.lg}
        color={Colors.brand.inputIcon}
        style={styles.leadingIcon}
      />

      <TextInput
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={Colors.brand.inputPlaceholder}
        secureTextEntry={shouldHideText}
        style={styles.input}
      />

      {secureTextEntry ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => setIsPasswordVisible((value) => !value)}
          style={styles.trailingButton}>
          <MaterialCommunityIcons
            name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
            size={IconSizes.lg}
            color={Colors.brand.inputIcon}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: Colors.brand.inputBorder,
    borderRadius: Radii.lg,
    backgroundColor: Colors.brand.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
  },
  leadingIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    color: Colors.brand.body,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.regular,
  },
  trailingButton: {
    paddingLeft: Spacing.xs,
  },
});
