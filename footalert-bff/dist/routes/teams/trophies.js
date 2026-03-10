import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { buildTeamNameCandidates } from './helpers.js';
// Nombre maximum d'appels API dans le chemin de fallback (hors appel initial par id)
const MAX_TROPHY_FALLBACK_ATTEMPTS = 5;
export async function fetchTeamTrophiesWithFallback(teamId, logger) {
    const trophiesById = await apiFootballGet(`/trophies?team=${encodeURIComponent(teamId)}`);
    if ((trophiesById.response?.length ?? 0) > 0) {
        return trophiesById;
    }
    let fallbackApiCallCount = 0;
    const attemptedTeamParams = new Set();
    const tryTrophiesByTeamParam = async (teamParam) => {
        const normalizedTeamParam = teamParam.trim().replace(/\s+/g, ' ');
        if (!normalizedTeamParam) {
            return null;
        }
        const dedupeKey = normalizedTeamParam.toLowerCase();
        if (attemptedTeamParams.has(dedupeKey)) {
            return null;
        }
        attemptedTeamParams.add(dedupeKey);
        if (fallbackApiCallCount >= MAX_TROPHY_FALLBACK_ATTEMPTS) {
            return null;
        }
        fallbackApiCallCount += 1;
        const payload = await apiFootballGet(`/trophies?team=${encodeURIComponent(normalizedTeamParam)}`);
        return (payload.response?.length ?? 0) > 0 ? payload : null;
    };
    try {
        if (fallbackApiCallCount >= MAX_TROPHY_FALLBACK_ATTEMPTS) {
            return trophiesById;
        }
        fallbackApiCallCount += 1;
        const teamLookup = await apiFootballGet(`/teams?id=${encodeURIComponent(teamId)}`);
        const teamName = teamLookup.response?.[0]?.team?.name?.trim();
        if (!teamName) {
            return trophiesById;
        }
        const teamNameCandidates = buildTeamNameCandidates(teamName);
        for (const teamNameCandidate of teamNameCandidates) {
            if (fallbackApiCallCount >= MAX_TROPHY_FALLBACK_ATTEMPTS) {
                break;
            }
            const trophiesByName = await tryTrophiesByTeamParam(teamNameCandidate);
            if (trophiesByName) {
                return trophiesByName;
            }
        }
        if (fallbackApiCallCount >= MAX_TROPHY_FALLBACK_ATTEMPTS) {
            return trophiesById;
        }
        fallbackApiCallCount += 1;
        const teamSearch = await apiFootballGet(`/teams?search=${encodeURIComponent(teamName)}`);
        const searchCandidates = new Set();
        for (const entry of (teamSearch.response ?? []).slice(0, 8)) {
            const candidateName = entry?.team?.name?.trim();
            if (!candidateName) {
                continue;
            }
            for (const candidate of buildTeamNameCandidates(candidateName)) {
                searchCandidates.add(candidate);
            }
        }
        for (const searchCandidate of searchCandidates) {
            if (fallbackApiCallCount >= MAX_TROPHY_FALLBACK_ATTEMPTS) {
                break;
            }
            const trophiesBySearchName = await tryTrophiesByTeamParam(searchCandidate);
            if (trophiesBySearchName) {
                return trophiesBySearchName;
            }
        }
    }
    catch (outerErr) {
        logger.warn({ err: outerErr, teamId }, 'Team trophies name lookup failed');
        return trophiesById;
    }
    return trophiesById;
}
