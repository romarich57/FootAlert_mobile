import { env } from '../../config/env.js';
import { ReadStoreSnapshotInvalidBffError } from '../../lib/readStore/errors.js';
import { TEAM_POLICY } from '../../lib/readStore/policies.js';
import { readThroughSnapshot, buildReadStoreScopeKey } from '../../lib/readStore/readThrough.js';
import { getReadStore } from '../../lib/readStore/runtime.js';
import { parseOrThrow } from '../../lib/validation.js';
import { fetchTeamFullPayload } from './fullService.js';
import { teamFullQuerySchema, teamIdParamsSchema } from './schemas.js';
function validateTeamFullPayload(payload) {
    const response = payload.response;
    const details = response?.details?.response;
    const leagues = response?.leagues?.response;
    const selection = response?.selection;
    if (!Array.isArray(details)
        || details.length === 0
        || !Array.isArray(leagues)
        || leagues.length === 0
        || !selection
        || typeof selection.leagueId !== 'string'
        || selection.leagueId.trim().length === 0
        || typeof selection.season !== 'number'
        || !Number.isFinite(selection.season)) {
        throw new ReadStoreSnapshotInvalidBffError({
            entityKind: 'team_full',
            selection,
        });
    }
}
function isValidTeamFullPayload(payload) {
    try {
        validateTeamFullPayload(payload);
        return true;
    }
    catch {
        return false;
    }
}
export async function registerTeamFullRoute(app) {
    app.get('/v1/teams/:id/full', async (request) => {
        const params = parseOrThrow(teamIdParamsSchema, request.params);
        const query = parseOrThrow(teamFullQuerySchema, request.query);
        const scopeKey = buildReadStoreScopeKey({
            leagueId: query.leagueId ?? null,
            season: query.season ?? null,
            timezone: query.timezone,
            historySeasons: query.historySeasons ?? null,
        });
        const readStore = await getReadStore({
            databaseUrl: env.databaseUrl,
        });
        const result = await readThroughSnapshot({
            cacheKey: `team_full:${params.id}:${scopeKey}`,
            staleAfterMs: TEAM_POLICY.freshMs,
            expiresAfterMs: TEAM_POLICY.staleMs,
            logger: request.log,
            getSnapshot: () => readStore.getEntitySnapshot({
                entityKind: 'team_full',
                entityId: params.id,
                scopeKey,
            }),
            upsertSnapshot: input => readStore.upsertEntitySnapshot({
                entityKind: 'team_full',
                entityId: params.id,
                scopeKey,
                payload: input.payload,
                generatedAt: input.generatedAt,
                staleAt: input.staleAt,
                expiresAt: input.expiresAt,
                metadata: {
                    route: '/v1/teams/:id/full',
                },
            }),
            fetchFresh: () => fetchTeamFullPayload({
                teamId: params.id,
                leagueId: query.leagueId,
                season: query.season,
                timezone: query.timezone,
                historySeasons: query.historySeasons,
                logger: request.log,
            }),
            isSnapshotPayloadValid: isValidTeamFullPayload,
            validateFreshPayload: validateTeamFullPayload,
            queue: {
                store: readStore,
                target: {
                    entityKind: 'team_full',
                    entityId: params.id,
                    scopeKey,
                },
            },
        });
        return result.payload;
    });
}
