/**
 * Design tokens ported from the "Vitality Core" Stitch design system
 * (https://stitch.withgoogle.com/projects/6487088117847135496).
 * The prototype only specifies a light palette; the dark palette below is
 * derived from its Material 3 inverse/fixed tokens.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#191c1d',
    background: '#f8f9fa',
    backgroundElement: '#edeeef',
    backgroundSelected: '#e7e8e9',
    textSecondary: '#404754',

    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#f3f4f5',
    surfaceContainerHighest: '#e1e3e4',
    outline: '#717785',
    outlineVariant: '#c0c6d6',

    primary: '#005baf',
    onPrimary: '#ffffff',
    primaryContainer: '#0074db',
    onPrimaryContainer: '#fefcff',

    secondary: '#006a61',
    onSecondary: '#ffffff',
    secondaryContainer: '#69f9e6',
    secondaryFixedDim: '#46dcca',

    tertiary: '#a33800',
    onTertiary: '#ffffff',
    tertiaryFixedDim: '#ffb59a',

    error: '#ba1a1a',
    onError: '#ffffff',
    errorContainer: '#ffdad6',
    onErrorContainer: '#93000a',
  },
  dark: {
    text: '#f0f1f2',
    background: '#2e3132',
    backgroundElement: '#35383a',
    backgroundSelected: '#3f4244',
    textSecondary: '#c0c6d6',

    surfaceContainerLowest: '#242627',
    surfaceContainerLow: '#2a2d2e',
    surfaceContainerHighest: '#4a4d4f',
    outline: '#8b9198',
    outlineVariant: '#40464c',

    primary: '#a8c8ff',
    onPrimary: '#001b3c',
    primaryContainer: '#004689',
    onPrimaryContainer: '#d5e3ff',

    secondary: '#46dcca',
    onSecondary: '#005048',
    secondaryContainer: '#005048',
    secondaryFixedDim: '#46dcca',

    tertiary: '#ffb59a',
    onTertiary: '#802a00',
    tertiaryFixedDim: '#ffb59a',

    error: '#ffb4ab',
    onError: '#690005',
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Be Vietnam Pro weights, keyed the same way as `@expo-google-fonts/be-vietnam-pro` exports. */
export const BeVietnamPro = {
  regular: 'BeVietnamPro_400Regular',
  medium: 'BeVietnamPro_500Medium',
  semiBold: 'BeVietnamPro_600SemiBold',
  bold: 'BeVietnamPro_700Bold',
  extraBold: 'BeVietnamPro_800ExtraBold',
} as const;

/** Typography scale from the Stitch design system, in Be Vietnam Pro. */
export const Typography = {
  displayLg: {
    fontFamily: BeVietnamPro.extraBold,
    fontWeight: '800',
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.72,
  },
  headlineLg: {
    fontFamily: BeVietnamPro.bold,
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 32,
  },
  headlineLgMobile: {
    fontFamily: BeVietnamPro.bold,
    fontWeight: '700',
    fontSize: 22,
    lineHeight: 28,
  },
  headlineMd: {
    fontFamily: BeVietnamPro.bold,
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 28,
  },
  bodyLg: {
    fontFamily: BeVietnamPro.medium,
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMd: {
    fontFamily: BeVietnamPro.regular,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
  },
  labelLg: {
    fontFamily: BeVietnamPro.semiBold,
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16,
  },
  labelMd: {
    fontFamily: BeVietnamPro.medium,
    fontWeight: '500',
    fontSize: 11,
    lineHeight: 14,
  },
} as const;

/** Border radius scale from the Stitch design system. */
export const Radii = {
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/** Elevation presets from the Stitch design system ("Surface 1" / "Surface 2"). */
export const Shadows = {
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
    ...Platform.select({ web: { boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)' } }),
  },
  float: {
    shadowColor: '#0088ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
    ...Platform.select({ web: { boxShadow: '0px 8px 24px rgba(0, 136, 255, 0.2)' } }),
  },
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 64 }) ?? 0;
export const MaxContentWidth = 800;
