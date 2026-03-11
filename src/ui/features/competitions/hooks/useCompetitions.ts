import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { mapLeagueDtoToCompetition } from '@data/mappers/competitionsMapper';
import { fetchAllLeagues, searchLeaguesByName } from '@data/endpoints/competitionsApi';
import { fetchCompetitionTrends } from '@data/endpoints/followsApi';
import type { BootstrapTopCompetition } from '@domain/contracts/bootstrap.types';
import type {
  Competition,
  CountryWithCompetitions,
} from '@ui/features/competitions/types/competitions.types';
import { queryKeys } from '@ui/shared/query/queryKeys';

const SUGGESTED_LEAGUE_IDS = ['135', '78', '39', '140', '61'];
const SEARCH_DEBOUNCE_MS = 300;
const COMPETITION_TRENDS_STALE_TIME = 5 * 60_000;

function mapTrendCompetitionToCompetition(
  trend: BootstrapTopCompetition | null | undefined,
): Competition | null {
  if (!trend?.competitionId || !trend.competitionName || !trend.type || !trend.country) {
    return null;
  }

  return {
    id: trend.competitionId,
    name: trend.competitionName,
    logo: trend.competitionLogo || '',
    type: trend.type,
    countryName: trend.country,
  };
}

function dedupeCompetitions(competitions: Competition[]): Competition[] {
  const seenIds = new Set<string>();

  return competitions.filter(competition => {
    if (seenIds.has(competition.id)) {
      return false;
    }

    seenIds.add(competition.id);
    return true;
  });
}

export function useCompetitions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const normalizedSearchTerm = searchTerm.trim();

  useEffect(() => {
    if (!normalizedSearchTerm) {
      setDebouncedSearchTerm('');
      return;
    }

    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(normalizedSearchTerm);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [normalizedSearchTerm]);

  const catalogQuery = useQuery({
    queryKey: queryKeys.competitions.catalog(),
    queryFn: async ({ signal }) => {
      return fetchAllLeagues(signal);
    },
    staleTime: 10 * 60_000,
  });

  const searchQuery = useQuery({
    queryKey: queryKeys.competitions.search(debouncedSearchTerm),
    queryFn: async ({ signal }) => {
      if (!debouncedSearchTerm) {
        return [];
      }

      return searchLeaguesByName(debouncedSearchTerm, signal);
    },
    enabled: debouncedSearchTerm.length > 0,
    staleTime: 60_000,
  });

  const trendsQuery = useQuery({
    queryKey: queryKeys.competitions.trends(),
    queryFn: async ({ signal }) => fetchCompetitionTrends(signal),
    staleTime: COMPETITION_TRENDS_STALE_TIME,
  });

  const allCompetitions = useMemo(() => {
    return (catalogQuery.data ?? [])
      .map(dto => mapLeagueDtoToCompetition(dto))
      .filter(Boolean) as Competition[];
  }, [catalogQuery.data]);

  const catalogCompetitionsById = useMemo(() => {
    return new Map(allCompetitions.map(competition => [competition.id, competition]));
  }, [allCompetitions]);

  const countries = useMemo(() => {
    const grouped = new Map<string, CountryWithCompetitions>();

    (catalogQuery.data ?? []).forEach(dto => {
      const competition = mapLeagueDtoToCompetition(dto);
      if (!competition) {
        return;
      }

      const countryName = dto.country.name;
      if (!grouped.has(countryName)) {
        grouped.set(countryName, {
          name: countryName,
          code: dto.country.code,
          flag: dto.country.flag,
          competitions: [],
        });
      }

      grouped.get(countryName)?.competitions.push(competition);
    });

    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [catalogQuery.data]);

  const suggestedCompetitions = useMemo(() => {
    const trendCompetitions = (trendsQuery.data ?? [])
      .map(trend => {
        return (
          catalogCompetitionsById.get(trend.competitionId) ??
          mapTrendCompetitionToCompetition(trend)
        );
      })
      .filter(Boolean) as Competition[];

    if (trendCompetitions.length > 0) {
      return dedupeCompetitions(trendCompetitions);
    }

    return allCompetitions.filter(competition =>
      SUGGESTED_LEAGUE_IDS.includes(competition.id),
    );
  }, [allCompetitions, catalogCompetitionsById, trendsQuery.data]);

  const searchResults = useMemo(() => {
    if (!debouncedSearchTerm) {
      return [];
    }

    return (searchQuery.data ?? [])
      .map(dto => mapLeagueDtoToCompetition(dto))
      .filter(Boolean) as Competition[];
  }, [debouncedSearchTerm, searchQuery.data]);

  const searchLeagues = useCallback(async (query: string) => {
    setSearchTerm(query);
  }, []);

  const refresh = useCallback(async () => {
    await catalogQuery.refetch();
  }, [catalogQuery]);

  const lastUpdatedAt = useMemo(() => {
    const maxUpdatedAt = Math.max(
      catalogQuery.dataUpdatedAt,
      searchQuery.dataUpdatedAt,
      trendsQuery.dataUpdatedAt,
    );
    return maxUpdatedAt > 0 ? maxUpdatedAt : null;
  }, [catalogQuery.dataUpdatedAt, searchQuery.dataUpdatedAt, trendsQuery.dataUpdatedAt]);

  return {
    countries,
    suggestedCompetitions,
    searchResults,
    isSearching: searchQuery.isFetching,
    isLoading: catalogQuery.isLoading,
    lastUpdatedAt,
    searchLeagues,
    refresh,
  };
}
