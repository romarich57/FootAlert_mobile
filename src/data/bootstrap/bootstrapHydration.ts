import type { QueryClient } from '@tanstack/react-query';
import { InteractionManager } from 'react-native';

import { appEnv } from '@data/config/env';
import {
  getBootstrapSnapshot,
  upsertBootstrapSnapshot,
} from '@data/db/bootstrapSnapshotStore';
import { upsertMatchesByDate } from '@data/db/matchesByDateStore';
import { fetchMatchFull } from '@data/endpoints/matchesApi';
import { fetchTeamFull } from '@data/endpoints/teamsApi';
import { fetchPlayerFull } from '@data/endpoints/playersApi';
import { fetchCompetitionFull } from '@data/endpoints/competitionsApi';
import {
  hasLiveMatches,
  mapFixtureToMatchItem,
  mapFixturesToSections,
} from '@data/mappers/fixturesMapper';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import type { BootstrapPayload, BootstrapWarmEntityRef } from '@domain/contracts/bootstrap.types';
import type { MatchesQueryResult } from '@domain/contracts/matches.types';
import { queryKeys } from '@data/query/queryKeys';
import type { FollowedPlayerCard, FollowedTeamCard } from '@domain/contracts/follows.types';

type BootstrapHydrationContext = {
  queryClient: QueryClient;
  payload: BootstrapPayload;
  followedTeamIds: string[];
  followedPlayerIds: string[];
};

function toOnboardingCompetitionCards(payload: BootstrapPayload) {
  return payload.topCompetitions.map(item => ({
    id: item.competitionId,
    name: item.competitionName,
    logo: item.competitionLogo,
    subtitle: item.country,
  }));
}

function buildMatchesResult(payload: BootstrapPayload): MatchesQueryResult {
  const sections = mapFixturesToSections(payload.matchesToday);

  return {
    sections,
    requestDurationMs: 0,
    fetchedAt: payload.generatedAt,
    hasLiveMatches: hasLiveMatches(sections),
  };
}

function persistMatchesByDate(payload: BootstrapPayload): void {
  if (!appEnv.mobileEnableSqliteLocalFirst || payload.matchesToday.length === 0) {
    return;
  }

  upsertMatchesByDate(
    payload.date,
    payload.matchesToday.map(fixture => {
      const mapped = mapFixtureToMatchItem(fixture);
      return {
        matchId: mapped.fixtureId,
        leagueId: mapped.competitionId,
        status: mapped.status,
        data: mapped,
      };
    }),
  );
}

function setFollowedCardsCache(
  queryClient: QueryClient,
  payload: BootstrapPayload,
  followedTeamIds: string[],
  followedPlayerIds: string[],
): void {
  if (followedTeamIds.length > 0 && payload.followedTeamCards.length > 0) {
    const sortedTeamIds = [...followedTeamIds].sort();
    queryClient.setQueryData<FollowedTeamCard[]>(
      queryKeys.follows.followedTeamCards(sortedTeamIds, payload.timezone),
      payload.followedTeamCards,
    );
  }

  if (followedPlayerIds.length > 0 && payload.followedPlayerCards.length > 0) {
    const sortedPlayerIds = [...followedPlayerIds].sort();
    queryClient.setQueryData<FollowedPlayerCard[]>(
      queryKeys.follows.followedPlayerCards(sortedPlayerIds, payload.season),
      payload.followedPlayerCards,
    );
  }
}

function setDiscoveryCache(queryClient: QueryClient, payload: BootstrapPayload): void {
  const teamLimit = Math.max(payload.discovery.teams.items.length, 1);
  const playerLimit = Math.max(payload.discovery.players.items.length, 1);

  queryClient.setQueryData(
    queryKeys.follows.discovery('teams', teamLimit),
    payload.discovery.teams,
  );
  queryClient.setQueryData(
    queryKeys.follows.discovery('players', playerLimit),
    payload.discovery.players,
  );
}

export function buildBootstrapSnapshotKey(input: {
  date: string;
  timezone: string;
  season: number;
  followedTeamIds: string[];
  followedPlayerIds: string[];
  discoveryLimit: number;
}): string {
  const teamKey = [...input.followedTeamIds].sort().join(',');
  const playerKey = [...input.followedPlayerIds].sort().join(',');
  return [
    input.date,
    input.timezone,
    String(input.season),
    String(input.discoveryLimit),
    teamKey,
    playerKey,
  ].join('|');
}

export function hydrateBootstrapIntoQueryCache({
  queryClient,
  payload,
  followedTeamIds,
  followedPlayerIds,
}: BootstrapHydrationContext): void {
  queryClient.setQueryData(queryKeys.matches(payload.date, payload.timezone), buildMatchesResult(payload));

  if (payload.competitionsCatalog.length > 0) {
    queryClient.setQueryData(
      queryKeys.competitions.catalog(),
      payload.competitionsCatalog,
    );
  }

  queryClient.setQueryData(
    ['onboarding', 'trends', 'competitions', payload.season],
    toOnboardingCompetitionCards(payload),
  );

  setFollowedCardsCache(queryClient, payload, followedTeamIds, followedPlayerIds);
  setDiscoveryCache(queryClient, payload);
  persistMatchesByDate(payload);
}

export function writeBootstrapSnapshot(
  snapshotKey: string,
  payload: BootstrapPayload,
): void {
  if (!appEnv.mobileEnableSqliteLocalFirst) {
    return;
  }

  upsertBootstrapSnapshot(snapshotKey, payload);
}

export function readBootstrapSnapshot(snapshotKey: string): BootstrapPayload | null {
  if (!appEnv.mobileEnableSqliteLocalFirst) {
    return null;
  }

  return getBootstrapSnapshot(snapshotKey)?.payload ?? null;
}

/**
 * Nombre max de refs à prefetch en idle pour ne pas saturer le réseau au boot.
 * Les refs sont déjà triées par priorité côté BFF.
 */
const WARM_PREFETCH_MAX = 20;
const WARM_PREFETCH_CONCURRENCY = 3;

/**
 * Prefetch les entités chaudes identifiées par le bootstrap, en idle priority.
 * Ne bloque pas le rendu, ne lance que des queries qui ne sont pas déjà en cache.
 */
export function prefetchWarmEntityRefs(input: {
  queryClient: QueryClient;
  refs: BootstrapWarmEntityRef[];
  timezone: string;
  season: number;
  signal?: AbortSignal;
}): void {
  const { queryClient, refs, timezone, season, signal } = input;
  if (refs.length === 0) {
    return;
  }

  const refsToWarm = refs.slice(0, WARM_PREFETCH_MAX);

  InteractionManager.runAfterInteractions(() => {
    const telemetry = getMobileTelemetry();
    let prefetched = 0;
    let skipped = 0;

    const processBatch = async (batch: BootstrapWarmEntityRef[]) => {
      await Promise.allSettled(
        batch.map(async ref => {
          if (signal?.aborted) return;

          try {
            switch (ref.kind) {
              case 'team': {
                const key = queryKeys.teams.full(ref.id, timezone);
                if (queryClient.getQueryData(key)) { skipped++; return; }
                await queryClient.prefetchQuery({
                  queryKey: key,
                  queryFn: () => fetchTeamFull({ teamId: ref.id, timezone }, signal),
                  staleTime: 60_000,
                });
                prefetched++;
                break;
              }
              case 'player': {
                const key = queryKeys.players.full(ref.id, season);
                if (queryClient.getQueryData(key)) { skipped++; return; }
                await queryClient.prefetchQuery({
                  queryKey: key,
                  queryFn: () => fetchPlayerFull(ref.id, season, signal),
                  staleTime: 60_000,
                });
                prefetched++;
                break;
              }
              case 'competition': {
                const leagueId = Number.parseInt(ref.id, 10);
                if (!Number.isFinite(leagueId)) { skipped++; return; }
                const key = queryKeys.competitions.full(ref.id, season);
                if (queryClient.getQueryData(key)) { skipped++; return; }
                await queryClient.prefetchQuery({
                  queryKey: key,
                  queryFn: () => fetchCompetitionFull(leagueId, season, signal),
                  staleTime: 120_000,
                });
                prefetched++;
                break;
              }
              case 'match': {
                const key = queryKeys.matchesFull(ref.id, timezone);
                if (queryClient.getQueryData(key)) { skipped++; return; }
                await queryClient.prefetchQuery({
                  queryKey: key,
                  queryFn: () => fetchMatchFull({ fixtureId: ref.id, timezone, signal }),
                  staleTime: 30_000,
                });
                prefetched++;
                break;
              }
            }
          } catch {
            // Erreurs individuelles silencieuses — le prefetch est best-effort.
          }
        }),
      );
    };

    // Traiter par lots pour limiter la concurrence réseau
    const processAll = async () => {
      for (let i = 0; i < refsToWarm.length; i += WARM_PREFETCH_CONCURRENCY) {
        if (signal?.aborted) break;
        const batch = refsToWarm.slice(i, i + WARM_PREFETCH_CONCURRENCY);
        await processBatch(batch);
      }

      telemetry.trackEvent('bootstrap.warm_prefetch.complete', {
        total: refsToWarm.length,
        prefetched,
        skipped,
      });
    };

    processAll().catch(() => undefined);
  });
}
