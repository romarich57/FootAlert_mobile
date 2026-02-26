import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { buildTeamNameCandidates } from './helpers.js';
export async function fetchTeamTrophiesWithFallback(teamId, logger) {
    const trophiesById = await apiFootballGet(`/trophies?team=${encodeURIComponent(teamId)}`);
    if ((trophiesById.response?.length ?? 0) > 0) {
        return trophiesById;
    }
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
        const payload = await apiFootballGet(`/trophies?team=${encodeURIComponent(normalizedTeamParam)}`);
        return (payload.response?.length ?? 0) > 0 ? payload : null;
    };
    try {
        const teamLookup = await apiFootballGet(`/teams?id=${encodeURIComponent(teamId)}`);
        const teamName = teamLookup.response?.[0]?.team?.name?.trim();
        if (!teamName) {
            return trophiesById;
        }
        const teamNameCandidates = buildTeamNameCandidates(teamName);
        for (const teamNameCandidate of teamNameCandidates) {
            const trophiesByName = await tryTrophiesByTeamParam(teamNameCandidate);
            if (trophiesByName) {
                return trophiesByName;
            }
        }
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
