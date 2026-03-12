import { buildReadStoreScopeKey, buildSnapshotWindow, decodeReadStoreScopeKey, } from '../lib/readStore/readThrough.js';
import { BOOTSTRAP_DEFAULT_DISCOVERY_LIMIT } from '../routes/bootstrap/schemas.js';
import { buildBootstrapPayload, buildBootstrapScopeKey, parseBootstrapScopeKey, } from '../routes/bootstrap/service.js';
import { buildCompetitionFullResponse } from '../routes/competitions/fullService.js';
import { buildMatchFullResponse } from '../routes/matches/fullService.js';
import { fetchPlayerFullPayload } from '../routes/players/fullService.js';
import { fetchTeamFullPayload } from '../routes/teams/fullService.js';
export const READ_STORE_DEFAULT_TIMEZONE = 'Europe/Paris';
export const READ_STORE_BOOTSTRAP_WARM_INTERVAL_MS = 5 * 60_000;
export const READ_STORE_REFRESH_POLL_INTERVAL_MS = 30_000;
export const READ_STORE_REFRESH_CLAIM_LIMIT = 10;
export const READ_STORE_OVERLAY_STALE_MS = 15_000;
export const READ_STORE_OVERLAY_EXPIRES_MS = 120_000;
export const HOTSET_COMPETITION_IDS = ['39', '140', '135', '78', '61', '2', '3'];
const defaultServices = {
    buildSnapshotWindow,
    buildBootstrapPayload,
    buildBootstrapScopeKey,
    parseBootstrapScopeKey,
    buildReadStoreScopeKey,
    decodeReadStoreScopeKey,
    fetchTeamFullPayload,
    fetchPlayerFullPayload,
    buildCompetitionFullResponse,
    buildMatchFullResponse,
};
export function resolveReadStoreRefreshServices(services) {
    return { ...defaultServices, ...services };
}
export async function persistWorkerMatchOverlay(input) {
    const isLive = input.payload.lifecycleState === 'live';
    const window = input.services.buildSnapshotWindow({
        staleAfterMs: isLive ? READ_STORE_OVERLAY_STALE_MS : 1_000,
        expiresAfterMs: isLive ? READ_STORE_OVERLAY_EXPIRES_MS : 1_000,
    });
    await input.readStore.upsertMatchLiveOverlay({
        matchId: input.matchId,
        payload: {
            fixture: input.payload.fixture,
            lifecycleState: input.payload.lifecycleState,
            context: input.payload.context,
            events: input.payload.events,
            statistics: input.payload.statistics,
            lineups: input.payload.lineups,
            absences: input.payload.absences,
            playersStats: input.payload.playersStats,
        },
        generatedAt: window.generatedAt,
        staleAt: window.staleAt,
        expiresAt: window.expiresAt,
        metadata: {
            lifecycleState: input.payload.lifecycleState,
            source: 'worker.refresh',
        },
    });
}
export { BOOTSTRAP_DEFAULT_DISCOVERY_LIMIT };
