import { Text, View } from 'react-native';

import type { MatchLineupTeam } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import { resolvePositionLabel } from '@ui/features/matches/details/components/tabs/lineups/lineupFormatters';
import { LineupPlayerNode } from '@ui/features/matches/details/components/tabs/components/lineups/LineupPlayerNode';

type FinishedBenchColumnProps = {
  styles: MatchDetailsTabStyles;
  team: MatchLineupTeam;
  t: (key: string) => string;
  onPressPlayer?: (playerId: string) => void;
};

export function FinishedBenchColumn({
  styles,
  team,
  t,
  onPressPlayer,
}: FinishedBenchColumnProps) {
  if (team.substitutes.length === 0) {
    return <Text style={styles.newsText}>{t('matchDetails.values.unavailable')}</Text>;
  }

  return (
    <View style={styles.lineupColumnList}>
      {team.substitutes.map(player => (
        <View key={`${team.teamId}-sub-finished-${player.id}`} style={styles.lineupBenchItem}>
          <LineupPlayerNode
            styles={styles}
            player={player}
            eventMode='bench'
            onPressPlayer={onPressPlayer}
          />
          <Text style={styles.lineupBenchPosition}>{resolvePositionLabel(player.position, t)}</Text>
        </View>
      ))}
    </View>
  );
}
