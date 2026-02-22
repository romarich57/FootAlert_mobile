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

test('mapPlayerMatchPerformance maps fixture and player statistics', async () => {
  const { mapPlayerMatchPerformance } = await loadPlayersMappers();

  const mapped = mapPlayerMatchPerformance(
    '278',
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
