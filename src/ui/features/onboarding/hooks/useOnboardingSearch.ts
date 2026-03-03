import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { searchTeamsByName, searchPlayersByName } from '@data/endpoints/followsApi';
import { bffGet } from '@data/endpoints/bffClient';
import {
  getCurrentSeasonYear,
  mapTeamSearchResults,
  mapPlayerSearchResults,
} from '@data/mappers/followsMapper';
import { appEnv } from '@data/config/env';
import type { OnboardingStep } from '@ui/features/onboarding/types/onboarding.types';
import type { OnboardingEntityCardData } from '@ui/features/onboarding/components/OnboardingEntityCard';

const DEBOUNCE_MS = 500;
const MIN_CHARS = 2;

type ApiFootballLeague = {
  league?: {
    id?: number;
    name?: string;
    logo?: string;
    type?: string;
  };
  country?: {
    name?: string;
  };
};

type CompetitionSearchResponse = {
  response?: ApiFootballLeague[];
};

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function useOnboardingSearch(step: OnboardingStep) {
  const [query, setQuery] = useState('');
  const season = getCurrentSeasonYear();
  const trimmed = query.trim();
  const debouncedQuery = useDebouncedValue(trimmed, DEBOUNCE_MS);
  const hasEnoughChars = debouncedQuery.length >= MIN_CHARS;

  const searchQuery = useQuery<OnboardingEntityCardData[]>({
    queryKey: ['onboarding', 'search', step, debouncedQuery, season],
    enabled: hasEnoughChars,
    queryFn: async ({ signal }): Promise<OnboardingEntityCardData[]> => {
      if (step === 'teams') {
        const payload = await searchTeamsByName(debouncedQuery, signal);
        const items = mapTeamSearchResults(payload, appEnv.followsSearchResultsLimit);
        return items.map(item => ({
          id: item.teamId,
          name: item.teamName,
          logo: item.teamLogo,
          subtitle: item.country,
        }));
      }

      if (step === 'competitions') {
        const result = await bffGet<CompetitionSearchResponse>(
          '/follows/search/competitions',
          { q: debouncedQuery },
          { signal },
        );
        return (result.response ?? [])
          .slice(0, appEnv.followsSearchResultsLimit)
          .map(item => ({
            id: String(item.league?.id ?? ''),
            name: item.league?.name ?? '',
            logo: item.league?.logo ?? '',
            subtitle: item.country?.name ?? '',
          }))
          .filter(item => item.id && item.name);
      }

      // players
      const payload = await searchPlayersByName(debouncedQuery, season, signal);
      const items = mapPlayerSearchResults(payload, appEnv.followsSearchResultsLimit);
      return items.map(item => ({
        id: item.playerId,
        name: item.playerName,
        logo: item.playerPhoto,
        subtitle: item.teamName,
      }));
    },
  });

  return {
    query,
    setQuery,
    results: searchQuery.data ?? [],
    isLoading: searchQuery.isLoading && hasEnoughChars,
    hasEnoughChars,
    debouncedQuery,
  };
}
