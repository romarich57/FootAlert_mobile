import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchDiscoveryPlayers, fetchDiscoveryTeams } from '@data/endpoints/followsApi';
import { bffGet } from '@data/endpoints/bffClient';
import { getCurrentSeasonYear } from '@data/mappers/followsMapper';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import type { TrendCompetitionItem } from '@ui/features/onboarding/types/onboarding.types';
import type { OnboardingStep } from '@ui/features/onboarding/types/onboarding.types';
import type { OnboardingEntityCardData } from '@ui/features/onboarding/components/OnboardingEntityCard';
import { buildOnboardingSeedCards } from '@ui/features/follows/utils/discoverySeeds';

const ONBOARDING_TRENDS_STALE_TIME = 5 * 60 * 1000;

type TrendCompetitionsResponse = {
  competitions: TrendCompetitionItem[];
};

export function useOnboardingTrends(step: OnboardingStep) {
  const season = getCurrentSeasonYear();
  const query = useQuery<OnboardingEntityCardData[]>({
    queryKey: ['onboarding', 'trends', step, season],
    staleTime: ONBOARDING_TRENDS_STALE_TIME,
    placeholderData: previousData => {
      if (previousData) {
        return previousData;
      }

      if (step === 'teams' || step === 'players') {
        return buildOnboardingSeedCards(step, 8);
      }

      return undefined;
    },
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

  const lastTelemetryKeyRef = useRef<string | null>(null);
  const pendingPlaceholderReplacementRef = useRef(false);

  useEffect(() => {
    if ((step !== 'teams' && step !== 'players') || !query.data) {
      return;
    }

    const source = query.isPlaceholderData ? 'static_seed' : 'dynamic';
    const itemCount = query.data.length;
    const telemetryKey = `${step}|${source}|${itemCount}|${query.isPlaceholderData ? 'placeholder' : 'resolved'}|${query.dataUpdatedAt}`;
    if (lastTelemetryKeyRef.current === telemetryKey) {
      return;
    }
    lastTelemetryKeyRef.current = telemetryKey;

    getMobileTelemetry().trackEvent('follows.discovery_source', {
      screen: 'onboarding',
      tab: step,
      source,
      itemCount,
    });

    if (query.isPlaceholderData) {
      pendingPlaceholderReplacementRef.current = true;
      getMobileTelemetry().trackEvent('follows.discovery_seed_rendered', {
        screen: 'onboarding',
        tab: step,
        source,
        itemCount,
      });
      return;
    }

    if (pendingPlaceholderReplacementRef.current) {
      pendingPlaceholderReplacementRef.current = false;
      getMobileTelemetry().trackEvent('follows.discovery_remote_replaced', {
        screen: 'onboarding',
        tab: step,
        source,
        itemCount,
      });
    }
  }, [query.data, query.dataUpdatedAt, query.isPlaceholderData, step]);

  return query;
}
