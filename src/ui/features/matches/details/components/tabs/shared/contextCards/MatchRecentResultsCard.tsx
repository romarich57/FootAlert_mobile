import { Text, View } from 'react-native';
import type { TFunction } from 'i18next';

import type { MatchPreMatchRecentResultsPayload } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import { TeamRecentColumn } from '@ui/features/matches/details/components/tabs/shared/contextCards/TeamRecentColumn';

type MatchRecentResultsCardProps = {
  styles: MatchDetailsTabStyles;
  t: TFunction;
  payload: MatchPreMatchRecentResultsPayload;
  onPressMatch?: (matchId: string) => void;
  onPressTeam?: (teamId: string) => void;
};

export function MatchRecentResultsCard({
  styles,
  t,
  payload,
  onPressMatch,
  onPressTeam,
}: MatchRecentResultsCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('matchDetails.preMatch.recentResults.title')}</Text>
      <View style={styles.preMatchRecentColumns}>
        <TeamRecentColumn
          styles={styles}
          teamName={payload.home.teamName}
          teamId={payload.home.teamId}
          teamLogo={payload.home.teamLogo}
          matches={payload.home.matches}
          onPressMatch={onPressMatch}
          onPressTeam={onPressTeam}
        />
        <TeamRecentColumn
          styles={styles}
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
