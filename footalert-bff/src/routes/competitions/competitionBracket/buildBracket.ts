import type { CompetitionBracketResult, KnockoutRound } from './contracts.js';
import { buildBracketMatch, extractRoundName, isRawFixture } from './rawFixture.js';
import { classifyRound, detectCompetitionKind, getRoundOrder } from './roundClassifier.js';

export function buildCompetitionBracket(fixtures: unknown[]): CompetitionBracketResult {
  const groupNames = new Set<string>();
  const knockoutRoundNames = new Set<string>();
  const knockoutFixturesByRound = new Map<string, unknown[]>();

  for (const rawFixture of fixtures) {
    if (!isRawFixture(rawFixture)) continue;

    const roundName = extractRoundName(rawFixture);
    if (!roundName) continue;

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

  const bracket: KnockoutRound[] = [];
  for (const [roundName, roundFixtures] of knockoutFixturesByRound) {
    bracket.push({
      name: roundName,
      order: getRoundOrder(roundName),
      matches: roundFixtures
        .filter(isRawFixture)
        .map(buildBracketMatch)
        .filter((match): match is NonNullable<typeof match> => match !== null),
    });
  }

  bracket.sort((a, b) => a.order - b.order);
  return { competitionKind, bracket };
}
