import { StyleSheet } from 'react-native';

import { MIN_TOUCH_TARGET, type ThemeColors } from '@ui/shared/theme/theme';

export function createPlayerStatsTabStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentPadding: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 60,
      gap: 16,
    },
    infoBanner: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.warning,
      backgroundColor: `${colors.warning}20`,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    infoBannerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    infoBannerIcon: {
      color: colors.warning,
    },
    infoBannerText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 14,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      flexShrink: 1,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 1,
    },
    cardSubtitle: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      flexShrink: 1,
      textAlign: 'right',
    },
    labelWithIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    labelWithIconRowStart: {
      justifyContent: 'flex-start',
    },
    labelIcon: {
      color: colors.textMuted,
    },
    labelIconPrimary: {
      color: colors.primary,
    },
    kpiTopRow: {
      flexDirection: 'row',
      gap: 10,
    },
    kpiTopTile: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 10,
      gap: 6,
      minHeight: 88,
      justifyContent: 'center',
      alignItems: 'center',
    },
    kpiTopTileGoals: {
      borderColor: `${colors.success}55`,
      backgroundColor: `${colors.success}1A`,
    },
    kpiTopTileAssists: {
      borderColor: `${colors.primary}50`,
      backgroundColor: `${colors.primary}1A`,
    },
    kpiTopTileRating: {
      borderColor: `${colors.warning}55`,
      backgroundColor: `${colors.warning}1A`,
    },
    kpiTopLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
    },
    kpiTopValue: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '900',
    },
    kpiTopValuePrimary: {
      color: colors.primary,
    },
    kpiBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    kpiBottomTile: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingVertical: 10,
      paddingHorizontal: 8,
      minHeight: 72,
    },
    kpiBottomValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 4,
    },
    kpiBottomLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      flexShrink: 1,
    },
    kpiBottomLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      width: '100%',
      minWidth: 0,
    },
    kpiBottomLabelIcon: {
      color: colors.textMuted,
      flexShrink: 0,
    },
    shotGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    shotTile: {
      width: '48.5%',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 12,
      gap: 4,
    },
    shotTileLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    shotTileValue: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '900',
    },
    perfHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
      gap: 8,
    },
    perfTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 1,
    },
    perfTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      flexShrink: 1,
    },
    perfSubtitle: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      flexShrink: 1,
      textAlign: 'right',
    },
    toggleRow: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 22,
      padding: 3,
      marginTop: 4,
      marginBottom: 4,
    },
    toggleButton: {
      flex: 1,
      minHeight: MIN_TOUCH_TARGET,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 20,
    },
    toggleButtonActive: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    toggleLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    toggleIcon: {
      color: colors.textMuted,
    },
    toggleIconActive: {
      color: colors.primary,
    },
    toggleText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    toggleTextActive: {
      color: colors.primary,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 14,
      marginBottom: 4,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
  });
}

export type PlayerStatsTabStyles = ReturnType<typeof createPlayerStatsTabStyles>;
