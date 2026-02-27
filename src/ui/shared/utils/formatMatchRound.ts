import type { TFunction } from 'i18next';

export function formatMatchRound(roundStr: string | null | undefined, t: TFunction): string {
    if (!roundStr) return '';

    const parts = roundStr.split(' - ');
    const textPart = parts[0].trim();
    const restPart = parts.length > 1 ? ` - ${parts.slice(1).join(' - ').trimEnd()}` : '';

    const mappings: Record<string, string> = {
        'regular season': t('matches.rounds.regularSeason', { defaultValue: 'Regular Season' }),
        'group stage': t('matches.rounds.groupStage', { defaultValue: 'Group Stage' }),
        'semi-finals': t('matches.rounds.semiFinals', { defaultValue: 'Semi-finals' }),
        'final': t('matches.rounds.final', { defaultValue: 'Final' }),
        '16th finals': t('matches.rounds.roundOf16', { defaultValue: '16th Finals' }),
        '8th finals': t('matches.rounds.roundOf16', { defaultValue: '8th Finals' }),
        'quarter-finals': t('matches.rounds.quarterFinals', { defaultValue: 'Quarter-finals' }),
        '3rd place final': t('matches.rounds.thirdPlace', { defaultValue: '3rd Place' }),
    };

    const translatedText = mappings[textPart.toLowerCase()] || textPart;
    return `${translatedText}${restPart}`.trim();
}
