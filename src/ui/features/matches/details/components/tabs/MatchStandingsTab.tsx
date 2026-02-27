import { View } from 'react-native';

import { TeamStandingsTab } from '@ui/features/teams/components/TeamStandingsTab';
import type { TeamStandingsData } from '@ui/features/teams/types/teams.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';

type MatchStandingsTabProps = {
  styles: MatchDetailsTabStyles;
  standingsData: TeamStandingsData;
};

export function MatchStandingsTab({ styles, standingsData }: MatchStandingsTabProps) {
  return (
    <View style={styles.standingsTabContainer}>
      <TeamStandingsTab
        data={standingsData}
        isLoading={false}
        isError={false}
        hasFetched
        disableVirtualization
        onRetry={() => undefined}
      />
    </View>
  );
}
