import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Base colors
    background: '#F8FAFC',
    backgroundElement: '#EDF2F7',
    backgroundSelected: '#E2E8F0',
    surface: '#FFFFFF',
    surfaceSubtle: '#F1F5F9',
    card: '#FFFFFF',
    border: '#E2E8F0',
    borderSubtle: '#F1F5F9',

    // Text colors
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',

    // Primary & accents (Android Material Blue)
    primary: '#2563EB',
    primaryLight: '#3B82F6',
    primaryContainer: '#DBEAFE',
    onPrimaryContainer: '#1E40AF',

    // Status colors
    success: '#10B981',
    successContainer: '#D1FAE5',
    onSuccessContainer: '#065F46',

    warning: '#F59E0B',
    warningContainer: '#FEF3C7',
    onWarningContainer: '#92400E',

    error: '#EF4444',
    errorContainer: '#FEE2E2',
    onErrorContainer: '#991B1B',

    info: '#06B6D4',
    infoContainer: '#CFFAFE',
    onInfoContainer: '#155E75',

    // AI accent
    aiAccent: '#7C3AED',
    aiContainer: '#EDE9FE',
    onAiContainer: '#5B21B6',

    // Tab bar
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    tabBarActive: '#2563EB',
    tabBarInactive: '#64748B',
  },
  dark: {
    // Base colors
    background: '#0B0F19',
    backgroundElement: '#161F30',
    backgroundSelected: '#1E293B',
    surface: '#131B2B',
    surfaceSubtle: '#0F172A',
    card: '#162032',
    border: '#233048',
    borderSubtle: '#1A2438',

    // Text colors
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',

    // Primary & accents (Android Material Blue)
    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    primaryContainer: '#1E3A8A',
    onPrimaryContainer: '#BFDBFE',

    // Status colors
    success: '#10B981',
    successContainer: '#064E3B',
    onSuccessContainer: '#A7F3D0',

    warning: '#F59E0B',
    warningContainer: '#78350F',
    onWarningContainer: '#FDE68A',

    error: '#EF4444',
    errorContainer: '#7F1D1D',
    onErrorContainer: '#FECACA',

    info: '#06B6D4',
    infoContainer: '#164E63',
    onInfoContainer: '#A5F3FC',

    // AI accent
    aiAccent: '#A78BFA',
    aiContainer: '#4C1D95',
    onAiContainer: '#DDD6FE',

    // Tab bar
    tabBarBackground: '#101624',
    tabBarBorder: '#1E293B',
    tabBarActive: '#60A5FA',
    tabBarInactive: '#94A3B8',
  },
} as const;

export type ThemeColors = Record<keyof typeof Colors.light, string>;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
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

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 9999,
} as const;

export const Typography = {
  h1: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 17, fontWeight: '600' as const },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  labelLarge: { fontSize: 14, fontWeight: '600' as const },
  labelMedium: { fontSize: 12, fontWeight: '600' as const },
  labelSmall: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
} as const;

export const BottomTabInset = Platform.select({ ios: 64, android: 72, default: 72 });
export const MaxContentWidth = 720;
