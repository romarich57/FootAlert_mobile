import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Competition } from '@ui/features/competitions/types/competitions.types';

export type MainTabParamList = {
  Matches: undefined;
  Competitions: undefined;
  Follows: undefined;
  More: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  MatchDetails: { matchId: string };
  CompetitionDetails: { competitionId: string; competition?: Competition };
  TeamDetails: { teamId: string };
  PlayerDetails: { playerId: string };
  SearchPlaceholder: undefined;
  FollowsSearch: { initialTab: 'teams' | 'players' };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList { }
  }
}
