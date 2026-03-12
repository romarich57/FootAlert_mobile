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
export const HOTSET_MAX_TEAMS_PER_COMPETITION = 20;
export const HOTSET_COMPETITION_IDS = ['39', '140', '135', '78', '61'];
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function pushUniqueTeamSeedEntry(target, seenKeys, entry) {
    const key = `${entry.teamId}:${entry.leagueId}:${entry.season}`;
    if (seenKeys.has(key)) {
        return;
    }
    seenKeys.add(key);
    target.push(entry);
}
function pushUniquePlayerSeedEntry(target, seenKeys, entry) {
    const key = `${entry.playerId}:${entry.season}`;
    if (seenKeys.has(key)) {
        return;
    }
    seenKeys.add(key);
    target.push(entry);
}
function readPlayerId(value) {
    if (!isRecord(value)) {
        return null;
    }
    const directId = value.id;
    if (typeof directId === 'string' && directId.trim().length > 0) {
        return directId.trim();
    }
    if (typeof directId === 'number' && Number.isFinite(directId)) {
        return String(directId);
    }
    const nestedPlayer = value.player;
    if (!isRecord(nestedPlayer)) {
        return null;
    }
    const nestedId = nestedPlayer.id;
    if (typeof nestedId === 'string' && nestedId.trim().length > 0) {
        return nestedId.trim();
    }
    if (typeof nestedId === 'number' && Number.isFinite(nestedId)) {
        return String(nestedId);
    }
    return null;
}
export function extractTeamSeedEntriesFromCompetitionPayload(payload, competitionId, season) {
    const entries = [];
    const seenKeys = new Set();
    const standingsLeague = isRecord(payload.standings) && isRecord(payload.standings.league)
        ? payload.standings.league
        : null;
    const standingsGroups = standingsLeague?.standings;
    if (Array.isArray(standingsGroups)) {
        for (const group of standingsGroups) {
            if (!Array.isArray(group)) {
                continue;
            }
            for (const row of group) {
                if (!isRecord(row) || !isRecord(row.team)) {
                    continue;
                }
                const id = row.team.id;
                if ((typeof id === 'string' && id.trim().length > 0)
                    || (typeof id === 'number' && Number.isFinite(id))) {
                    pushUniqueTeamSeedEntry(entries, seenKeys, {
                        teamId: String(id).trim(),
                        leagueId: competitionId,
                        season,
                    });
                }
            }
        }
    }
    if (entries.length === 0 && Array.isArray(payload.matches)) {
        for (const match of payload.matches) {
            if (!isRecord(match) || !isRecord(match.teams)) {
                continue;
            }
            for (const side of ['home', 'away']) {
                const team = match.teams[side];
                if (!isRecord(team)) {
                    continue;
                }
                const id = team.id;
                if ((typeof id === 'string' && id.trim().length > 0)
                    || (typeof id === 'number' && Number.isFinite(id))) {
                    pushUniqueTeamSeedEntry(entries, seenKeys, {
                        teamId: String(id).trim(),
                        leagueId: competitionId,
                        season,
                    });
                }
            }
        }
    }
    return entries.slice(0, HOTSET_MAX_TEAMS_PER_COMPETITION);
}
export function extractPlayerSeedEntriesFromCompetitionPayload(payload, season) {
    const entries = [];
    const seenKeys = new Set();
    const bundles = [
        payload.playerStats.topScorers,
        payload.playerStats.topAssists,
        payload.playerStats.topYellowCards,
        payload.playerStats.topRedCards,
    ];
    for (const bundle of bundles) {
        if (!Array.isArray(bundle)) {
            continue;
        }
        for (const item of bundle) {
            const playerId = readPlayerId(item);
            if (!playerId) {
                continue;
            }
            pushUniquePlayerSeedEntry(entries, seenKeys, {
                playerId,
                season,
            });
        }
    }
    return entries;
}
export function extractPlayerSeedEntriesFromTeamPayload(payload, season) {
    const entries = [];
    const seenKeys = new Set();
    const squadResponse = payload.response?.squad?.response;
    const players = Array.isArray(squadResponse) && isRecord(squadResponse[0])
        ? squadResponse[0].players
        : [];
    if (!Array.isArray(players)) {
        return entries;
    }
    for (const player of players) {
        const playerId = readPlayerId(player);
        if (!playerId) {
            continue;
        }
        pushUniquePlayerSeedEntry(entries, seenKeys, {
            playerId,
            season,
        });
    }
    return entries;
}
export function isCompetitionFullPayloadComplete(payload) {
    return payload.competition !== null && Number.isFinite(payload.season);
}
export function isTeamFullPayloadComplete(payload) {
    const response = payload.response;
    const details = response?.details?.response;
    const leagues = response?.leagues?.response;
    const selection = response?.selection;
    return (Array.isArray(details)
        && details.length > 0
        && Array.isArray(leagues)
        && leagues.length > 0
        && isRecord(selection)
        && selection.leagueId !== null
        && selection.leagueId !== undefined
        && String(selection.leagueId).trim().length > 0
        && typeof selection.season === 'number'
        && Number.isFinite(selection.season));
}
export function isPlayerFullPayloadComplete(payload) {
    const response = payload.response;
    return (Array.isArray(response?.details?.response)
        && response.details.response.length > 0
        && Array.isArray(response?.seasons?.response)
        && response.seasons.response.length > 0
        && response?.overview?.response !== null
        && response?.overview?.response !== undefined);
}
export function isMatchFullPayloadComplete(payload) {
    return payload.fixture !== null && payload.fixture !== undefined;
}
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
