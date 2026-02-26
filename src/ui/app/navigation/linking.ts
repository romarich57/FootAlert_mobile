import type { LinkingOptions } from '@react-navigation/native';

import type { RootStackParamList } from '@ui/app/navigation/types';
import { sanitizeNumericEntityId } from '@ui/app/navigation/routeParams';
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
      MatchDetails: {
        path: 'match/:matchId',
        parse: {
          matchId: value => sanitizeNumericEntityId(value) ?? '',
        },
      },
      CompetitionDetails: {
        path: 'competition/:competitionId',
        parse: {
          competitionId: value => sanitizeNumericEntityId(value) ?? '',
        },
      },
      TeamDetails: {
        path: 'team/:teamId',
        parse: {
          teamId: value => sanitizeNumericEntityId(value) ?? '',
        },
      },
      PlayerDetails: {
        path: 'player/:playerId',
        parse: {
          playerId: value => sanitizeNumericEntityId(value) ?? '',
        },
      },
      SearchPlaceholder: 'search',
    },
  },
};
