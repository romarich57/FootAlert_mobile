import type { TFunction } from 'i18next';

export function formatMatchRound(roundStr: string | null | undefined, t: TFunction): string {
    if (!roundStr) return '';

    const parts = roundStr.split(' - ');
    const textPart = parts[0].trim();
    const restPart = parts.length > 1 ? ` - ${parts.slice(1).join(' - ').trimEnd()}` : '';

    const mappings: Record<string, string> = {
        'regular season': t('matches.rounds.regularSeason'),
        'group stage': t('matches.rounds.groupStage'),
        'semi-finals': t('matches.rounds.semiFinals'),
        final: t('matches.rounds.final'),
        '16th finals': t('matches.rounds.roundOf16'),
        '8th finals': t('matches.rounds.roundOf16'),
        'quarter-finals': t('matches.rounds.quarterFinals'),
        '3rd place final': t('matches.rounds.thirdPlace'),
    };

    const translatedText = mappings[textPart.toLowerCase()] || textPart;
    return `${translatedText}${restPart}`.trim();
}
