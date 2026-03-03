export type OnboardingStep = 'teams' | 'competitions' | 'players';

export type OnboardingTab = 'trending' | 'search';

export type OnboardingTrendItem =
  | { type: 'team'; id: string; name: string; logo: string; subtitle: string }
  | { type: 'competition'; id: string; name: string; logo: string; subtitle: string }
  | { type: 'player'; id: string; name: string; logo: string; subtitle: string };

export type TrendCompetitionItem = {
  competitionId: string;
  competitionName: string;
  competitionLogo: string;
  country: string;
  type: string;
};
