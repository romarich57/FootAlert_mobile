import type { ApiFootballMatchFullResponse } from '@data/endpoints/matchesApi';
import type { TeamFullResponsePayload } from '@domain/contracts/teamFull.types';
import { queryKeys } from '@data/query/queryKeys';

import { listFollowedEntityIds } from './followedEntitiesStore';
import {
  parseCompetitionFullEntityId,
  parsePlayerFullEntityId,
} from './fullEntityIds';
import type { HydrationMapping } from './hydrationBridge';

export function buildDefaultHydrationMappings(timezone: string): HydrationMapping[] {
  return [
    {
      entityType: 'team',
      priorityEntityIds: () => listFollowedEntityIds('team'),
      buildQueryKey: entity => {
        const payload = entity.data as TeamFullResponsePayload['response'] | null;
        if (!payload?.selection || !entity.id) {
          return null;
        }

        return queryKeys.teams.full(
          entity.id,
          timezone,
          payload.selection.leagueId ?? null,
          payload.selection.season ?? null,
        );
      },
    },
    {
      entityType: 'player',
      priorityEntityIds: () => listFollowedEntityIds('player'),
      buildQueryKey: entity => {
        const parsed = parsePlayerFullEntityId(entity.id);
        if (!parsed) {
          return null;
        }

        return queryKeys.players.full(parsed.playerId, parsed.season);
      },
    },
    {
      entityType: 'competition',
      priorityEntityIds: () => listFollowedEntityIds('competition'),
      buildQueryKey: entity => {
        const parsed = parseCompetitionFullEntityId(entity.id);
        if (!parsed) {
          return null;
        }

        return queryKeys.competitions.full(parsed.competitionId, parsed.season);
      },
    },
    {
      entityType: 'match',
      priorityEntityIds: () => listFollowedEntityIds('match'),
      buildQueryKey: entity => {
        const payload = entity.data as ApiFootballMatchFullResponse | null;
        const matchId =
          entity.id ||
          (typeof payload?.fixture?.fixture?.id === 'number'
            ? String(payload.fixture.fixture.id)
            : null);

        if (!matchId) {
          return null;
        }

        return queryKeys.matchesFull(matchId, timezone);
      },
    },
  ];
}
