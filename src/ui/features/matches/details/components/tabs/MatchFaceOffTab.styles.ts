import { StyleSheet } from 'react-native';

import type { ThemeColors } from '@ui/shared/theme/theme';

export function createMatchFaceOffDynamicStyles(colors: ThemeColors) {
  return StyleSheet.create({
    h2hRow: {
      borderColor: colors.border,
      backgroundColor: 'transparent',
    },
    scoreBadge: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
    },
    scoreText: {
      color: colors.text,
    },
    teamNameWin: {
      color: colors.primary,
      fontWeight: '800',
    },
    teamNameLoss: {
      color: colors.textMuted,
      fontWeight: '600',
    },
    teamNameDraw: {
      color: colors.text,
      fontWeight: '700',
    },
    drawBar: {
      height: '100%',
      backgroundColor: colors.border,
    },
    awayBar: {
      backgroundColor: `${colors.text}B3`,
    },
  });
}

export type MatchFaceOffDynamicStyles = ReturnType<typeof createMatchFaceOffDynamicStyles>;

export const matchFaceOffLocalStyles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  summaryBadge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryBadgeText: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
  },
  chipScroll: {
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  h2hRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  teamName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  teamLogo: {
    width: 24,
    height: 24,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '900',
    minWidth: 40,
    textAlign: 'center',
  },
  barHomeFlat: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  barAwayFlat: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  loadMoreWrap: {
    paddingTop: 10,
    alignItems: 'center',
  },
  loadMoreBtn: {
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
