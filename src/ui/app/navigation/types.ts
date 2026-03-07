import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Competition } from '@ui/features/competitions/types/competitions.types';
import type { FollowEventSource } from '@ui/features/follows/types/follows.types';

export type MainTabParamList = {
  Matches: undefined;
  Competitions: undefined;
  Follows: undefined;
  More: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  MatchDetails: { matchId: string };
  CompetitionDetails: { competitionId: string; competition?: Competition };
  TeamDetails: { teamId: string; followSource?: FollowEventSource };
  PlayerDetails: { playerId: string; followSource?: FollowEventSource };
  SearchPlaceholder: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList { }
  }
}
