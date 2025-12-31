/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#121213',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

// Game-specific colors
export const GameColors = {
  // Standard colors
  correct: 'rgba(83, 141, 78, 0.9)',
  correctBorder: 'rgba(83, 141, 78, 1)',
  present: 'rgba(181, 159, 59, 0.9)',
  presentBorder: 'rgba(181, 159, 59, 1)',
  absent: 'rgba(58, 58, 60, 0.9)',
  absentBorder: 'rgba(58, 58, 60, 1)',

  // Colorblind-friendly colors
  correctColorblind: 'rgba(56, 152, 236, 0.9)',
  correctColorblindBorder: 'rgba(56, 152, 236, 1)',
  presentColorblind: 'rgba(245, 158, 66, 0.9)',
  presentColorblindBorder: 'rgba(245, 158, 66, 1)',

  // UI colors
  tileEmpty: 'rgba(58, 58, 60, 0.5)',
  tileEmptyBorder: 'rgba(255, 255, 255, 0.2)',
  tileFilled: 'rgba(58, 58, 60, 0.8)',
  tileFilledBorder: 'rgba(255, 255, 255, 0.4)',

  // Keyboard colors
  keyDefault: 'rgba(255, 255, 255, 0.1)',
  keyDefaultBorder: 'rgba(255, 255, 255, 0.2)',

  // Background
  background: '#121213',
  surface: 'rgba(30, 30, 35, 0.95)',

  // Text
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.6)',

  // Accent
  accent: '#4ecdff',
  accentGradientStart: '#53c8ff',
  accentGradientEnd: '#0f8aff',
};

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
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
