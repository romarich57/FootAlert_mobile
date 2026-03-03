import { useQuery } from '@tanstack/react-query';

import { fetchTrendingPlayers, fetchTrendingTeams } from '@data/endpoints/followsApi';
import { bffGet } from '@data/endpoints/bffClient';
import {
  getCurrentSeasonYear,
  mapTrendingPlayersFromTopScorers,
  mapTrendingTeamsFromStandings,
} from '@data/mappers/followsMapper';
import { TOP_COMPETITION_IDS } from '@/shared/constants';
import { appEnv } from '@data/config/env';
import type { TrendCompetitionItem } from '@ui/features/onboarding/types/onboarding.types';
import type { OnboardingStep } from '@ui/features/onboarding/types/onboarding.types';
import type { OnboardingEntityCardData } from '@ui/features/onboarding/components/OnboardingEntityCard';

const ONBOARDING_TRENDS_STALE_TIME = 5 * 60 * 1000;

type TrendCompetitionsResponse = {
  competitions: TrendCompetitionItem[];
};

function getTopLeagueIds(): string[] {
  return TOP_COMPETITION_IDS.slice(0, appEnv.followsTrendsLeagueCount);
}

export function useOnboardingTrends(step: OnboardingStep) {
  const season = getCurrentSeasonYear();

  return useQuery<OnboardingEntityCardData[]>({
    queryKey: ['onboarding', 'trends', step, season],
    staleTime: ONBOARDING_TRENDS_STALE_TIME,
    queryFn: async ({ signal }): Promise<OnboardingEntityCardData[]> => {
      if (step === 'teams') {
        try {
          const payload = await fetchTrendingTeams(getTopLeagueIds(), season, signal);
          const items = mapTrendingTeamsFromStandings(payload, appEnv.followsTrendsTeamsLimit);
          return items.map(item => ({
            id: item.teamId,
            name: item.teamName,
            logo: item.teamLogo,
            subtitle: item.leagueName,
          }));
        } catch {
          return [];
        }
      }

      if (step === 'competitions') {
        try {
          const result = await bffGet<TrendCompetitionsResponse>(
            '/follows/trends/competitions',
            undefined,
            { signal },
          );
          return result.competitions.map(comp => ({
            id: comp.competitionId,
            name: comp.competitionName,
            logo: comp.competitionLogo,
            subtitle: comp.country,
          }));
        } catch {
          return [];
        }
      }

      // players
      try {
        const payload = await fetchTrendingPlayers(getTopLeagueIds(), season, signal);
        const items = mapTrendingPlayersFromTopScorers(
          payload,
          appEnv.followsTrendsPlayersLimit,
          season,
        );
        return items.map(item => ({
          id: item.playerId,
          name: item.playerName,
          logo: item.playerPhoto,
          subtitle: `${item.teamName} · ${item.teamLogo ? '' : ''}`,
        }));
      } catch {
        return [];
      }
    },
  });
}
