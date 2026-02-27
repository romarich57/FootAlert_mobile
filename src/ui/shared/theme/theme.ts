export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryContrast: string;
  success: string;
  warning: string;
  danger: string;
  overlay: string;
  skeleton: string;
  cardBackground: string;
  cardBorder: string;
  chipBackground: string;
  chipBorder: string;
  adGradientStart: string;
  adGradientEnd: string;
};

export const lightThemeColors: ThemeColors = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceElevated: '#F3F4F6',
  border: '#E5E7EB',
  text: '#111827',
  textMuted: '#6B7280',
  primary: '#059669',
  primaryContrast: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  overlay: 'rgba(0,0,0,0.4)',
  skeleton: '#F3F4F6',
  cardBackground: '#FFFFFF',
  cardBorder: '#F3F4F6',
  chipBackground: '#F3F4F6',
  chipBorder: '#E5E7EB',
  adGradientStart: '#064E3B',
  adGradientEnd: '#065F46',
};

export const darkThemeColors: ThemeColors = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceElevated: '#334155',
  border: '#334155',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  primary: '#10B981',
  primaryContrast: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#F87171',
  overlay: 'rgba(0,0,0,0.6)',
  skeleton: '#1E293B',
  cardBackground: '#1E293B',
  cardBorder: '#334155',
  chipBackground: '#1E293B',
  chipBorder: '#334155',
  adGradientStart: '#065F46',
  adGradientEnd: '#0F172A',
};

export const MIN_TOUCH_TARGET = 44;
export const DEFAULT_HIT_SLOP = 10;
