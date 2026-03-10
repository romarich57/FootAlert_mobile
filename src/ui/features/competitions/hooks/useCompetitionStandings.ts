import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import {
  getNormalizedStandings,
  upsertNormalizedStandings,
} from '@data/db/standingsStore';
import { fetchLeagueStandings } from '@data/endpoints/competitionsApi';
import { mapStandingDtoToGroups } from '@data/mappers/competitionsMapper';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import type { StandingGroup } from '../types/competitions.types';

import { loadCompetitionFullPayload } from './competitionFullQuery';

export function useCompetitionStandings(
  leagueId: number | undefined,
  season: number | undefined,
) {
  const queryClient = useQueryClient();
  const sqliteStandings = useMemo(() => {
    if (
      !appEnv.mobileEnableSqliteLocalFirst ||
      typeof leagueId !== 'number' ||
      typeof season !== 'number'
    ) {
      return [];
    }

    return getNormalizedStandings(String(leagueId), season);
  }, [leagueId, season]);

  return useQuery<StandingGroup[], Error>({
    queryKey: queryKeys.competitions.standings(leagueId, season),
    queryFn: async ({ signal }) => {
      if (!leagueId || !season) {
        return [];
      }

      try {
        if (appEnv.mobileEnableBffCompetitionFull) {
          const payload = await loadCompetitionFullPayload(queryClient, leagueId, season);
          if (payload?.standings) {
            const groups = mapStandingDtoToGroups(payload.standings);
            if (appEnv.mobileEnableSqliteLocalFirst) {
              upsertNormalizedStandings(String(leagueId), season, groups);
            }
            return groups;
          }
          if (payload?.competitionKind === 'cup') {
            return [];
          }
        }

        const dto = await fetchLeagueStandings(leagueId, season, signal);
        const groups = mapStandingDtoToGroups(dto);
        if (appEnv.mobileEnableSqliteLocalFirst) {
          upsertNormalizedStandings(String(leagueId), season, groups);
        }
        return groups;
      } catch (error) {
        if (sqliteStandings.length > 0) {
          return sqliteStandings;
        }

        throw error;
      }
    },
    enabled: !!leagueId && !!season,
    placeholderData: previousData =>
      previousData ?? (sqliteStandings.length > 0 ? sqliteStandings : undefined),
    ...featureQueryOptions.competitions.standings,
  });
}
