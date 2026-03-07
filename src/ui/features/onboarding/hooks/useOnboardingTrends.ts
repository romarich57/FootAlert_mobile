import { useQuery } from '@tanstack/react-query';

import { fetchDiscoveryPlayers, fetchDiscoveryTeams } from '@data/endpoints/followsApi';
import { bffGet } from '@data/endpoints/bffClient';
import { getCurrentSeasonYear } from '@data/mappers/followsMapper';
import type { TrendCompetitionItem } from '@ui/features/onboarding/types/onboarding.types';
import type { OnboardingStep } from '@ui/features/onboarding/types/onboarding.types';
import type { OnboardingEntityCardData } from '@ui/features/onboarding/components/OnboardingEntityCard';

const ONBOARDING_TRENDS_STALE_TIME = 5 * 60 * 1000;

type TrendCompetitionsResponse = {
  competitions: TrendCompetitionItem[];
};

export function useOnboardingTrends(step: OnboardingStep) {
  const season = getCurrentSeasonYear();

  return useQuery<OnboardingEntityCardData[]>({
    queryKey: ['onboarding', 'trends', step, season],
    staleTime: ONBOARDING_TRENDS_STALE_TIME,
    queryFn: async ({ signal }): Promise<OnboardingEntityCardData[]> => {
      if (step === 'teams') {
        try {
          const result = await fetchDiscoveryTeams(8, signal);
          return result.items.map(item => ({
            id: item.teamId,
            name: item.teamName,
            logo: item.teamLogo,
            subtitle: item.country,
            kind: 'team',
            country: item.country,
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
        const result = await fetchDiscoveryPlayers(8, signal);
        return result.items.map(item => ({
          id: item.playerId,
          name: item.playerName,
          logo: item.playerPhoto,
          subtitle: item.teamName,
          kind: 'player',
          position: item.position,
          teamName: item.teamName,
          teamLogo: item.teamLogo,
          leagueName: item.leagueName,
        }));
      } catch {
        return [];
      }
    },
  });
}
