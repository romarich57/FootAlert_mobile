import type { CompetitionsApiLeagueDto } from './competitions.types';
import type {
  FollowDiscoveryPlayerItem,
  FollowDiscoveryResponse,
  FollowDiscoveryTeamItem,
  FollowedPlayerCard,
  FollowedTeamCard,
} from './follows.types';
import type { ApiFootballFixtureDto } from './matches.types';

export type BootstrapWarmEntityRef = {
  kind: 'team' | 'player' | 'competition' | 'match';
  id: string;
};

export type BootstrapTopCompetition = {
  competitionId: string;
  competitionName: string;
  competitionLogo: string;
  country: string;
  type: string;
};

export type BootstrapPayload = {
  generatedAt: string;
  date: string;
  timezone: string;
  season: number;
  matchesToday: ApiFootballFixtureDto[];
  topCompetitions: BootstrapTopCompetition[];
  competitionsCatalog: CompetitionsApiLeagueDto[];
  followedTeamCards: FollowedTeamCard[];
  followedPlayerCards: FollowedPlayerCard[];
  discovery: {
    teams: FollowDiscoveryResponse<FollowDiscoveryTeamItem>;
    players: FollowDiscoveryResponse<FollowDiscoveryPlayerItem>;
  };
  warmEntityRefs: BootstrapWarmEntityRef[];
};
