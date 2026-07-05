import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
  editable?: boolean;
  errorMessage?: string;
  iconName: ComponentProps<typeof MaterialCommunityIcons>['name'];
  keyboardType?: ComponentProps<typeof TextInput>['keyboardType'];
  onChangeText?: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value?: string;
};

export function AuthInput({
  autoCapitalize = 'none',
  editable = true,
  errorMessage,
  iconName,
  keyboardType = 'default',
  onChangeText,
  placeholder,
  secureTextEntry = false,
  value,
}: AuthInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const shouldHideText = secureTextEntry && !isPasswordVisible;
  const hasError = Boolean(errorMessage);

  return (
    <View style={styles.container}>
      <View style={[styles.field, hasError && styles.fieldError]}>
        <MaterialCommunityIcons
          name={iconName}
          size={IconSizes.lg}
          color={Colors.brand.inputIcon}
          style={styles.leadingIcon}
        />

        <TextInput
          autoCapitalize={autoCapitalize}
          clearTextOnFocus={false}
          editable={editable}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.brand.inputPlaceholder}
          selectTextOnFocus={false}
          secureTextEntry={shouldHideText}
          style={styles.input}
          value={value}
        />

        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            disabled={!editable}
            hitSlop={10}
            onPress={() => setIsPasswordVisible((value) => !value)}
            style={styles.trailingButton}>
            <MaterialCommunityIcons
              name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
              size={IconSizes.lg}
              color={Colors.brand.inputIcon}
            />
          </Pressable>
        ) : null}
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
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
  fieldError: {
    borderColor: Colors.brand.error,
  },
  leadingIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: '100%',
    color: Colors.brand.body,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.regular,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  trailingButton: {
    paddingLeft: Spacing.xs,
  },
  errorText: {
    color: Colors.brand.error,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
});
