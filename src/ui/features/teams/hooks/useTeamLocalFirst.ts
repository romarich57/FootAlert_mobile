/**
 * Hook local-first pour les données d'équipe.
 *
 * Stratégie :
 * 1. Lecture synchrone SQLite → placeholderData immédiat
 * 2. Fetch réseau /v1/teams/:id/full en arrière-plan
 * 3. Écriture en DB à réception des données fraîches
 * 4. Fallback sur le cache stale si le réseau échoue
 *
 * Remplace `useTeamFull` quand le mode local-first est activé.
 */

import { useCallback } from 'react';

import { appEnv } from '@data/config/env';
import { buildTeamFullEntityId } from '@data/db/fullEntityIds';
import { useLocalFirstQuery } from '@data/db/useLocalFirstQuery';
import { fetchTeamFull } from '@data/endpoints/teamsApi';
import { isJestRuntime } from '@data/runtime/isJestRuntime';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import { queryKeys } from '@ui/shared/query/queryKeys';
import type { TeamFullResponsePayload } from '@domain/contracts/teamFull.types';

type UseTeamLocalFirstParams = {
  teamId: string;
  timezone: string;
  leagueId?: string | null;
  season?: number | null;
  enabled?: boolean;
};

export type TeamFullData = TeamFullResponsePayload['response'];

/** Durée max en ms avant de considérer le cache team stale — aligné sur TEAM_POLICY BFF (6h). */
const TEAM_FULL_MAX_AGE_MS = 6 * 60 * 60_000;

export function useTeamLocalFirst({
  teamId,
  timezone,
  leagueId = null,
  season = null,
  enabled = true,
}: UseTeamLocalFirstParams) {
  const fullEnabled =
    enabled &&
    !isJestRuntime() &&
    appEnv.mobileEnableSqliteLocalFirst &&
    appEnv.mobileEnableBffTeamFull &&
    Boolean(teamId);

  const fetchFn = useCallback(
    async (signal?: AbortSignal) => {
      const payload = await fetchTeamFull(
        { teamId, timezone, leagueId, season },
        signal,
      );
      return payload.response;
    },
    [teamId, timezone, leagueId, season],
  );

  const query = useLocalFirstQuery<TeamFullData>({
    queryKey: queryKeys.teams.full(teamId, timezone, leagueId, season),
    entityType: 'team',
    entityId: buildTeamFullEntityId(teamId, leagueId, season, timezone),
    maxAgeMs: TEAM_FULL_MAX_AGE_MS,
    fetchFn,
    enabled: fullEnabled,
    queryOptions: featureQueryOptions.teams.full,
  });

  return {
    ...query,
    isFullEnabled: fullEnabled,
  };
}
