import { Platform } from 'react-native';

const defaultFonts = {
  sans: 'normal',
  serif: 'serif',
  rounded: 'normal',
  mono: 'monospace',
} as const;

export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',
    tint: '#0A7EA4',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0A7EA4',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#FFFFFF',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#FFFFFF',
  },
  brand: {
    surface: '#FFFFFF',
    text: '#111827',
    body: '#233041',
    muted: '#B6BCC7',
    primary: '#0AA36C',
    primaryDark: '#0B7F55',
    onPrimary: '#FFFFFF',
    dotInactive: '#D7DCE3',
  },
  accent: {
    green: '#0CB574',
    greenBright: '#09C956',
    blue: '#377CF1',
    purple: '#9E3FF8',
  },
} as const;

export const Fonts =
  Platform.select({
    ios: {
      sans: 'system-ui',
      serif: 'ui-serif',
      rounded: 'ui-rounded',
      mono: 'ui-monospace',
    },
    default: defaultFonts,
    web: {
      sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      serif: "Georgia, 'Times New Roman', serif",
      rounded:
        "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
      mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },
  }) ?? defaultFonts;

export const FontSizes = {
  caption: 12,
  sm: 14,
  body: 16,
  button: 18,
  subtitle: 20,
  bodyLarge: 21,
  title: 24,
  hero: 28,
  display: 32,
} as const;

export const LineHeights = {
  caption: 16,
  sm: 20,
  bodyTight: 22,
  body: 24,
  button: 24,
  subtitle: 28,
  bodyLarge: 32,
  title: 30,
  hero: 32,
  display: 32,
} as const;

export const FontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 28,
  xxxl: 32,
  wide: 48,
  heroTop: 84,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const IconSizes = {
  sm: 18,
  md: 22,
  lg: 24,
  xl: 28,
} as const;

export const Shadows = {
  button: {
    shadowColor: Colors.brand.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 3,
  },
} as const;

export const Theme = {
  colors: Colors,
  fonts: Fonts,
  fontSizes: FontSizes,
  lineHeights: LineHeights,
  fontWeights: FontWeights,
  spacing: Spacing,
  radii: Radii,
  iconSizes: IconSizes,
  shadows: Shadows,
} as const;
