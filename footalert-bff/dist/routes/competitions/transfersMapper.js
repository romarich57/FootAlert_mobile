export function toFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
export function toText(value, fallback = '') {
    if (typeof value !== 'string') {
        return fallback;
    }
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized || fallback;
}
function normalizeTransferKeyText(value) {
    return value
        .trim()
        .replace(/\s+/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}
export function toTransferTimestamp(value) {
    if (!value) {
        return Number.MIN_SAFE_INTEGER;
    }
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : Number.MIN_SAFE_INTEGER;
}
export function isDateInSeason(dateIso, season) {
    if (!dateIso) {
        return false;
    }
    const parsed = new Date(dateIso);
    if (Number.isNaN(parsed.getTime())) {
        return false;
    }
    const seasonStart = new Date(Date.UTC(season, 6, 1, 0, 0, 0));
    const seasonEnd = new Date(Date.UTC(season + 1, 5, 30, 23, 59, 59));
    return parsed >= seasonStart && parsed <= seasonEnd;
}
export function mapTransferTeamPayload(team) {
    const raw = (team ?? {});
    return {
        id: toFiniteNumber(raw.id) ?? 0,
        name: toText(raw.name, ''),
        logo: toText(raw.logo, ''),
    };
}
export function normalizeTransferDate(value) {
    const explicitDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (explicitDate) {
        return explicitDate;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed.toISOString().slice(0, 10);
}
export function buildPlayerStatsPath(type, leagueId, season) {
    return `/players/${type}?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`;
}
export function buildTransferKey(params) {
    const teamOutPart = params.teamOutId > 0
        ? `id:${params.teamOutId}`
        : `name:${normalizeTransferKeyText(params.teamOutName)}`;
    const teamInPart = params.teamInId > 0
        ? `id:${params.teamInId}`
        : `name:${normalizeTransferKeyText(params.teamInName)}`;
    return [
        params.playerId,
        normalizeTransferKeyText(params.playerName),
        normalizeTransferKeyText(params.transferType),
        teamOutPart,
        teamInPart,
        params.teamInInLeague ? '1' : '0',
        params.teamOutInLeague ? '1' : '0',
    ].join('|');
}
export function toSortedTransfers(value) {
    return Array.from(value.values()).sort((left, right) => {
        const leftDate = toTransferTimestamp(left.transfers?.[0]?.date ?? null);
        const rightDate = toTransferTimestamp(right.transfers?.[0]?.date ?? null);
        return rightDate - leftDate;
    });
}
