import { buildBracketMatch, extractRoundName, isRawFixture } from './rawFixture.js';
import { classifyRound, detectCompetitionKind, getRoundOrder } from './roundClassifier.js';
export function buildCompetitionBracket(fixtures) {
    const groupNames = new Set();
    const knockoutRoundNames = new Set();
    const knockoutFixturesByRound = new Map();
    for (const rawFixture of fixtures) {
        if (!isRawFixture(rawFixture))
            continue;
        const roundName = extractRoundName(rawFixture);
        if (!roundName)
            continue;
        const classification = classifyRound(roundName);
        if (classification === 'group') {
            groupNames.add(roundName);
            continue;
        }
        if (classification === 'knockout') {
            knockoutRoundNames.add(roundName);
            const existing = knockoutFixturesByRound.get(roundName) ?? [];
            existing.push(rawFixture);
            knockoutFixturesByRound.set(roundName, existing);
        }
    }
    const competitionKind = detectCompetitionKind(groupNames, knockoutRoundNames);
    if (competitionKind === 'league') {
        return { competitionKind: 'league', bracket: null };
    }
    const bracket = [];
    for (const [roundName, roundFixtures] of knockoutFixturesByRound) {
        bracket.push({
            name: roundName,
            order: getRoundOrder(roundName),
            matches: roundFixtures
                .filter(isRawFixture)
                .map(buildBracketMatch)
                .filter((match) => match !== null),
        });
    }
    bracket.sort((a, b) => a.order - b.order);
    return { competitionKind, bracket };
}
