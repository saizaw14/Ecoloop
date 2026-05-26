import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, FontSizes, FontWeights, LineHeights } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
  },
  defaultSemiBold: {
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontWeight: FontWeights.semibold,
  },
  title: {
    fontSize: FontSizes.display,
    fontWeight: FontWeights.bold,
    lineHeight: LineHeights.display,
  },
  subtitle: {
    fontSize: FontSizes.subtitle,
    fontWeight: FontWeights.bold,
    lineHeight: LineHeights.subtitle,
  },
  link: {
    lineHeight: LineHeights.title,
    fontSize: FontSizes.body,
    color: Colors.light.tint,
  },
});
