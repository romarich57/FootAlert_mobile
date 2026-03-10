// Fonctions pures de transformation et mapping pour l'overview d'équipe
// Statuts de match live et à venir selon l'API-Football
const LIVE_STATUSES = new Set(['1H', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);
const UPCOMING_STATUSES = new Set(['TBD', 'NS']);
// --- Utilitaires de conversion de types ---
export function toId(value) {
    if (value === null || typeof value === 'undefined') {
        return null;
    }
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}
export function toText(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}
export function toNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
export function toParsedFloat(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const parsed = Number.parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
}
function toSortableTimestamp(value) {
    if (!value) {
        return Number.MAX_SAFE_INTEGER;
    }
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}
function toRounded(value, precision) {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
}
// --- Mappers de matchs / fixtures ---
function classifyTeamMatchStatus(shortStatus) {
    const normalizedStatus = toText(shortStatus)?.toUpperCase() ?? '';
    if (LIVE_STATUSES.has(normalizedStatus)) {
        return 'live';
    }
    if (UPCOMING_STATUSES.has(normalizedStatus)) {
        return 'upcoming';
    }
    return 'finished';
}
function toStatusLabel(dto) {
    return toText(dto.fixture?.status?.long) ?? toText(dto.fixture?.status?.short);
}
export function mapFixtureToTeamMatch(dto) {
    return {
        fixtureId: toId(dto.fixture?.id) ?? '',
        leagueId: toId(dto.league?.id),
        leagueName: toText(dto.league?.name),
        leagueLogo: toText(dto.league?.logo),
        date: toText(dto.fixture?.date),
        round: toText(dto.league?.round),
        venue: toText(dto.fixture?.venue?.name),
        status: classifyTeamMatchStatus(dto.fixture?.status?.short),
        statusLabel: toStatusLabel(dto),
        minute: toNumber(dto.fixture?.status?.elapsed),
        homeTeamId: toId(dto.teams?.home?.id),
        homeTeamName: toText(dto.teams?.home?.name),
        homeTeamLogo: toText(dto.teams?.home?.logo),
        awayTeamId: toId(dto.teams?.away?.id),
        awayTeamName: toText(dto.teams?.away?.name),
        awayTeamLogo: toText(dto.teams?.away?.logo),
        homeGoals: toNumber(dto.goals?.home),
        awayGoals: toNumber(dto.goals?.away),
    };
}
export function mapFixturesToTeamMatches(payload) {
    const all = [...payload]
        .map(mapFixtureToTeamMatch)
        .filter(match => match.fixtureId.length > 0)
        .sort((first, second) => toSortableTimestamp(first.date) - toSortableTimestamp(second.date));
    return {
        all,
        upcoming: all.filter(match => match.status === 'upcoming'),
        past: [...all]
            .filter(match => match.status === 'finished')
            .sort((first, second) => toSortableTimestamp(second.date) - toSortableTimestamp(first.date)),
    };
}
function resolveFormResult(match, teamId) {
    const homeTeamId = match.homeTeamId;
    const awayTeamId = match.awayTeamId;
    if (!homeTeamId || !awayTeamId || (homeTeamId !== teamId && awayTeamId !== teamId)) {
        return '';
    }
    if (match.homeGoals === null || match.awayGoals === null) {
        return '';
    }
    const goalDelta = match.homeGoals - match.awayGoals;
    if (goalDelta === 0) {
        return 'D';
    }
    const isHome = homeTeamId === teamId;
    return isHome ? (goalDelta > 0 ? 'W' : 'L') : (goalDelta < 0 ? 'W' : 'L');
}
export function mapRecentTeamForm(matches, teamId, limit = 5) {
    return matches
        .filter(match => match.status === 'finished')
        .sort((first, second) => toSortableTimestamp(second.date) - toSortableTimestamp(first.date))
        .slice(0, limit)
        .map(match => {
        const isHome = match.homeTeamId === teamId;
        return {
            fixtureId: match.fixtureId,
            result: resolveFormResult(match, teamId),
            score: match.homeGoals === null || match.awayGoals === null
                ? null
                : `${match.homeGoals}-${match.awayGoals}`,
            opponentName: isHome ? match.awayTeamName : match.homeTeamName,
            opponentLogo: isHome ? match.awayTeamLogo : match.homeTeamLogo,
        };
    });
}
// --- Mappers de classement ---
export function mapStandings(payload, teamId) {
    const groups = (payload?.league?.standings ?? []).map(standingGroup => ({
        groupName: toText(standingGroup[0]?.group),
        rows: standingGroup.map(row => {
            const rowTeamId = toId(row.team?.id);
            return {
                rank: toNumber(row.rank),
                teamId: rowTeamId,
                teamName: toText(row.team?.name),
                teamLogo: toText(row.team?.logo),
                played: toNumber(row.all?.played),
                goalDiff: toNumber(row.goalsDiff),
                points: toNumber(row.points),
                isTargetTeam: rowTeamId === teamId,
                form: toText(row.form),
                update: toText(row.update),
                all: {
                    played: toNumber(row.all?.played),
                    win: toNumber(row.all?.win),
                    draw: toNumber(row.all?.draw),
                    lose: toNumber(row.all?.lose),
                    goalsFor: toNumber(row.all?.goals?.for),
                    goalsAgainst: toNumber(row.all?.goals?.against),
                },
                home: {
                    played: toNumber(row.home?.played),
                    win: toNumber(row.home?.win),
                    draw: toNumber(row.home?.draw),
                    lose: toNumber(row.home?.lose),
                    goalsFor: toNumber(row.home?.goals?.for),
                    goalsAgainst: toNumber(row.home?.goals?.against),
                },
                away: {
                    played: toNumber(row.away?.played),
                    win: toNumber(row.away?.win),
                    draw: toNumber(row.away?.draw),
                    lose: toNumber(row.away?.lose),
                    goalsFor: toNumber(row.away?.goals?.for),
                    goalsAgainst: toNumber(row.away?.goals?.against),
                },
            };
        }),
    }));
    return {
        leagueId: toId(payload?.league?.id),
        leagueName: toText(payload?.league?.name),
        leagueLogo: toText(payload?.league?.logo),
        groups,
    };
}
export function findTeamStandingRow(groups) {
    for (const group of groups) {
        const row = group.rows.find(item => item.isTargetTeam);
        if (row) {
            return row;
        }
    }
    return null;
}
export function buildSeasonStats(statistics, standingRow) {
    const scored = toNumber(statistics?.goals?.for?.total?.total) ?? standingRow?.all.goalsFor ?? null;
    const conceded = toNumber(statistics?.goals?.against?.total?.total) ?? standingRow?.all.goalsAgainst ?? null;
    return {
        rank: standingRow?.rank ?? null,
        points: standingRow?.points ?? null,
        played: toNumber(statistics?.fixtures?.played?.total) ?? standingRow?.played ?? null,
        goalDiff: standingRow?.goalDiff ??
            (scored !== null && conceded !== null ? scored - conceded : null),
        wins: toNumber(statistics?.fixtures?.wins?.total) ?? standingRow?.all.win ?? null,
        draws: toNumber(statistics?.fixtures?.draws?.total) ?? standingRow?.all.draw ?? null,
        losses: toNumber(statistics?.fixtures?.loses?.total) ?? standingRow?.all.lose ?? null,
        scored,
        conceded,
    };
}
// --- Helpers de classement et mini-tableau ---
export function buildMiniStandingRows(rows) {
    if (rows.length === 0) {
        return [];
    }
    const targetIndex = rows.findIndex(row => row.isTargetTeam);
    if (targetIndex < 0) {
        return rows.slice(0, 3);
    }
    let start = Math.max(0, targetIndex - 1);
    let end = Math.min(rows.length, start + 3);
    if (end - start < 3) {
        start = Math.max(0, end - 3);
    }
    return rows.slice(start, end);
}
export function buildCoachPerformance(coach, seasonStats) {
    if (!coach) {
        return null;
    }
    const played = seasonStats.played;
    const wins = seasonStats.wins;
    const draws = seasonStats.draws;
    const losses = seasonStats.losses;
    const points = seasonStats.points;
    const winRate = typeof played === 'number' && played > 0 && typeof wins === 'number'
        ? toRounded((wins / played) * 100, 1)
        : null;
    const pointsPerMatch = typeof played === 'number' && played > 0
        ? typeof points === 'number'
            ? toRounded(points / played, 2)
            : typeof wins === 'number' || typeof draws === 'number'
                ? toRounded((((wins ?? 0) * 3) + (draws ?? 0)) / played, 2)
                : null
        : null;
    return {
        coach,
        winRate,
        pointsPerMatch,
        played,
        wins,
        draws,
        losses,
    };
}
// --- Helpers trophées et historique ---
export function isWinnerTrophy(place) {
    const normalized = (place ?? '').toLowerCase();
    if (normalized.includes('runner') || normalized.includes('vice')) {
        return false;
    }
    return normalized.includes('winner') || normalized.includes('champion');
}
export function buildHistorySeasons(currentSeason, historySeasons) {
    const fallbackSeasons = Array.from({ length: 5 }, (_, index) => currentSeason - (index + 1));
    const raw = historySeasons && historySeasons.length > 0 ? historySeasons : fallbackSeasons;
    return Array.from(new Set(raw.filter(year => Number.isFinite(year) && year !== currentSeason)))
        .sort((first, second) => second - first)
        .slice(0, 5);
}
export function parseHistorySeasonsCsv(value) {
    if (!value) {
        return undefined;
    }
    const seasons = value
        .split(',')
        .map(item => item.trim())
        .map(item => Number(item))
        .filter(item => Number.isFinite(item));
    return seasons.length > 0 ? seasons : undefined;
}
export function resolveCurrentStandingRows(groups) {
    const targetGroup = groups.find(group => group.rows.some(row => row.isTargetTeam));
    return targetGroup?.rows ?? groups[0]?.rows ?? [];
}
// --- Gestion des erreurs Promise.allSettled ---
export function toSettledError(results, fallbackMessage) {
    for (const result of results) {
        if (result.status === 'rejected' && result.reason instanceof Error) {
            return result.reason;
        }
    }
    return new Error(fallbackMessage);
}
