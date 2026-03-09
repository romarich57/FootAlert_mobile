import { Text, View } from 'react-native';

import { AppPressable } from '@ui/shared/components';
import { AppImage } from '@ui/shared/media/AppImage';
import { groupPlayersByPitchRows } from '@ui/features/matches/details/components/tabs/shared/matchDetailsSelectors';
import type { MatchLineupTeam } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import {
  computeTeamAverageRating,
  parseGridIndex,
  resolveRatingVariant,
} from '@ui/features/matches/details/components/tabs/lineups/lineupFormatters';
import { LineupPlayerNode } from '@ui/features/matches/details/components/tabs/components/lineups/LineupPlayerNode';
import { LineupRatingChip } from '@ui/features/matches/details/components/tabs/components/lineups/LineupRatingChip';

type UnifiedLineupsPitchProps = {
  styles: MatchDetailsTabStyles;
  homeTeam: MatchLineupTeam;
  awayTeam: MatchLineupTeam;
  onPressPlayer?: (playerId: string) => void;
  onPressTeam?: (teamId: string) => void;
};

function getTeamPitchRows(team: MatchLineupTeam) {
  return groupPlayersByPitchRows(team.startingXI)
    .map(row =>
      [...row].sort((playerA, playerB) => {
        const gridA = parseGridIndex(playerA.grid);
        const gridB = parseGridIndex(playerB.grid);
        return gridB.col - gridA.col;
      }),
    )
    .sort((rowA, rowB) => {
      const rowAIndex = parseGridIndex(rowA[0]?.grid).row;
      const rowBIndex = parseGridIndex(rowB[0]?.grid).row;
      return rowAIndex - rowBIndex;
    });
}

export function UnifiedLineupsPitch({
  styles,
  homeTeam,
  awayTeam,
  onPressPlayer,
  onPressTeam,
}: UnifiedLineupsPitchProps) {
  const homeRows = getTeamPitchRows(homeTeam);
  const awayRows = getTeamPitchRows(awayTeam);
  const homeTeamRating = computeTeamAverageRating(homeTeam.startingXI);
  const awayTeamRating = computeTeamAverageRating(awayTeam.startingXI);

  return (
    <View style={styles.lineupTeamBlock}>
      <View style={styles.lineupTeamHeader}>
        <LineupRatingChip
          styles={styles}
          rating={homeTeamRating}
          variant={resolveRatingVariant(homeTeamRating)}
          testId='lineup-home-rating'
          extraStyle={styles.lineupTeamRatingChip}
        />
        {homeTeam.teamLogo ? (
          <AppImage source={{ uri: homeTeam.teamLogo }} style={styles.lineupTeamLogo} resizeMode="contain" />
        ) : null}
        {onPressTeam ? (
          <AppPressable
            onPress={() => onPressTeam(homeTeam.teamId)}
            accessibilityRole='button'
            accessibilityLabel={homeTeam.teamName}
          >
            <Text style={styles.lineupTeamName}>{homeTeam.teamName}</Text>
          </AppPressable>
        ) : (
          <Text style={styles.lineupTeamName}>{homeTeam.teamName}</Text>
        )}
        <Text style={styles.lineupTeamFormation}>{homeTeam.formation ?? '--'}</Text>
      </View>

      <View style={styles.lineupPitchSurface}>
        <View style={styles.lineupPitchCenterLine} />
        <View style={styles.lineupPitchCenterCircle} />
        <View style={styles.lineupPitchPenaltyTop} />
        <View style={styles.lineupPitchPenaltyBottom} />

        <View style={styles.lineupPitchHalfHome}>
          {homeRows.map((row, index) => (
            <View key={`${homeTeam.teamId}-pitch-row-${index}`} style={[styles.lineupPitchRow, { zIndex: 10 - index }]}>
              {row.map(player => (
                <LineupPlayerNode
                  key={player.id}
                  styles={styles}
                  player={player}
                  eventMode='pitch'
                  onPressPlayer={onPressPlayer}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.lineupPitchHalfAway}>
          {awayRows.map((row, index) => (
            <View key={`${awayTeam.teamId}-pitch-row-${index}`} style={[styles.lineupPitchRow, { zIndex: index }]}>
              {row.map(player => (
                <LineupPlayerNode
                  key={player.id}
                  styles={styles}
                  player={player}
                  eventMode='pitch'
                  onPressPlayer={onPressPlayer}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.lineupTeamHeaderAway}>
        <Text style={[styles.lineupTeamFormation, styles.lineupTeamFormationAway]}>
          {awayTeam.formation ?? '--'}
        </Text>
        <LineupRatingChip
          styles={styles}
          rating={awayTeamRating}
          variant={resolveRatingVariant(awayTeamRating)}
          testId='lineup-away-rating'
          extraStyle={styles.lineupTeamRatingChip}
        />
        {onPressTeam ? (
          <AppPressable
            onPress={() => onPressTeam(awayTeam.teamId)}
            accessibilityRole='button'
            accessibilityLabel={awayTeam.teamName}
          >
            <Text style={styles.lineupTeamName}>{awayTeam.teamName}</Text>
          </AppPressable>
        ) : (
          <Text style={styles.lineupTeamName}>{awayTeam.teamName}</Text>
        )}
        {awayTeam.teamLogo ? (
          <AppImage source={{ uri: awayTeam.teamLogo }} style={styles.lineupTeamLogo} resizeMode="contain" />
        ) : null}
      </View>
    </View>
  );
}
