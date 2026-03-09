import { Text, View } from 'react-native';
import type { TFunction } from 'i18next';

import type { MatchPostMatchUpcomingMatchesPayload } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import { TeamUpcomingColumn } from '@ui/features/matches/details/components/tabs/shared/contextCards/TeamUpcomingColumn';

type MatchUpcomingMatchesCardProps = {
  styles: MatchDetailsTabStyles;
  t: TFunction;
  payload: MatchPostMatchUpcomingMatchesPayload;
  onPressMatch?: (matchId: string) => void;
  onPressTeam?: (teamId: string) => void;
};

export function MatchUpcomingMatchesCard({
  styles,
  t,
  payload,
  onPressMatch,
  onPressTeam,
}: MatchUpcomingMatchesCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('matchDetails.postMatch.upcomingMatches.title')}</Text>
      <View style={styles.preMatchRecentColumns}>
        <TeamUpcomingColumn
          styles={styles}
          t={t}
          teamName={payload.home.teamName}
          teamId={payload.home.teamId}
          teamLogo={payload.home.teamLogo}
          matches={payload.home.matches}
          onPressMatch={onPressMatch}
          onPressTeam={onPressTeam}
        />
        <TeamUpcomingColumn
          styles={styles}
          t={t}
          teamName={payload.away.teamName}
          teamId={payload.away.teamId}
          teamLogo={payload.away.teamLogo}
          matches={payload.away.matches}
          onPressMatch={onPressMatch}
          onPressTeam={onPressTeam}
        />
      </View>
    </View>
  );
}
