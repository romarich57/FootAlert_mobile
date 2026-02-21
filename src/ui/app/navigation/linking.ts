import type { LinkingOptions } from '@react-navigation/native';

import type { RootStackParamList } from '@ui/app/navigation/types';
import { APP_SCHEME } from '@/shared/constants';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [`${APP_SCHEME}://`],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Matches: 'matches',
          Competitions: 'competitions',
          Follows: 'follows',
          More: 'more',
        },
      },
      MatchDetails: 'match/:matchId',
      CompetitionDetails: 'competition/:competitionId',
      TeamDetails: 'team/:teamId',
      PlayerDetails: 'player/:playerId',
      SearchPlaceholder: 'search',
      FollowsSearch: 'follows/search/:initialTab?',
    },
  },
};
