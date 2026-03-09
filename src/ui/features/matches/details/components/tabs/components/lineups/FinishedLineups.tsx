import { Text, View } from 'react-native';

import { AppImage } from '@ui/shared/media/AppImage';
import type { MatchLineupTeam } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import { toInitials } from '@ui/features/matches/details/components/tabs/lineups/lineupFormatters';
import { TeamColumnLabel } from '@ui/features/matches/details/components/tabs/components/lineups/TeamColumnLabel';
import { FinishedBenchColumn } from '@ui/features/matches/details/components/tabs/components/lineups/FinishedBenchColumn';
import { FinishedAbsenceColumn } from '@ui/features/matches/details/components/tabs/components/lineups/FinishedAbsenceColumn';
import { FinishedLegend } from '@ui/features/matches/details/components/tabs/components/lineups/FinishedLegend';
import { UnifiedLineupsPitch } from '@ui/features/matches/details/components/tabs/components/lineups/UnifiedLineupsPitch';

type FinishedLineupsProps = {
  styles: MatchDetailsTabStyles;
  lineupTeams: MatchLineupTeam[];
  t: (key: string) => string;
  onPressPlayer?: (playerId: string) => void;
  onPressTeam?: (teamId: string) => void;
};

export function FinishedLineups({
  styles,
  lineupTeams,
  t,
  onPressPlayer,
  onPressTeam,
}: FinishedLineupsProps) {
  const teams = lineupTeams.slice(0, 2);
  const homeTeam = teams[0];
  const awayTeam = teams[1];
  const hasAbsencesData = teams.some(team => team.absences.length > 0);

  return (
    <>
      {homeTeam && awayTeam ? (
        <UnifiedLineupsPitch
          styles={styles}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          onPressPlayer={onPressPlayer}
          onPressTeam={onPressTeam}
        />
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.lineups.coach')}</Text>
        <View style={styles.lineupTwoColumnsWrap}>
          {teams.map(team => (
            <View key={`coach-${team.teamId}`} style={styles.lineupColumn}>
              <TeamColumnLabel styles={styles} team={team} onPressTeam={onPressTeam} />
              <View style={styles.lineupCoachCard}>
                <View style={styles.lineupCoachAvatarWrap}>
                  <View style={styles.lineupPlayerImageWrap}>
                    {team.coachPhoto ? (
                      <AppImage source={{ uri: team.coachPhoto }} style={styles.lineupCoachAvatar} resizeMode="contain" />
                    ) : (
                      <View style={styles.lineupCoachAvatarFallback}>
                        <Text style={styles.lineupPlayerAvatarFallbackText}>{toInitials(team.coach ?? team.teamName)}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={styles.lineupCoachName}>{team.coach ?? t('matchDetails.values.unavailable')}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.lineups.substitutes')}</Text>
        <View style={styles.lineupTwoColumnsWrap}>
          {teams.map(team => (
            <View key={`subs-${team.teamId}`} style={styles.lineupColumn}>
              <TeamColumnLabel styles={styles} team={team} onPressTeam={onPressTeam} />
              <FinishedBenchColumn styles={styles} team={team} t={t} onPressPlayer={onPressPlayer} />
            </View>
          ))}
        </View>
      </View>

      {hasAbsencesData ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('matchDetails.lineups.absencesDetailedTitle')}</Text>
          <View style={styles.lineupTwoColumnsWrap}>
            {teams.map(team => (
              <View key={`absences-${team.teamId}`} style={styles.lineupColumn}>
                <TeamColumnLabel styles={styles} team={team} onPressTeam={onPressTeam} />
                <FinishedAbsenceColumn styles={styles} team={team} t={t} onPressPlayer={onPressPlayer} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <FinishedLegend styles={styles} t={t} />
      </View>
    </>
  );
}
