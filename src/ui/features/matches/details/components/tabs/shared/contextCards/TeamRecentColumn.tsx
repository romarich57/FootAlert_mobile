import { Text, View } from 'react-native';

import { AppPressable } from '@ui/shared/components';
import type { MatchPreMatchRecentResult } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import { MatchTeamLogo, ResultPill } from '@ui/features/matches/details/components/tabs/shared/contextCards/primitives';

type TeamRecentColumnProps = {
  styles: MatchDetailsTabStyles;
  teamName: string;
  teamId: string | null;
  teamLogo: string | null;
  matches: MatchPreMatchRecentResult[];
  onPressMatch?: (matchId: string) => void;
  onPressTeam?: (teamId: string) => void;
};

export function TeamRecentColumn({
  styles,
  teamName,
  teamId,
  teamLogo,
  matches,
  onPressMatch,
  onPressTeam,
}: TeamRecentColumnProps) {
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
              onPress={() => onPressMatch(match.fixtureId)}
              accessibilityRole='button'
              accessibilityLabel={match.score ?? match.fixtureId}
            >
              <ResultPill styles={styles} result={match.result} score={match.score} />
            </AppPressable>
          ) : (
            <ResultPill styles={styles} result={match.result} score={match.score} />
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
