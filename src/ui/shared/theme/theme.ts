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
  background: '#F6F8F6',
  surface: '#FFFFFF',
  surfaceElevated: '#F2F4F5',
  border: '#E5E7EB',
  text: '#0A0A0A',
  textMuted: '#6B7280',
  primary: '#14E15C',
  primaryContrast: '#04100A',
  success: '#1AAE57',
  warning: '#D97706',
  danger: '#DC2626',
  overlay: 'rgba(0,0,0,0.35)',
  skeleton: '#E5E7EB',
  cardBackground: '#FFFFFF',
  cardBorder: '#E5E7EB',
  chipBackground: '#EEF2F0',
  chipBorder: '#D1D5DB',
  adGradientStart: '#0C6D36',
  adGradientEnd: '#0F291A',
};

export const darkThemeColors: ThemeColors = {
  background: '#020303',
  surface: '#060907',
  surfaceElevated: '#0A0D0B',
  border: '#1A1F1B',
  text: '#F4FFF8',
  textMuted: '#9BA8A0',
  primary: '#15F86A',
  primaryContrast: '#001008',
  success: '#15F86A',
  warning: '#F59E0B',
  danger: '#F87171',
  overlay: 'rgba(0,0,0,0.72)',
  skeleton: '#0E120F',
  cardBackground: '#070C09',
  cardBorder: '#1E4D2F',
  chipBackground: '#07110A',
  chipBorder: '#1D6A3B',
  adGradientStart: '#0C8A44',
  adGradientEnd: '#020303',
};

export const MIN_TOUCH_TARGET = 44;
export const DEFAULT_HIT_SLOP = 10;
