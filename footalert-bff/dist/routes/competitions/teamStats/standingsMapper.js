import { toNumericId } from '../../teams/helpers.js';
function round(value, digits) {
    return Number(value.toFixed(digits));
}
function toSafeNumber(value) {
    return toNumericId(value) ?? 0;
}
function toPerMatch(total, played, digits = 2) {
    if (!Number.isFinite(total) || !Number.isFinite(played) || played <= 0) {
        return null;
    }
    return round(total / played, digits);
}
function parseForm(form) {
    const normalized = form.toUpperCase();
    let points = 0;
    let matchesInForm = 0;
    for (const char of normalized) {
        if (char === 'W') {
            points += 3;
            matchesInForm += 1;
            continue;
        }
        if (char === 'D') {
            points += 1;
            matchesInForm += 1;
            continue;
        }
        if (char === 'L') {
            matchesInForm += 1;
        }
    }
    return {
        formIndex: matchesInForm > 0 ? points : null,
        matchesInForm,
    };
}
function normalizeStandingSplit(raw) {
    return {
        played: toSafeNumber(raw?.played),
        win: toSafeNumber(raw?.win),
        draw: toSafeNumber(raw?.draw),
        lose: toSafeNumber(raw?.lose),
        goalsFor: toSafeNumber(raw?.goals?.for),
        goalsAgainst: toSafeNumber(raw?.goals?.against),
    };
}
export function normalizeStandingRows(payload) {
    const groups = payload.response?.[0]?.league?.standings ?? [];
    return groups.flatMap((group, groupIndex) => group
        .map(row => {
        const teamId = toNumericId(row.team?.id);
        if (!teamId) {
            return null;
        }
        return {
            rank: toSafeNumber(row.rank),
            teamId,
            teamName: typeof row.team?.name === 'string' ? row.team.name.trim() : '',
            teamLogo: typeof row.team?.logo === 'string' ? row.team.logo : '',
            points: toSafeNumber(row.points),
            goalsDiff: toSafeNumber(row.goalsDiff),
            played: toSafeNumber(row.all?.played),
            win: toSafeNumber(row.all?.win),
            draw: toSafeNumber(row.all?.draw),
            lose: toSafeNumber(row.all?.lose),
            goalsFor: toSafeNumber(row.all?.goals?.for),
            goalsAgainst: toSafeNumber(row.all?.goals?.against),
            group: typeof row.group === 'string' && row.group.trim().length > 0
                ? row.group.trim()
                : `Group ${groupIndex + 1}`,
            form: typeof row.form === 'string' ? row.form : '',
            home: normalizeStandingSplit(row.home),
            away: normalizeStandingSplit(row.away),
        };
    })
        .filter((row) => row !== null));
}
export function isGroupedCompetition(payload) {
    const groups = payload.response?.[0]?.league?.standings ?? [];
    return groups.length > 1;
}
export function mapStandingRowsToComputedTeamStats(rows) {
    return rows.map(row => {
        const pointsPerMatch = toPerMatch(row.points, row.played, 2);
        const winRate = row.played > 0 ? round((row.win / row.played) * 100, 1) : null;
        const goalsScoredPerMatch = toPerMatch(row.goalsFor, row.played, 2);
        const goalsConcededPerMatch = toPerMatch(row.goalsAgainst, row.played, 2);
        const goalDiffPerMatch = toPerMatch(row.goalsDiff, row.played, 2);
        const parsedForm = parseForm(row.form);
        const formPointsPerMatch = parsedForm.formIndex !== null && parsedForm.matchesInForm > 0
            ? round(parsedForm.formIndex / parsedForm.matchesInForm, 2)
            : null;
        const homePoints = row.home.win * 3 + row.home.draw;
        const awayPoints = row.away.win * 3 + row.away.draw;
        const homePPG = toPerMatch(homePoints, row.home.played, 2);
        const awayPPG = toPerMatch(awayPoints, row.away.played, 2);
        return {
            ...row,
            pointsPerMatch,
            winRate,
            goalsScoredPerMatch,
            goalsConcededPerMatch,
            goalDiffPerMatch,
            formIndex: parsedForm.formIndex,
            formPointsPerMatch,
            homePPG,
            awayPPG,
            homeGoalsFor: row.home.goalsFor,
            awayGoalsFor: row.away.goalsFor,
            homeGoalsAgainst: row.home.goalsAgainst,
            awayGoalsAgainst: row.away.goalsAgainst,
            deltaHomeAwayPPG: homePPG !== null && awayPPG !== null ? round(homePPG - awayPPG, 2) : null,
            deltaHomeAwayGoalsFor: row.home.goalsFor - row.away.goalsFor,
            deltaHomeAwayGoalsAgainst: row.away.goalsAgainst - row.home.goalsAgainst,
        };
    });
}
export function selectTopTeamsForAdvancedScope(rows, limit = 10) {
    return [...rows]
        .sort((first, second) => {
        if (first.points !== second.points) {
            return second.points - first.points;
        }
        if (first.goalsDiff !== second.goalsDiff) {
            return second.goalsDiff - first.goalsDiff;
        }
        if (first.goalsFor !== second.goalsFor) {
            return second.goalsFor - first.goalsFor;
        }
        return first.teamName.localeCompare(second.teamName);
    })
        .slice(0, limit);
}
