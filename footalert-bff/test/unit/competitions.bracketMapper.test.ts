import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCompetitionBracket,
  classifyRound,
  detectCompetitionKind,
} from '../../src/routes/competitions/bracketMapper.ts';

// --- classifyRound ---

test('classifyRound identifie correctement les rounds knockout', () => {
  assert.equal(classifyRound('Final'), 'knockout');
  assert.equal(classifyRound('Semi-Final'), 'knockout');
  assert.equal(classifyRound('Semi Final'), 'knockout');
  assert.equal(classifyRound('Quarter-Final'), 'knockout');
  assert.equal(classifyRound('Quarter Final'), 'knockout');
  assert.equal(classifyRound('Round of 16'), 'knockout');
  assert.equal(classifyRound('Round of 32'), 'knockout');
  assert.equal(classifyRound('Round of 64'), 'knockout');
  assert.equal(classifyRound('Round of 128'), 'knockout');
  assert.equal(classifyRound('Last 16'), 'knockout');
  assert.equal(classifyRound('Last 8'), 'knockout');
  assert.equal(classifyRound('Last 4'), 'knockout');
  assert.equal(classifyRound('8th Finals'), 'knockout');
  assert.equal(classifyRound('16th Finals'), 'knockout');
  assert.equal(classifyRound('32nd Finals'), 'knockout');
  assert.equal(classifyRound('64th Finals'), 'knockout');
  assert.equal(classifyRound('128th Finals'), 'knockout');
  assert.equal(classifyRound('1/8 Finals'), 'knockout');
  assert.equal(classifyRound('16e de finale'), 'knockout');
  assert.equal(classifyRound('32e de finale'), 'knockout');
  assert.equal(classifyRound('64e de finale'), 'knockout');
  assert.equal(classifyRound('4th Finals'), 'knockout');
  assert.equal(classifyRound('2nd Round'), 'knockout');
  assert.equal(classifyRound('3rd Round'), 'knockout');
  assert.equal(classifyRound('4th Round'), 'knockout');
  assert.equal(classifyRound('5th Round'), 'knockout');
  assert.equal(classifyRound('Elimination'), 'knockout');
});

test('classifyRound est insensible à la casse', () => {
  assert.equal(classifyRound('FINAL'), 'knockout');
  assert.equal(classifyRound('semi-final'), 'knockout');
  assert.equal(classifyRound('ROUND OF 16'), 'knockout');
});

test('classifyRound identifie correctement les rounds de groupe', () => {
  assert.equal(classifyRound('Group A'), 'group');
  assert.equal(classifyRound('Group Stage'), 'group');
  assert.equal(classifyRound('group b'), 'group');
});

test('classifyRound retourne unknown pour les rounds non reconnus', () => {
  assert.equal(classifyRound('Regular Season - 1'), 'unknown');
  assert.equal(classifyRound('Matchday 1'), 'unknown');
  assert.equal(classifyRound('Week 12'), 'unknown');
});

// --- detectCompetitionKind ---

test('detectCompetitionKind retourne league quand il ny a que des groupes', () => {
  const groupNames = new Set(['Group A', 'Group B']);
  const knockoutNames = new Set<string>();
  assert.equal(detectCompetitionKind(groupNames, knockoutNames), 'league');
});

test('detectCompetitionKind retourne cup quand il ny a que du knockout', () => {
  const groupNames = new Set<string>();
  const knockoutNames = new Set(['Quarter-Final', 'Semi-Final', 'Final']);
  assert.equal(detectCompetitionKind(groupNames, knockoutNames), 'cup');
});

test('detectCompetitionKind retourne mixed quand les deux sont présents', () => {
  const groupNames = new Set(['Group A', 'Group B']);
  const knockoutNames = new Set(['Round of 16', 'Quarter-Final', 'Final']);
  assert.equal(detectCompetitionKind(groupNames, knockoutNames), 'mixed');
});

test('detectCompetitionKind retourne league quand les deux sets sont vides', () => {
  assert.equal(detectCompetitionKind(new Set(), new Set()), 'league');
});

// --- buildCompetitionBracket ---

// Fixture helper : construit un fixture brut au format API-Football
function makeFixture(opts: {
  id: number;
  round: string;
  homeId: number;
  homeName: string;
  awayId: number;
  awayName: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
  penaltyHome?: number | null;
  penaltyAway?: number | null;
}): unknown {
  return {
    fixture: {
      id: opts.id,
      date: '2025-04-05T20:00:00+00:00',
      status: { short: opts.status },
    },
    league: { round: opts.round },
    teams: {
      home: { id: opts.homeId, name: opts.homeName, logo: 'home.png' },
      away: { id: opts.awayId, name: opts.awayName, logo: 'away.png' },
    },
    goals: { home: opts.homeGoals, away: opts.awayGoals },
    score: {
      penalty: {
        home: opts.penaltyHome ?? null,
        away: opts.penaltyAway ?? null,
      },
    },
  };
}

test('buildCompetitionBracket retourne league avec bracket null pour un championnat', () => {
  const fixtures = [
    makeFixture({ id: 1, round: 'Regular Season - 1', homeId: 10, homeName: 'PSG', awayId: 20, awayName: 'Lyon', homeGoals: 2, awayGoals: 1, status: 'FT' }),
    makeFixture({ id: 2, round: 'Regular Season - 2', homeId: 20, homeName: 'Lyon', awayId: 30, awayName: 'Nice', homeGoals: 0, awayGoals: 0, status: 'FT' }),
  ];
  const result = buildCompetitionBracket(fixtures);
  assert.equal(result.competitionKind, 'league');
  assert.equal(result.bracket, null);
});

test('buildCompetitionBracket retourne cup avec bracket pour une coupe sans groupes', () => {
  const fixtures = [
    makeFixture({ id: 1, round: 'Quarter-Final', homeId: 10, homeName: 'Arsenal', awayId: 20, awayName: 'Chelsea', homeGoals: 2, awayGoals: 1, status: 'FT' }),
    makeFixture({ id: 2, round: 'Semi-Final', homeId: 10, homeName: 'Arsenal', awayId: 30, awayName: 'Man City', homeGoals: 1, awayGoals: 0, status: 'FT' }),
    makeFixture({ id: 3, round: 'Final', homeId: 10, homeName: 'Arsenal', awayId: 40, awayName: 'Liverpool', homeGoals: null, awayGoals: null, status: 'NS' }),
  ];
  const result = buildCompetitionBracket(fixtures);
  assert.equal(result.competitionKind, 'cup');
  assert.ok(Array.isArray(result.bracket));
  // Tri par ordre : Quarter-Final < Semi-Final < Final
  assert.equal(result.bracket[0].name, 'Quarter-Final');
  assert.equal(result.bracket[1].name, 'Semi-Final');
  assert.equal(result.bracket[2].name, 'Final');
  assert.ok(result.bracket[0].order < result.bracket[1].order);
  assert.ok(result.bracket[1].order < result.bracket[2].order);
});

test('buildCompetitionBracket retourne mixed pour une compétition avec groupes + knockout', () => {
  const fixtures = [
    makeFixture({ id: 1, round: 'Group A', homeId: 10, homeName: 'Bayern', awayId: 20, awayName: 'PSG', homeGoals: 3, awayGoals: 0, status: 'FT' }),
    makeFixture({ id: 2, round: 'Round of 16', homeId: 10, homeName: 'Bayern', awayId: 30, awayName: 'Real Madrid', homeGoals: 2, awayGoals: 2, status: 'AET' }),
  ];
  const result = buildCompetitionBracket(fixtures);
  assert.equal(result.competitionKind, 'mixed');
  assert.ok(Array.isArray(result.bracket));
  // Seul le round "Round of 16" est dans le bracket
  assert.equal(result.bracket.length, 1);
  assert.equal(result.bracket[0].name, 'Round of 16');
});

test('buildCompetitionBracket calcule winnerId pour les matchs FT et AET', () => {
  const fixtures = [
    // Victoire domicile
    makeFixture({ id: 1, round: 'Final', homeId: 10, homeName: 'A', awayId: 20, awayName: 'B', homeGoals: 2, awayGoals: 1, status: 'FT' }),
    // Victoire extérieur
    makeFixture({ id: 2, round: 'Semi-Final', homeId: 10, homeName: 'A', awayId: 20, awayName: 'B', homeGoals: 0, awayGoals: 1, status: 'AET' }),
    // Match non terminé
    makeFixture({ id: 3, round: 'Quarter-Final', homeId: 10, homeName: 'A', awayId: 20, awayName: 'B', homeGoals: null, awayGoals: null, status: 'NS' }),
  ];
  const result = buildCompetitionBracket(fixtures);
  assert.ok(Array.isArray(result.bracket));

  const quarter = result.bracket.find(r => r.name === 'Quarter-Final');
  const semi = result.bracket.find(r => r.name === 'Semi-Final');
  const final = result.bracket.find(r => r.name === 'Final');

  assert.ok(final);
  assert.ok(semi);
  assert.ok(quarter);

  assert.equal(final.matches[0].winnerId, 10); // domicile gagne
  assert.equal(semi.matches[0].winnerId, 20);  // extérieur gagne
  assert.equal(quarter.matches[0].winnerId, null); // non terminé
});

test('buildCompetitionBracket calcule winnerId aux tirs au but (PEN)', () => {
  const fixtures = [
    makeFixture({
      id: 1,
      round: 'Final',
      homeId: 10,
      homeName: 'A',
      awayId: 20,
      awayName: 'B',
      homeGoals: 1,
      awayGoals: 1,
      status: 'PEN',
      penaltyHome: 4,
      penaltyAway: 3,
    }),
  ];
  const result = buildCompetitionBracket(fixtures);
  assert.ok(Array.isArray(result.bracket));
  assert.equal(result.bracket[0].matches[0].winnerId, 10); // gagne aux pens
});

test('buildCompetitionBracket trie correctement les tours de coupe à grand tableau', () => {
  const fixtures = [
    makeFixture({ id: 1, round: 'Final', homeId: 10, homeName: 'A', awayId: 20, awayName: 'B', homeGoals: null, awayGoals: null, status: 'NS' }),
    makeFixture({ id: 2, round: 'Semi-Final', homeId: 10, homeName: 'A', awayId: 30, awayName: 'C', homeGoals: null, awayGoals: null, status: 'NS' }),
    makeFixture({ id: 3, round: 'Quarter-Final', homeId: 10, homeName: 'A', awayId: 40, awayName: 'D', homeGoals: null, awayGoals: null, status: 'NS' }),
    makeFixture({ id: 4, round: '8th Finals', homeId: 10, homeName: 'A', awayId: 50, awayName: 'E', homeGoals: null, awayGoals: null, status: 'NS' }),
    makeFixture({ id: 5, round: '16th Finals', homeId: 10, homeName: 'A', awayId: 60, awayName: 'F', homeGoals: null, awayGoals: null, status: 'NS' }),
    makeFixture({ id: 6, round: '32nd Finals', homeId: 10, homeName: 'A', awayId: 70, awayName: 'G', homeGoals: null, awayGoals: null, status: 'NS' }),
    makeFixture({ id: 7, round: '64th Finals', homeId: 10, homeName: 'A', awayId: 80, awayName: 'H', homeGoals: null, awayGoals: null, status: 'NS' }),
  ];

  const result = buildCompetitionBracket(fixtures);
  assert.equal(result.competitionKind, 'cup');
  assert.ok(Array.isArray(result.bracket));
  assert.deepEqual(
    result.bracket.map(round => round.name),
    ['64th Finals', '32nd Finals', '16th Finals', '8th Finals', 'Quarter-Final', 'Semi-Final', 'Final'],
  );
});

test('buildCompetitionBracket retourne un tableau vide pour une liste de fixtures vide', () => {
  const result = buildCompetitionBracket([]);
  assert.equal(result.competitionKind, 'league');
  assert.equal(result.bracket, null);
});

test('buildCompetitionBracket ignore les fixtures malformées sans planter', () => {
  const fixtures = [null, undefined, 42, 'string', {}, { league: null }, { league: { round: '' } }];
  // Aucune exception ne doit être levée
  const result = buildCompetitionBracket(fixtures as unknown[]);
  assert.equal(result.competitionKind, 'league');
});
