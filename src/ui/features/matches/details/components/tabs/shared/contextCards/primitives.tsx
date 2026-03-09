import { Text, View } from 'react-native';

import { AppImage } from '@ui/shared/media/AppImage';
import type { MatchPreMatchRecentResult } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';

type ResultPillProps = {
  styles: MatchDetailsTabStyles;
  result: MatchPreMatchRecentResult['result'];
  score: string | null;
};

export function ResultPill({ styles, result, score }: ResultPillProps) {
  const badgeStyle =
    result === 'W'
      ? styles.preMatchResultBadgeWin
      : result === 'L'
        ? styles.preMatchResultBadgeLoss
        : styles.preMatchResultBadgeDraw;

  return (
    <View style={[styles.preMatchResultBadge, badgeStyle]}>
      <Text style={styles.preMatchResultBadgeText}>{score ?? '—'}</Text>
    </View>
  );
}

type MatchTeamLogoProps = {
  styles: MatchDetailsTabStyles;
  logo: string | null;
  fallback: string;
};

export function MatchTeamLogo({ styles, logo, fallback }: MatchTeamLogoProps) {
  if (logo) {
    return <AppImage source={{ uri: logo }} style={styles.preMatchTeamLogo} resizeMode="contain" />;
  }

  return (
    <View style={styles.preMatchTeamLogoFallback}>
      <Text style={styles.preMatchTeamLogoFallbackText}>{fallback.slice(0, 2).toUpperCase()}</Text>
    </View>
  );
}
