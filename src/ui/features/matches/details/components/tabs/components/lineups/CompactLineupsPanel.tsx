import { Text, View } from 'react-native';

import { AppPressable } from '@ui/shared/components';
import { AppImage } from '@ui/shared/media/AppImage';
import { groupPlayersByPitchRows } from '@ui/features/matches/details/components/tabs/shared/matchDetailsSelectors';
import type { MatchLineupTeam, MatchLifecycleState } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import {
  formatPlayerCards,
  formatPlayerChange,
} from '@ui/features/matches/details/components/tabs/lineups/lineupFormatters';

type CompactLineupsPanelProps = {
  styles: MatchDetailsTabStyles;
  lineupTeams: MatchLineupTeam[];
  lifecycleState: MatchLifecycleState;
  t: (key: string) => string;
  onPressPlayer?: (playerId: string) => void;
  onPressTeam?: (teamId: string) => void;
};

type CompactRosterRowProps = {
  styles: MatchDetailsTabStyles;
  player: MatchLineupTeam['substitutes'][number];
  testKey: string;
  meta: string;
  onPressPlayer?: (playerId: string) => void;
};

function CompactRosterRow({
  styles,
  player,
  testKey,
  meta,
  onPressPlayer,
}: CompactRosterRowProps) {
  const content = (
    <>
      <Text style={styles.rosterName} numberOfLines={1}>
        {player.number ?? '--'} {player.name}
      </Text>
      <Text style={styles.rosterMeta}>{meta}</Text>
    </>
  );

  if (player.id && onPressPlayer) {
    return (
      <AppPressable
        key={testKey}
        style={styles.rosterRow}
        onPress={() => onPressPlayer(player.id)}
        accessibilityRole='button'
        accessibilityLabel={player.name}
      >
        {content}
      </AppPressable>
    );
  }

  return (
    <View key={testKey} style={styles.rosterRow}>
      {content}
    </View>
  );
}

export function CompactLineupsPanel({
  styles,
  lineupTeams,
  lifecycleState,
  t,
  onPressPlayer,
  onPressTeam,
}: CompactLineupsPanelProps) {
  return (
    <>
      {lineupTeams.map(team => {
        const pitchRows = groupPlayersByPitchRows(team.startingXI);

        return (
          <View key={team.teamId || team.teamName} style={styles.card}>
            {onPressTeam ? (
              <AppPressable
                style={styles.teamHeaderRow}
                onPress={() => onPressTeam(team.teamId)}
                accessibilityRole='button'
                accessibilityLabel={team.teamName}
              >
                {team.teamLogo ? (
                  <AppImage source={{ uri: team.teamLogo }} style={styles.teamLogo} resizeMode="contain" />
                ) : null}
                <Text style={styles.cardTitle}>{team.teamName}</Text>
              </AppPressable>
            ) : (
              <View style={styles.teamHeaderRow}>
                {team.teamLogo ? (
                  <AppImage source={{ uri: team.teamLogo }} style={styles.teamLogo} resizeMode="contain" />
                ) : null}
                <Text style={styles.cardTitle}>{team.teamName}</Text>
              </View>
            )}

            <Text style={styles.cardSubtitle}>
              {t('matchDetails.lineups.formation')}: {team.formation}
            </Text>
            <Text style={styles.cardSubtitle}>
              {t('matchDetails.lineups.coach')}: {team.coach}
            </Text>

            <View style={styles.pitchCard}>
              {pitchRows.map((row, index) => (
                <View key={`${team.teamId}-pitch-row-${index}`} style={styles.pitchRow}>
                  {row.map(player => (
                    player.id && onPressPlayer ? (
                      <AppPressable
                        key={player.id}
                        style={styles.playerChip}
                        onPress={() => onPressPlayer(player.id)}
                        accessibilityRole='button'
                        accessibilityLabel={player.name}
                      >
                        <Text style={styles.playerChipText} numberOfLines={1}>
                          {player.number ?? '--'} {player.name}
                        </Text>
                      </AppPressable>
                    ) : (
                      <View key={player.id} style={styles.playerChip}>
                        <Text style={styles.playerChipText} numberOfLines={1}>
                          {player.number ?? '--'} {player.name}
                        </Text>
                      </View>
                    )
                  ))}
                </View>
              ))}
            </View>

            <Text style={styles.metricLabel}>{t('matchDetails.lineups.substitutes')}</Text>
            {team.substitutes.map(player => (
              <CompactRosterRow
                key={`${team.teamId}-sub-${player.id}`}
                styles={styles}
                player={player}
                testKey={`${team.teamId}-sub-${player.id}`}
                meta={`★ ${player.rating ?? '--'} · G ${player.goals ?? 0} · A ${player.assists ?? 0} · ${formatPlayerCards(player)}`}
                onPressPlayer={onPressPlayer}
              />
            ))}

            <Text style={styles.metricLabel}>
              {lifecycleState === 'finished' ? t('matchDetails.lineups.reserves') : t('matchDetails.lineups.reserves')}
            </Text>
            {team.reserves.length > 0 ? (
              team.reserves.map(player => (
                <CompactRosterRow
                  key={`${team.teamId}-reserve-${player.id}`}
                  styles={styles}
                  player={player}
                  testKey={`${team.teamId}-reserve-${player.id}`}
                  meta={`★ ${player.rating ?? '--'} · G ${player.goals ?? 0} · A ${player.assists ?? 0} · ${formatPlayerCards(player)}`}
                  onPressPlayer={onPressPlayer}
                />
              ))
            ) : (
              <Text style={styles.newsText}>{t('matchDetails.values.unavailable')}</Text>
            )}

            {team.substitutes.some(player => formatPlayerChange(player).length > 0) ? (
              <View style={styles.rosterRow}>
                <Text style={styles.rosterMeta}>
                  {team.substitutes
                    .map(player =>
                      formatPlayerChange(player)
                        ? `${player.number ?? '--'} ${player.name} ${formatPlayerChange(player)}`
                        : null,
                    )
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </>
  );
}
