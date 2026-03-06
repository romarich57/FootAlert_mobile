import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createCompetitionsReadService } from '../../dist/services/competitionsService.js';
import { createFollowsReadService } from '../../dist/services/followsService.js';
import { createMatchesReadService } from '../../dist/services/matchesService.js';
import { createPlayersReadService } from '../../dist/services/playersService.js';
import { createTeamsReadService } from '../../dist/services/teamsService.js';

function createHttpRecorder(initialResponses = []) {
  const calls = [];
  const responses = [...initialResponses];

  return {
    http: {
      async get(path, query) {
        calls.push({
          path,
          query,
        });
        const payload = responses.length > 0 ? responses.shift() : { response: [] };
        return payload;
      },
    },
    calls,
  };
}

const noopTelemetry = {
  addBreadcrumb() {
    return undefined;
  },
  trackError() {
    return undefined;
  },
};

describe('read services path/query normalization', () => {
  it('matches service encodes path params and omits undefined optional queries', async () => {
    const { http, calls } = createHttpRecorder([{ response: [] }]);
    const service = createMatchesReadService({ http, telemetry: noopTelemetry });

    await service.fetchFixtureHeadToHead({
      fixtureId: '100/200',
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, '/matches/100%2F200/head-to-head');
    assert.equal(calls[0].query, undefined);
  });

  it('teams service forwards required query fields for standings endpoint', async () => {
    const { http, calls } = createHttpRecorder([{ response: [] }]);
    const service = createTeamsReadService({ http, telemetry: noopTelemetry });

    await service.fetchLeagueStandings('39', 2025);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, '/teams/standings');
    assert.deepEqual(calls[0].query, {
      leagueId: '39',
      season: 2025,
    });
  });

  it('teams service forwards overview aggregation query fields', async () => {
    const { http, calls } = createHttpRecorder([{}]);
    const service = createTeamsReadService({ http, telemetry: noopTelemetry });

    await service.fetchTeamOverview({
      teamId: '529',
      leagueId: '140',
      season: 2025,
      timezone: 'Europe/Paris',
      historySeasons: [2024, 2023, 2022],
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, '/teams/529/overview');
    assert.deepEqual(calls[0].query, {
      leagueId: '140',
      season: 2025,
      timezone: 'Europe/Paris',
      historySeasons: '2024,2023,2022',
    });
  });

  it('competitions service forwards optional cursor/limit when provided', async () => {
    const { http, calls } = createHttpRecorder([{ response: [] }]);
    const service = createCompetitionsReadService({ http, telemetry: noopTelemetry });

    await service.fetchLeagueFixtures(39, 2025, undefined, {
      limit: 50,
      cursor: 'abc123',
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, '/competitions/39/matches');
    assert.deepEqual(calls[0].query, {
      season: 2025,
      limit: 50,
      cursor: 'abc123',
    });
  });

  it('players service maps detail call to the expected endpoint/query', async () => {
    const { http, calls } = createHttpRecorder([{ response: [] }]);
    const service = createPlayersReadService({ http, telemetry: noopTelemetry });

    await service.fetchPlayerDetails('77', 2025);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, '/players/77');
    assert.deepEqual(calls[0].query, { season: 2025 });
  });

  it('players service exposes overview aggregation on a stable endpoint', async () => {
    const { http, calls } = createHttpRecorder([{}]);
    const service = createPlayersReadService({ http, telemetry: noopTelemetry });

    await service.fetchPlayerOverview('77', 2025);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, '/players/77/overview');
    assert.deepEqual(calls[0].query, { season: 2025 });
  });

  it('players service exposes stats catalog aggregation without season fan-out parameters', async () => {
    const { http, calls } = createHttpRecorder([{}]);
    const service = createPlayersReadService({ http, telemetry: noopTelemetry });

    await service.fetchPlayerStatsCatalog('77');

    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, '/players/77/stats-catalog');
    assert.equal(calls[0].query, undefined);
  });

  it('players service defaults aggregate matches to the mobile contract limit', async () => {
    const { http, calls } = createHttpRecorder([{ response: [] }]);
    const service = createPlayersReadService({ http, telemetry: noopTelemetry });

    await service.fetchPlayerMatchesAggregate('77', '40', 2025);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, '/players/77/matches');
    assert.deepEqual(calls[0].query, {
      teamId: '40',
      season: 2025,
      last: 99,
    });
  });

  it('follows service keeps search endpoint contract stable', async () => {
    const { http, calls } = createHttpRecorder([{ response: [] }]);
    const service = createFollowsReadService({ http, telemetry: noopTelemetry });

    await service.searchTeams('paris');

    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, '/follows/search/teams');
    assert.deepEqual(calls[0].query, { q: 'paris' });
  });

  it('follows player search forwards season when provided', async () => {
    const { http, calls } = createHttpRecorder([{ response: [] }]);
    const service = createFollowsReadService({ http, telemetry: noopTelemetry });

    await service.searchPlayers('mbappe', 2025);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, '/follows/search/players');
    assert.deepEqual(calls[0].query, {
      q: 'mbappe',
      season: 2025,
    });
  });
});
