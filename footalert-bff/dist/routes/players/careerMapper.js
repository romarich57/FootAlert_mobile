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
function normalizeRating(value, precision = 2) {
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
function sumNullable(a, b) {
    if (a === null && b === null) {
        return null;
    }
    return (a ?? 0) + (b ?? 0);
}
function toSeasonYear(season) {
    if (!season) {
        return Number.NEGATIVE_INFINITY;
    }
    const firstYear = Number.parseInt(season.slice(0, 4), 10);
    if (Number.isFinite(firstYear)) {
        return firstYear;
    }
    const parsed = Number.parseInt(season, 10);
    return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}
function toComparableNumber(value, fallback = 0) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function hasPositiveNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
function hasValidRating(value) {
    if (!value) {
        return false;
    }
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed);
}
function hasCareerSeasonMeaningfulStats(season) {
    return (hasPositiveNumber(season.matches) ||
        hasPositiveNumber(season.goals) ||
        hasPositiveNumber(season.assists) ||
        hasValidRating(season.rating));
}
function compareCareerSeasonsDesc(first, second) {
    const firstYear = toSeasonYear(first.season);
    const secondYear = toSeasonYear(second.season);
    if (secondYear !== firstYear) {
        return secondYear - firstYear;
    }
    const firstMatches = toComparableNumber(first.matches, Number.NEGATIVE_INFINITY);
    const secondMatches = toComparableNumber(second.matches, Number.NEGATIVE_INFINITY);
    if (secondMatches !== firstMatches) {
        return secondMatches - firstMatches;
    }
    const firstGoals = toComparableNumber(first.goals, Number.NEGATIVE_INFINITY);
    const secondGoals = toComparableNumber(second.goals, Number.NEGATIVE_INFINITY);
    return secondGoals - firstGoals;
}
export function mapCareerSeasons(detailsDto) {
    if (!detailsDto.statistics) {
        return [];
    }
    return detailsDto.statistics
        .map(stat => ({
        season: stat.league?.season ? String(stat.league.season) : null,
        leagueId: toId(stat.league?.id),
        leagueName: normalizeString(stat.league?.name),
        team: {
            id: toId(stat.team?.id),
            name: normalizeString(stat.team?.name),
            logo: normalizeString(stat.team?.logo),
        },
        matches: normalizeNumber(stat.games?.appearences),
        goals: normalizeNumber(stat.goals?.total),
        assists: normalizeNumber(stat.goals?.assists),
        rating: normalizeRating(stat.games?.rating, 2),
    }))
        .sort(compareCareerSeasonsDesc);
}
export function dedupeCareerSeasons(seasons) {
    const aggregatedByCompetition = new Map();
    const seenSignaturesByCompetition = new Map();
    seasons.forEach((season, index) => {
        const seasonKey = season.season ?? `unknown-season-${index}`;
        const teamKey = season.team.id ?? season.team.name ?? `unknown-team-${index}`;
        const competitionKey = season.leagueId ?? season.leagueName ?? 'unknown-league';
        const key = `${seasonKey}-${teamKey}-${competitionKey}`;
        const signature = [
            season.matches ?? 'null',
            season.goals ?? 'null',
            season.assists ?? 'null',
            season.rating ?? 'null',
        ].join('|');
        let aggregate = aggregatedByCompetition.get(key);
        if (!aggregate) {
            aggregate = {
                ...season,
                matches: null,
                goals: null,
                assists: null,
                rating: null,
                weightedRatingTotal: 0,
                weightedRatingWeight: 0,
            };
            aggregatedByCompetition.set(key, aggregate);
            seenSignaturesByCompetition.set(key, new Set());
        }
        const signatures = seenSignaturesByCompetition.get(key);
        if (!signatures) {
            return;
        }
        if (signatures.has(signature)) {
            return;
        }
        signatures.add(signature);
        aggregate.matches = sumNullable(aggregate.matches, season.matches);
        aggregate.goals = sumNullable(aggregate.goals, season.goals);
        aggregate.assists = sumNullable(aggregate.assists, season.assists);
        if (season.rating) {
            const parsedRating = Number.parseFloat(season.rating);
            if (Number.isFinite(parsedRating)) {
                const appearances = toComparableNumber(season.matches, 0);
                const ratingWeight = appearances > 0 ? appearances : 1;
                aggregate.weightedRatingTotal += parsedRating * ratingWeight;
                aggregate.weightedRatingWeight += ratingWeight;
            }
        }
    });
    const dedupedByCompetition = Array.from(aggregatedByCompetition.values())
        .map(competition => {
        const weightedRatingTotal = competition.weightedRatingTotal;
        const weightedRatingWeight = competition.weightedRatingWeight;
        return {
            season: competition.season,
            leagueId: competition.leagueId,
            leagueName: competition.leagueName,
            team: competition.team,
            matches: competition.matches,
            goals: competition.goals,
            assists: competition.assists,
            rating: weightedRatingWeight > 0
                ? (weightedRatingTotal / weightedRatingWeight).toFixed(2)
                : null,
        };
    });
    const aggregatedBySeasonTeam = new Map();
    dedupedByCompetition.forEach((season, index) => {
        const seasonKey = season.season ?? `unknown-season-${index}`;
        const teamKey = season.team.id ?? season.team.name ?? `unknown-team-${index}`;
        const key = `${seasonKey}-${teamKey}`;
        const existing = aggregatedBySeasonTeam.get(key);
        if (!existing) {
            aggregatedBySeasonTeam.set(key, {
                ...season,
                weightedRatingTotal: 0,
                weightedRatingWeight: 0,
            });
        }
        else {
            existing.matches = sumNullable(existing.matches, season.matches);
            existing.goals = sumNullable(existing.goals, season.goals);
            existing.assists = sumNullable(existing.assists, season.assists);
        }
        const target = aggregatedBySeasonTeam.get(key);
        if (!target) {
            return;
        }
        if (season.rating) {
            const parsedRating = Number.parseFloat(season.rating);
            if (Number.isFinite(parsedRating)) {
                const appearances = toComparableNumber(season.matches, 0);
                const ratingWeight = appearances > 0 ? appearances : 1;
                target.weightedRatingTotal += parsedRating * ratingWeight;
                target.weightedRatingWeight += ratingWeight;
            }
        }
    });
    return Array.from(aggregatedBySeasonTeam.values())
        .map(item => {
        const weightedRatingTotal = item.weightedRatingTotal;
        const weightedRatingWeight = item.weightedRatingWeight;
        return {
            season: item.season,
            team: item.team,
            matches: item.matches,
            goals: item.goals,
            assists: item.assists,
            rating: weightedRatingWeight > 0
                ? (weightedRatingTotal / weightedRatingWeight).toFixed(2)
                : null,
        };
    })
        .filter(hasCareerSeasonMeaningfulStats)
        .sort(compareCareerSeasonsDesc);
}
export function aggregateCareerTeams(seasons) {
    const teamMap = new Map();
    seasons.forEach(season => {
        const teamKey = season.team.id ?? season.team.name ?? '';
        if (!teamKey) {
            return;
        }
        if (!teamMap.has(teamKey)) {
            teamMap.set(teamKey, {
                team: season.team,
                period: null,
                matches: null,
                goals: null,
                assists: null,
                firstSeason: Number.POSITIVE_INFINITY,
                lastSeason: Number.NEGATIVE_INFINITY,
            });
        }
        const team = teamMap.get(teamKey);
        if (!team) {
            return;
        }
        team.matches = sumNullable(team.matches, season.matches);
        team.goals = sumNullable(team.goals, season.goals);
        team.assists = sumNullable(team.assists, season.assists);
        const year = season.season ? Number.parseInt(season.season, 10) : Number.NaN;
        if (!Number.isNaN(year)) {
            team.firstSeason = Math.min(team.firstSeason, year);
            team.lastSeason = Math.max(team.lastSeason, year);
        }
    });
    return Array.from(teamMap.values())
        .map(team => {
        const hasValidRange = Number.isFinite(team.firstSeason) && Number.isFinite(team.lastSeason);
        const period = hasValidRange
            ? (team.firstSeason === team.lastSeason
                ? `${team.firstSeason}`
                : `${team.firstSeason} - ${team.lastSeason}`)
            : null;
        return {
            team: team.team,
            period,
            matches: team.matches,
            goals: team.goals,
            assists: team.assists,
        };
    })
        .sort((first, second) => {
        const firstEnd = toSeasonYear(first.period?.split(' - ')[1] ?? first.period ?? null);
        const secondEnd = toSeasonYear(second.period?.split(' - ')[1] ?? second.period ?? null);
        if (secondEnd !== firstEnd) {
            return secondEnd - firstEnd;
        }
        const firstMatches = toComparableNumber(first.matches, Number.NEGATIVE_INFINITY);
        const secondMatches = toComparableNumber(second.matches, Number.NEGATIVE_INFINITY);
        return secondMatches - firstMatches;
    });
}
