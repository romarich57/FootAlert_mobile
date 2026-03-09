import { Text, View } from 'react-native';
import type { TFunction } from 'i18next';

import { AppPressable } from '@ui/shared/components';
import type { MatchPostMatchUpcomingMatchesPayload } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import { MatchTeamLogo } from '@ui/features/matches/details/components/tabs/shared/contextCards/primitives';

type TeamUpcomingColumnProps = {
  styles: MatchDetailsTabStyles;
  t: TFunction;
  teamName: string;
  teamId: string | null;
  teamLogo: string | null;
  matches: MatchPostMatchUpcomingMatchesPayload['home']['matches'];
  onPressMatch?: (matchId: string) => void;
  onPressTeam?: (teamId: string) => void;
};

export function TeamUpcomingColumn({
  styles,
  t,
  teamName,
  teamId,
  teamLogo,
  matches,
  onPressMatch,
  onPressTeam,
}: TeamUpcomingColumnProps) {
  return (
    <View style={styles.preMatchRecentColumn}>
      {teamId && onPressTeam ? (
        <AppPressable
          style={styles.preMatchRecentTeamHeader}
          onPress={() => onPressTeam(teamId)}
          accessibilityRole='button'
          accessibilityLabel={teamName}
        >
          <MatchTeamLogo styles={styles} logo={teamLogo} fallback={teamName} />
          <Text style={styles.preMatchRecentTeamTitle} numberOfLines={1}>
            {teamName}
          </Text>
        </AppPressable>
      ) : (
        <View style={styles.preMatchRecentTeamHeader}>
          <MatchTeamLogo styles={styles} logo={teamLogo} fallback={teamName} />
          <Text style={styles.preMatchRecentTeamTitle} numberOfLines={1}>
            {teamName}
          </Text>
        </View>
      )}

      {matches.map(match => (
        <View key={match.fixtureId} style={styles.preMatchRecentMatchRow}>
          {match.homeTeamId && onPressTeam ? (
            <AppPressable
              onPress={() => onPressTeam(match.homeTeamId ?? '')}
              accessibilityRole='button'
              accessibilityLabel={match.homeTeamName ?? teamName}
            >
              <MatchTeamLogo styles={styles} logo={match.homeTeamLogo} fallback={match.homeTeamName ?? ''} />
            </AppPressable>
          ) : (
            <MatchTeamLogo styles={styles} logo={match.homeTeamLogo} fallback={match.homeTeamName ?? ''} />
          )}

          {onPressMatch ? (
            <AppPressable
              style={styles.postMatchUpcomingInfo}
              onPress={() => onPressMatch(match.fixtureId)}
              accessibilityRole='button'
              accessibilityLabel={`${match.homeTeamName ?? '—'} vs ${match.awayTeamName ?? '—'}`}
            >
              <Text numberOfLines={1} style={styles.newsText}>
                {match.homeTeamName ?? '—'} vs {match.awayTeamName ?? '—'}
              </Text>
              <Text numberOfLines={1} style={styles.postMatchUpcomingMeta}>
                {match.kickoffDisplay ?? t('matchDetails.values.unavailable')}
              </Text>
            </AppPressable>
          ) : (
            <View style={styles.postMatchUpcomingInfo}>
              <Text numberOfLines={1} style={styles.newsText}>
                {match.homeTeamName ?? '—'} vs {match.awayTeamName ?? '—'}
              </Text>
              <Text numberOfLines={1} style={styles.postMatchUpcomingMeta}>
                {match.kickoffDisplay ?? t('matchDetails.values.unavailable')}
              </Text>
            </View>
          )}

          {match.awayTeamId && onPressTeam ? (
            <AppPressable
              onPress={() => onPressTeam(match.awayTeamId ?? '')}
              accessibilityRole='button'
              accessibilityLabel={match.awayTeamName ?? teamName}
            >
              <MatchTeamLogo styles={styles} logo={match.awayTeamLogo} fallback={match.awayTeamName ?? ''} />
            </AppPressable>
          ) : (
            <MatchTeamLogo styles={styles} logo={match.awayTeamLogo} fallback={match.awayTeamName ?? ''} />
          )}
        </View>
      ))}
    </View>
  );
}
