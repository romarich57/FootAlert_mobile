import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { bffGet } from '@data/endpoints/bffClient';
import { getCurrentSeasonYear } from '@data/mappers/followsMapper';
import { useDiscoveryEntities } from '@ui/features/follows/hooks/useDiscoveryEntities';
import {
  isFollowDiscoveryPlayerItem,
  isFollowDiscoveryTeamItem,
} from '@ui/features/follows/utils/discoveryItemGuards';
import type { TrendCompetitionItem } from '@ui/features/onboarding/types/onboarding.types';
import type { OnboardingStep } from '@ui/features/onboarding/types/onboarding.types';
import type { OnboardingEntityCardData } from '@ui/features/onboarding/components/OnboardingEntityCard';

const ONBOARDING_TRENDS_STALE_TIME = 5 * 60 * 1000;

type TrendCompetitionsResponse = {
  competitions: TrendCompetitionItem[];
};

export function useOnboardingTrends(step: OnboardingStep) {
  const season = getCurrentSeasonYear();
  const discoveryQuery = useDiscoveryEntities({
    tab: step === 'players' ? 'players' : 'teams',
    surface: 'onboarding',
    enabled: step === 'teams' || step === 'players',
    limit: 8,
  });
  const competitionsQuery = useQuery<OnboardingEntityCardData[]>({
    queryKey: ['onboarding', 'trends', step, season],
    staleTime: ONBOARDING_TRENDS_STALE_TIME,
    enabled: step === 'competitions',
    queryFn: async ({ signal }): Promise<OnboardingEntityCardData[]> => {
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
    },
  });
  const discoveryTeamItems = useMemo(
    () => discoveryQuery.resolvedItems.filter(isFollowDiscoveryTeamItem),
    [discoveryQuery.resolvedItems],
  );
  const discoveryPlayerItems = useMemo(
    () => discoveryQuery.resolvedItems.filter(isFollowDiscoveryPlayerItem),
    [discoveryQuery.resolvedItems],
  );

  const discoveryCards = useMemo<OnboardingEntityCardData[]>(() => {
    if (step === 'teams') {
      return discoveryTeamItems.map(item => ({
        id: item.teamId,
        name: item.teamName,
        logo: item.teamLogo,
        subtitle: item.country,
        kind: 'team',
        country: item.country,
      }));
    }

    if (step === 'players') {
      return discoveryPlayerItems.map(item => ({
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
    }

    return [];
  }, [discoveryPlayerItems, discoveryTeamItems, step]);

  if (step === 'competitions') {
    return competitionsQuery;
  }

  return {
    data: discoveryCards,
    isLoading: discoveryQuery.isLoading,
    isError: discoveryQuery.isError,
    isFetching: discoveryQuery.isFetching,
    refetch: discoveryQuery.refetch,
    dataUpdatedAt: discoveryQuery.dataUpdatedAt,
  };
}
