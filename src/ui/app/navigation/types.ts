import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Matches: undefined;
  Competitions: undefined;
  Follows: undefined;
  More: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  MatchDetails: { matchId: string };
  CompetitionDetails: { competitionId: string };
  TeamDetails: { teamId: string };
  PlayerDetails: { playerId: string };
  SearchPlaceholder: undefined;
  FollowsSearch: { initialTab: 'teams' | 'players' };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
