import { Text, View } from 'react-native';
import type { TFunction } from 'i18next';

import { AppPressable } from '@ui/shared/components';
import type { MatchPreMatchStandingsPayload } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import { MatchTeamLogo } from '@ui/features/matches/details/components/tabs/shared/contextCards/primitives';

type MatchStandingsCardProps = {
  styles: MatchDetailsTabStyles;
  t: TFunction;
  payload: MatchPreMatchStandingsPayload;
  onPressTeam?: (teamId: string) => void;
};

export function MatchStandingsCard({ styles, t, payload, onPressTeam }: MatchStandingsCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('matchDetails.preMatch.standings.title')}</Text>
      <Text style={styles.cardSubtitle}>{payload.competitionName ?? t('matchDetails.values.unavailable')}</Text>

      <View style={styles.preMatchStandingsHeader}>
        <Text style={[styles.preMatchStandingsCell, styles.preMatchStandingsCellRank]}>#</Text>
        <Text style={[styles.preMatchStandingsCell, styles.preMatchStandingsCellTeam]}>
          {t('teamDetails.standings.headers.team')}
        </Text>
        <Text style={styles.preMatchStandingsCell}>{t('teamDetails.standings.headers.played')}</Text>
        <Text style={styles.preMatchStandingsCell}>{t('teamDetails.standings.headers.win')}</Text>
        <Text style={styles.preMatchStandingsCell}>{t('teamDetails.standings.headers.draw')}</Text>
        <Text style={styles.preMatchStandingsCell}>{t('teamDetails.standings.headers.loss')}</Text>
        <Text style={styles.preMatchStandingsCell}>{t('teamDetails.standings.headers.goalDiff')}</Text>
        <Text style={[styles.preMatchStandingsCell, styles.preMatchStandingsCellPoints]}>
          {t('teamDetails.standings.headers.points')}
        </Text>
      </View>

      {[payload.home, payload.away].map(row => (
        <View key={row.teamId ?? row.teamName ?? 'row'} style={styles.preMatchStandingsRow}>
          <Text style={[styles.preMatchStandingsCellValue, styles.preMatchStandingsCellRank]}>
            {row.rank ?? '—'}
          </Text>
          {row.teamId && onPressTeam ? (
            <AppPressable
              style={[styles.preMatchStandingsTeamCell, styles.preMatchStandingsCellTeam]}
              onPress={() => onPressTeam(row.teamId ?? '')}
              accessibilityRole='button'
              accessibilityLabel={row.teamName ?? t('matchDetails.values.unavailable')}
            >
              <MatchTeamLogo styles={styles} logo={row.teamLogo} fallback={row.teamName ?? ''} />
              <Text style={styles.preMatchStandingsTeamName} numberOfLines={1}>
                {row.teamName ?? t('matchDetails.values.unavailable')}
              </Text>
            </AppPressable>
          ) : (
            <View style={[styles.preMatchStandingsTeamCell, styles.preMatchStandingsCellTeam]}>
              <MatchTeamLogo styles={styles} logo={row.teamLogo} fallback={row.teamName ?? ''} />
              <Text style={styles.preMatchStandingsTeamName} numberOfLines={1}>
                {row.teamName ?? t('matchDetails.values.unavailable')}
              </Text>
            </View>
          )}
          <Text style={styles.preMatchStandingsCellValue}>{row.played ?? '—'}</Text>
          <Text style={styles.preMatchStandingsCellValue}>{row.win ?? '—'}</Text>
          <Text style={styles.preMatchStandingsCellValue}>{row.draw ?? '—'}</Text>
          <Text style={styles.preMatchStandingsCellValue}>{row.lose ?? '—'}</Text>
          <Text style={styles.preMatchStandingsCellValue}>{row.goalDiff ?? '—'}</Text>
          <Text style={[styles.preMatchStandingsCellValue, styles.preMatchStandingsCellPoints]}>
            {row.points ?? '—'}
          </Text>
        </View>
      ))}
    </View>
  );
}
