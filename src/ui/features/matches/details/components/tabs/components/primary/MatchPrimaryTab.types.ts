import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import type {
  EventRow,
  FinalScorerRow,
  MatchDetailsDatasetErrorReason,
  StatRow,
} from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';
import type {
  MatchLifecycleState,
  MatchPostMatchTabViewModel,
} from '@ui/features/matches/types/matches.types';

export type MatchPrimaryTabProps = {
  styles: MatchDetailsTabStyles;
  lifecycleState: MatchLifecycleState;
  homeTeamName: string;
  awayTeamName: string;
  winPercent: {
    home: string;
    draw: string;
    away: string;
  };
  venueName: string;
  venueCity: string;
  competitionName: string;
  insightText: string;
  isLiveRefreshing: boolean;
  statRows: StatRow[];
  eventRows: EventRow[];
  finalScorers: FinalScorerRow[];
  postMatchTab?: MatchPostMatchTabViewModel;
  matchScore: string;
  statsError?: boolean;
  statsErrorReason?: MatchDetailsDatasetErrorReason;
  eventsError?: boolean;
  eventsErrorReason?: MatchDetailsDatasetErrorReason;
  predictionsError?: boolean;
  predictionsErrorReason?: MatchDetailsDatasetErrorReason;
  onPressMatch?: (matchId: string) => void;
  onPressTeam?: (teamId: string) => void;
  onPressPlayer?: (playerId: string) => void;
  onPressCompetition?: (competitionId: string) => void;
};

export type MatchPrimaryPostMatchSection =
  NonNullable<MatchPostMatchTabViewModel['sectionsOrdered']>[number];
