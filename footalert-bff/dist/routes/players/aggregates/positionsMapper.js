import { POSITION_DEFINITIONS, POSITION_LOOKUP } from './contracts.js';
import { normalizeNumber, normalizeString, resolveSeasonStatistics, sumOrNull } from './seasonStats.js';
function createEmptyPositionsData() {
    return {
        primary: null,
        others: [],
        all: [],
    };
}
function normalizePositionToken(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .trim();
}
function resolvePositionDefinition(rawPosition) {
    const normalized = normalizePositionToken(rawPosition);
    const mappedKey = POSITION_LOOKUP[normalized];
    if (mappedKey && POSITION_DEFINITIONS[mappedKey]) {
        return POSITION_DEFINITIONS[mappedKey];
    }
    if (normalized.includes('leftwing'))
        return POSITION_DEFINITIONS.lw;
    if (normalized.includes('rightwing'))
        return POSITION_DEFINITIONS.rw;
    if (normalized.includes('wingback')) {
        if (normalized.startsWith('r'))
            return POSITION_DEFINITIONS.rwb;
        return POSITION_DEFINITIONS.lwb;
    }
    if (normalized.includes('midfielder'))
        return POSITION_DEFINITIONS.cm;
    if (normalized.includes('defender') || normalized.includes('defence'))
        return POSITION_DEFINITIONS.cb;
    if (normalized.includes('striker') || normalized.includes('forward'))
        return POSITION_DEFINITIONS.st;
    if (normalized.includes('attacker') || normalized.includes('attaquant'))
        return POSITION_DEFINITIONS.att;
    return null;
}
function comparePositionPoints(first, second) {
    if (second.score !== first.score) {
        return second.score - first.score;
    }
    const firstAppearances = first.appearances ?? Number.NEGATIVE_INFINITY;
    const secondAppearances = second.appearances ?? Number.NEGATIVE_INFINITY;
    if (secondAppearances !== firstAppearances) {
        return secondAppearances - firstAppearances;
    }
    const firstMinutes = first.minutes ?? Number.NEGATIVE_INFINITY;
    const secondMinutes = second.minutes ?? Number.NEGATIVE_INFINITY;
    if (secondMinutes !== firstMinutes) {
        return secondMinutes - firstMinutes;
    }
    return first.label.localeCompare(second.label);
}
export function mapPlayerDetailsToPositions(dto, season) {
    const statsRows = resolveSeasonStatistics(dto.statistics, season);
    if (statsRows.length === 0) {
        return createEmptyPositionsData();
    }
    const accumulators = new Map();
    statsRows.forEach(statRow => {
        const rawPosition = normalizeString(statRow.games?.position);
        if (!rawPosition) {
            return;
        }
        const definition = resolvePositionDefinition(rawPosition);
        if (!definition) {
            return;
        }
        const appearances = normalizeNumber(statRow.games?.appearences);
        const minutes = normalizeNumber(statRow.games?.minutes);
        const rowScore = (appearances ?? 0) * 1000 + (minutes ?? 0);
        const current = accumulators.get(definition.id);
        if (!current) {
            accumulators.set(definition.id, {
                definition,
                label: rawPosition,
                labelScore: rowScore,
                appearances,
                minutes,
                score: rowScore,
            });
            return;
        }
        current.appearances = sumOrNull(current.appearances, appearances);
        current.minutes = sumOrNull(current.minutes, minutes);
        current.score += rowScore;
        if (rowScore > current.labelScore && rawPosition) {
            current.label = rawPosition;
            current.labelScore = rowScore;
        }
    });
    const all = Array.from(accumulators.values())
        .map(item => ({
        id: item.definition.id,
        code: item.definition.code,
        shortLabel: item.definition.shortLabel,
        label: item.label,
        x: item.definition.x,
        y: item.definition.y,
        appearances: item.appearances,
        minutes: item.minutes,
        score: item.score,
        isPrimary: false,
    }))
        .sort(comparePositionPoints)
        .map((item, index) => ({
        ...item,
        isPrimary: index === 0,
    }));
    return {
        primary: all[0] ?? null,
        others: all.slice(1),
        all,
    };
}
