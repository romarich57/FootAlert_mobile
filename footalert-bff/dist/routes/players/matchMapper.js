function normalizeString(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function normalizeNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function normalizeRating(value, precision = 1) {
    if (value === null || value === undefined) {
        return null;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) {
        return null;
    }
    return parsed.toFixed(precision);
}
function toId(value) {
    if (value === null || value === undefined) {
        return null;
    }
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}
function extractPlayerStatisticsCandidates(performanceDto) {
    if (!Array.isArray(performanceDto?.players)) {
        return [];
    }
    const candidates = [];
    performanceDto.players.forEach(group => {
        const directEntry = group;
        if (directEntry.player || Array.isArray(directEntry.statistics)) {
            candidates.push(directEntry);
        }
        const nestedEntries = group.players;
        if (!Array.isArray(nestedEntries)) {
            return;
        }
        nestedEntries.forEach(entry => {
            if (entry.player || Array.isArray(entry.statistics)) {
                candidates.push(entry);
            }
        });
    });
    return candidates;
}
function resolvePrimaryFixtureStat(statistics) {
    if (!statistics || statistics.length === 0) {
        return null;
    }
    return [...statistics].sort((a, b) => {
        const aMinutes = normalizeNumber(a.games?.minutes) ?? 0;
        const bMinutes = normalizeNumber(b.games?.minutes) ?? 0;
        if (bMinutes !== aMinutes) {
            return bMinutes - aMinutes;
        }
        const aGoals = normalizeNumber(a.goals?.total) ?? 0;
        const bGoals = normalizeNumber(b.goals?.total) ?? 0;
        if (bGoals !== aGoals) {
            return bGoals - aGoals;
        }
        const aRating = Number.parseFloat(a.games?.rating ?? '');
        const bRating = Number.parseFloat(b.games?.rating ?? '');
        const safeARating = Number.isFinite(aRating) ? aRating : 0;
        const safeBRating = Number.isFinite(bRating) ? bRating : 0;
        return safeBRating - safeARating;
    })[0] ?? null;
}
export function mapPlayerMatchPerformance(playerId, teamId, fixtureDto, performanceDto) {
    const fixtureId = toId(fixtureDto.fixture?.id);
    if (!fixtureId || !fixtureDto.teams) {
        return null;
    }
    let playerStats = {
        minutes: null,
        rating: null,
        goals: null,
        assists: null,
        yellowCards: null,
        secondYellowCards: null,
        redCards: null,
        saves: null,
        penaltiesSaved: null,
        penaltiesMissed: null,
        isStarter: null,
    };
    if (performanceDto?.players) {
        const normalizedCandidates = extractPlayerStatisticsCandidates(performanceDto);
        const foundPlayer = normalizedCandidates.find(candidate => String(candidate.player?.id) === playerId);
        if (foundPlayer && foundPlayer.statistics && foundPlayer.statistics.length > 0) {
            const stat = resolvePrimaryFixtureStat(foundPlayer.statistics);
            if (stat) {
                playerStats = {
                    minutes: normalizeNumber(stat.games?.minutes),
                    rating: normalizeRating(stat.games?.rating, 1),
                    goals: normalizeNumber(stat.goals?.total),
                    assists: normalizeNumber(stat.goals?.assists),
                    yellowCards: normalizeNumber(stat.cards?.yellow),
                    secondYellowCards: normalizeNumber(stat.cards?.yellowred),
                    redCards: normalizeNumber(stat.cards?.red),
                    saves: normalizeNumber(stat.goals?.saves),
                    penaltiesSaved: normalizeNumber(stat.penalty?.saved),
                    penaltiesMissed: normalizeNumber(stat.penalty?.missed),
                    isStarter: typeof stat.games?.substitute === 'boolean'
                        ? stat.games.substitute === false
                        : null,
                };
            }
        }
    }
    return {
        fixtureId,
        date: normalizeString(fixtureDto.fixture?.date),
        playerTeamId: teamId,
        competition: {
            id: toId(fixtureDto.league?.id),
            name: normalizeString(fixtureDto.league?.name),
            logo: normalizeString(fixtureDto.league?.logo),
        },
        homeTeam: {
            id: toId(fixtureDto.teams.home?.id),
            name: normalizeString(fixtureDto.teams.home?.name),
            logo: normalizeString(fixtureDto.teams.home?.logo),
        },
        awayTeam: {
            id: toId(fixtureDto.teams.away?.id),
            name: normalizeString(fixtureDto.teams.away?.name),
            logo: normalizeString(fixtureDto.teams.away?.logo),
        },
        goalsHome: normalizeNumber(fixtureDto.goals?.home),
        goalsAway: normalizeNumber(fixtureDto.goals?.away),
        playerStats,
    };
}
