import assert from 'node:assert/strict';
import test from 'node:test';

process.env.API_FOOTBALL_KEY = 'test-server-key';
process.env.API_FOOTBALL_BASE_URL = 'https://api-football.test';
process.env.API_TIMEOUT_MS = '500';
process.env.API_MAX_RETRIES = '1';

async function loadPlayersMappers() {
  return import('../src/routes/players.ts');
}

test('mapCareerSeasons normalizes and sorts by season descending', async () => {
  const { mapCareerSeasons } = await loadPlayersMappers();

  const mapped = mapCareerSeasons({
    statistics: [
      {
        team: { id: 10, name: 'Team B', logo: 'https://logo-b' },
        league: { season: 2023 },
        games: { appearences: 12, rating: '6.8' },
        goals: { total: 2, assists: 1 },
      },
      {
        team: { id: 10, name: 'Team B', logo: 'https://logo-b' },
        league: { season: 2024 },
        games: { appearences: 24, rating: '7.2' },
        goals: { total: 4, assists: 3 },
      },
    ],
  });

  assert.equal(mapped.length, 2);
  assert.equal(mapped[0]?.season, '2024');
  assert.equal(mapped[1]?.season, '2023');
  assert.equal(mapped[0]?.team.id, '10');
  assert.equal(mapped[0]?.rating, '7.20');
});

test('dedupeCareerSeasons and aggregateCareerTeams collapse duplicate season-team rows', async () => {
  const { dedupeCareerSeasons, aggregateCareerTeams } = await loadPlayersMappers();

  const deduped = dedupeCareerSeasons([
    {
      season: '2024',
      team: { id: '33', name: 'Team A', logo: 'https://logo-a' },
      matches: 20,
      goals: 9,
      assists: 3,
      rating: '7.10',
    },
    {
      season: '2024',
      team: { id: '33', name: 'Team A', logo: 'https://logo-a' },
      matches: 20,
      goals: 9,
      assists: 3,
      rating: '7.10',
    },
    {
      season: '2023',
      team: { id: '33', name: 'Team A', logo: 'https://logo-a' },
      matches: 18,
      goals: 7,
      assists: 4,
      rating: '7.00',
    },
  ]);

  assert.equal(deduped.length, 2);

  const teams = aggregateCareerTeams(deduped);
  assert.equal(teams.length, 1);
  assert.equal(teams[0]?.matches, 38);
  assert.equal(teams[0]?.goals, 16);
  assert.equal(teams[0]?.assists, 7);
  assert.equal(teams[0]?.period, '2023 - 2024');
});

test('dedupeCareerSeasons merges non-identical league duplicates and ignores exact duplicates', async () => {
  const { dedupeCareerSeasons } = await loadPlayersMappers();

  const deduped = dedupeCareerSeasons([
    {
      season: '2024',
      leagueId: '1',
      team: { id: '33', name: 'Team A', logo: 'https://logo-a' },
      matches: 10,
      goals: 4,
      assists: 1,
      rating: '7.00',
    },
    {
      season: '2024',
      leagueId: '1',
      team: { id: '33', name: 'Team A', logo: 'https://logo-a' },
      matches: 8,
      goals: 2,
      assists: 1,
      rating: '6.50',
    },
    {
      season: '2024',
      leagueId: '2',
      team: { id: '33', name: 'Team A', logo: 'https://logo-a' },
      matches: 20,
      goals: 8,
      assists: 2,
      rating: '8.00',
    },
    {
      season: '2024',
      leagueId: '2',
      team: { id: '33', name: 'Team A', logo: 'https://logo-a' },
      matches: 20,
      goals: 8,
      assists: 2,
      rating: '8.00',
    },
  ]);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0]?.matches, 38);
  assert.equal(deduped[0]?.goals, 14);
  assert.equal(deduped[0]?.assists, 4);
  assert.equal(deduped[0]?.rating, '7.42');
});

test('dedupeCareerSeasons removes season rows with zero appearances and no stats', async () => {
  const { dedupeCareerSeasons } = await loadPlayersMappers();

  const deduped = dedupeCareerSeasons([
    {
      season: '2024',
      team: { id: '50', name: 'PSG', logo: 'https://logo-psg' },
      matches: 0,
      goals: 0,
      assists: 0,
      rating: null,
    },
    {
      season: '2024',
      team: { id: '60', name: 'Real Madrid', logo: 'https://logo-real' },
      matches: 28,
      goals: 15,
      assists: 9,
      rating: '7.80',
    },
  ]);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0]?.team.id, '60');
  assert.equal(deduped[0]?.matches, 28);
});

test('dedupeCareerSeasons keeps zero-appearance rows when they still carry a valid rating', async () => {
  const { dedupeCareerSeasons } = await loadPlayersMappers();

  const deduped = dedupeCareerSeasons([
    {
      season: '2024',
      team: { id: '70', name: 'Test FC', logo: 'https://logo-test' },
      matches: 0,
      goals: 0,
      assists: 0,
      rating: '7.10',
    },
  ]);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0]?.team.id, '70');
  assert.equal(deduped[0]?.rating, '7.10');
});

test('mapPlayerMatchPerformance maps fixture and player statistics', async () => {
  const { mapPlayerMatchPerformance } = await loadPlayersMappers();

  const mapped = mapPlayerMatchPerformance(
    '278',
    '40',
    {
      fixture: { id: 9001, date: '2026-02-20T20:00:00Z' },
      league: { id: 39, name: 'Premier League', logo: 'https://league-logo' },
      teams: {
        home: { id: 40, name: 'Team A', logo: 'https://team-a' },
        away: { id: 50, name: 'Team B', logo: 'https://team-b' },
      },
      goals: { home: 2, away: 1 },
    },
    {
      players: [
        {
          players: [
            {
              player: { id: 278 },
              statistics: [
                {
                  games: { minutes: 90, rating: '7.8', substitute: false },
                  goals: { total: 1, assists: 0 },
                  cards: { yellow: 1, red: 0 },
                },
              ],
            },
          ],
        },
      ],
    },
  );

  assert.ok(mapped);
  assert.equal(mapped?.fixtureId, '9001');
  assert.equal(mapped?.playerStats.minutes, 90);
  assert.equal(mapped?.playerStats.rating, '7.8');
  assert.equal(mapped?.playerStats.isStarter, true);
});

test('mapPlayerMatchPerformance picks the most representative stat row when multiple rows exist', async () => {
  const { mapPlayerMatchPerformance } = await loadPlayersMappers();

  const mapped = mapPlayerMatchPerformance(
    '278',
    '40',
    {
      fixture: { id: 9002, date: '2026-02-21T20:00:00Z' },
      league: { id: 39, name: 'Premier League', logo: 'https://league-logo' },
      teams: {
        home: { id: 40, name: 'Team A', logo: 'https://team-a' },
        away: { id: 50, name: 'Team B', logo: 'https://team-b' },
      },
      goals: { home: 3, away: 2 },
    },
    {
      players: [
        {
          players: [
            {
              player: { id: 278 },
              statistics: [
                {
                  games: { minutes: 12, rating: '6.0', substitute: true },
                  goals: { total: 0, assists: 0 },
                  cards: { yellow: 0, red: 0 },
                },
                {
                  games: { minutes: 78, rating: '7.6', substitute: false },
                  goals: { total: 2, assists: 1 },
                  cards: { yellow: 1, red: 0 },
                },
              ],
            },
          ],
        },
      ],
    },
  );

  assert.ok(mapped);
  assert.equal(mapped?.playerStats.minutes, 78);
  assert.equal(mapped?.playerStats.rating, '7.6');
  assert.equal(mapped?.playerStats.goals, 2);
  assert.equal(mapped?.playerStats.assists, 1);
  assert.equal(mapped?.playerStats.yellowCards, 1);
  assert.equal(mapped?.playerStats.isStarter, true);
});

test('mapPlayerMatchPerformance supports flat fixtures players payload shape', async () => {
  const { mapPlayerMatchPerformance } = await loadPlayersMappers();

  const mapped = mapPlayerMatchPerformance(
    '278',
    '40',
    {
      fixture: { id: 9003, date: '2026-02-22T20:00:00Z' },
      league: { id: 39, name: 'Premier League', logo: 'https://league-logo' },
      teams: {
        home: { id: 40, name: 'Team A', logo: 'https://team-a' },
        away: { id: 50, name: 'Team B', logo: 'https://team-b' },
      },
      goals: { home: 1, away: 1 },
    },
    {
      players: [
        {
          player: { id: 278 },
          statistics: [
            {
              games: { minutes: 82, rating: '7.1', substitute: false },
              goals: { total: 0, assists: 1 },
              cards: { yellow: 0, red: 0 },
            },
          ],
        },
      ],
    },
  );

  assert.ok(mapped);
  assert.equal(mapped?.fixtureId, '9003');
  assert.equal(mapped?.playerStats.minutes, 82);
  assert.equal(mapped?.playerStats.assists, 1);
  assert.equal(mapped?.playerStats.isStarter, true);
});
