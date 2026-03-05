import type { TFunction } from 'i18next';

function normalizeRoundToken(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function parseRoundOfValue(normalizedRound: string): number | null {
    const roundOfMatch = normalizedRound.match(/\bround of\s+(\d{1,3})\b/);
    if (roundOfMatch) {
        return Number.parseInt(roundOfMatch[1], 10);
    }

    const lastMatch = normalizedRound.match(/\blast\s+(\d{1,3})\b/);
    if (lastMatch) {
        return Number.parseInt(lastMatch[1], 10);
    }

    const fractionMatch = normalizedRound.match(/\b1\s*\/\s*(\d{1,3})\b/);
    if (fractionMatch) {
        return Number.parseInt(fractionMatch[1], 10) * 2;
    }

    const ordinalFinalsMatch = normalizedRound.match(/\b(\d{1,3})(?:st|nd|rd|th)\s+finals?\b/);
    if (ordinalFinalsMatch) {
        return Number.parseInt(ordinalFinalsMatch[1], 10) * 2;
    }

    const frenchFinalsMatch = normalizedRound.match(/\b(\d{1,3})(?:e|eme|er)?\s+de\s+finale\b/);
    if (frenchFinalsMatch) {
        return Number.parseInt(frenchFinalsMatch[1], 10) * 2;
    }

    return null;
}

export function formatMatchRound(roundStr: string | null | undefined, t: TFunction): string {
    if (!roundStr) return '';

    const parts = roundStr.split(' - ');
    const textPart = parts[0].trim();
    const restPart = parts.length > 1 ? ` - ${parts.slice(1).join(' - ').trimEnd()}` : '';
    const normalized = normalizeRoundToken(textPart);

    let translatedText = textPart;
    const roundOfValue = parseRoundOfValue(normalized);

    if (normalized.includes('regular season')) {
        translatedText = t('matches.rounds.regularSeason');
    } else if (normalized.includes('group stage')) {
        translatedText = t('matches.rounds.groupStage');
    } else if (normalized.includes('semi')) {
        translatedText = t('matches.rounds.semiFinals');
    } else if (normalized.includes('quarter') || normalized.includes('quart')) {
        translatedText = t('matches.rounds.quarterFinals');
    } else if (normalized.includes('3rd place') || normalized.includes('third place')) {
        translatedText = t('matches.rounds.thirdPlace');
    } else if (roundOfValue === 16) {
        translatedText = t('matches.rounds.roundOf16');
    } else if (roundOfValue === 32) {
        translatedText = t('matches.rounds.roundOf32');
    } else if (roundOfValue === 64) {
        translatedText = t('matches.rounds.roundOf64');
    } else if (roundOfValue === 128) {
        translatedText = t('matches.rounds.roundOf128');
    } else if (roundOfValue === 256) {
        translatedText = t('matches.rounds.roundOf256');
    } else if (/^finale?s?$/.test(normalized)) {
        translatedText = t('matches.rounds.final');
    }

    return `${translatedText}${restPart}`.trim();
}
