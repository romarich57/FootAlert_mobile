#!/usr/bin/env node
import { createServer } from 'node:http';

const PORT = Number(process.env.MOBILE_E2E_BFF_STUB_PORT ?? 3001);
const HOST = process.env.MOBILE_E2E_BFF_STUB_HOST ?? '0.0.0.0';
const CURRENT_SEASON = 2026;
const CURRENT_DATE = '2026-03-11';

const COMPETITION = {
  league: {
    id: 61,
    name: 'Ligue 1',
    type: 'League',
    logo: '',
  },
  country: {
    name: 'France',
    code: 'FR',
    flag: null,
  },
  seasons: [
    { year: CURRENT_SEASON, current: true },
    { year: CURRENT_SEASON - 1, current: false },
  ],
};

function createFixture({
  fixtureId,
  isoDate,
  timestamp,
  round,
  homeTeam,
  awayTeam,
  homeGoals,
  awayGoals,
  statusShort = 'FT',
  statusLong = 'Match Finished',
  elapsed = 90,
  venueName = 'Parc des Princes',
  venueCity = 'Paris',
}) {
  return {
    fixture: {
      id: fixtureId,
      referee: 'Referee Test',
      timezone: 'UTC',
      date: isoDate,
      timestamp,
      periods: {
        first: null,
        second: null,
      },
      venue: {
        id: 10,
        name: venueName,
        city: venueCity,
      },
      status: {
        long: statusLong,
        short: statusShort,
        elapsed,
      },
    },
    league: {
      id: COMPETITION.league.id,
      name: COMPETITION.league.name,
      country: COMPETITION.country.name,
      logo: COMPETITION.league.logo,
      flag: COMPETITION.country.flag,
      season: CURRENT_SEASON,
      round,
    },
    teams: {
      home: {
        id: homeTeam.id,
        name: homeTeam.name,
        logo: homeTeam.logo,
        winner: homeGoals !== null && awayGoals !== null ? homeGoals > awayGoals : null,
      },
      away: {
        id: awayTeam.id,
        name: awayTeam.name,
        logo: awayTeam.logo,
        winner: homeGoals !== null && awayGoals !== null ? awayGoals > homeGoals : null,
      },
    },
    goals: {
      home: homeGoals,
      away: awayGoals,
    },
    score: {
      halftime: {
        home: homeGoals === null ? null : Math.min(homeGoals, 1),
        away: awayGoals === null ? null : Math.min(awayGoals, 1),
      },
      fulltime: {
        home: homeGoals,
        away: awayGoals,
      },
      extratime: {
        home: null,
        away: null,
      },
      penalty: {
        home: null,
        away: null,
      },
    },
  };
}

const FIXTURE_101 = createFixture({
  fixtureId: 101,
  isoDate: '2026-03-11T20:00:00.000Z',
  timestamp: 1773259200,
  round: 'Regular Season - 25',
  homeTeam: { id: 1, name: 'Home FC', logo: '' },
  awayTeam: { id: 2, name: 'Away FC', logo: '' },
  homeGoals: 2,
  awayGoals: 1,
});

const FIXTURE_202 = createFixture({
  fixtureId: 202,
  isoDate: '2026-03-12T20:00:00.000Z',
  timestamp: 1773345600,
  round: 'Regular Season - 26',
  homeTeam: { id: 3, name: 'Sparse Home', logo: '' },
  awayTeam: { id: 4, name: 'Sparse Away', logo: '' },
  homeGoals: 0,
  awayGoals: 0,
  venueName: 'Stade de Test',
  venueCity: 'Lyon',
});

const COMPETITION_FIXTURES = [FIXTURE_101, FIXTURE_202];

const TEAM_CONTEXT_FIXTURES = {
  1: [
    createFixture({
      fixtureId: 9001,
      isoDate: '2026-03-01T20:00:00.000Z',
      timestamp: 1772395200,
      round: 'Regular Season - 23',
      homeTeam: { id: 1, name: 'Home FC', logo: '' },
      awayTeam: { id: 50, name: 'Opponent A', logo: '' },
      homeGoals: 2,
      awayGoals: 0,
    }),
    createFixture({
      fixtureId: 9002,
      isoDate: '2026-03-05T20:00:00.000Z',
      timestamp: 1772740800,
      round: 'Regular Season - 24',
      homeTeam: { id: 51, name: 'Opponent B', logo: '' },
      awayTeam: { id: 1, name: 'Home FC', logo: '' },
      homeGoals: 1,
      awayGoals: 1,
    }),
    createFixture({
      fixtureId: 9003,
      isoDate: '2026-03-15T20:00:00.000Z',
      timestamp: 1773604800,
      round: 'Regular Season - 27',
      homeTeam: { id: 1, name: 'Home FC', logo: '' },
      awayTeam: { id: 52, name: 'Opponent C', logo: '' },
      homeGoals: null,
      awayGoals: null,
      statusShort: 'NS',
      statusLong: 'Not Started',
      elapsed: null,
    }),
  ],
  2: [
    createFixture({
      fixtureId: 9101,
      isoDate: '2026-03-02T20:00:00.000Z',
      timestamp: 1772481600,
      round: 'Regular Season - 23',
      homeTeam: { id: 2, name: 'Away FC', logo: '' },
      awayTeam: { id: 60, name: 'Opponent X', logo: '' },
      homeGoals: 3,
      awayGoals: 2,
    }),
    createFixture({
      fixtureId: 9102,
      isoDate: '2026-03-06T20:00:00.000Z',
      timestamp: 1772827200,
      round: 'Regular Season - 24',
      homeTeam: { id: 61, name: 'Opponent Y', logo: '' },
      awayTeam: { id: 2, name: 'Away FC', logo: '' },
      homeGoals: 0,
      awayGoals: 1,
    }),
    createFixture({
      fixtureId: 9103,
      isoDate: '2026-03-16T18:00:00.000Z',
      timestamp: 1773684000,
      round: 'Regular Season - 27',
      homeTeam: { id: 62, name: 'Opponent Z', logo: '' },
      awayTeam: { id: 2, name: 'Away FC', logo: '' },
      homeGoals: null,
      awayGoals: null,
      statusShort: 'NS',
      statusLong: 'Not Started',
      elapsed: null,
    }),
  ],
};

const FULL_STANDINGS = {
  league: {
    id: COMPETITION.league.id,
    name: COMPETITION.league.name,
    country: COMPETITION.country.name,
    logo: COMPETITION.league.logo,
    flag: COMPETITION.country.flag,
    season: CURRENT_SEASON,
    standings: [[
      {
        rank: 2,
        team: { id: 1, name: 'Home FC', logo: '' },
        points: 56,
        goalsDiff: 26,
        group: 'Ligue 1',
        form: 'WWDWL',
        status: 'same',
        description: null,
        all: {
          played: 25,
          win: 17,
          draw: 5,
          lose: 3,
          goals: { for: 49, against: 23 },
        },
        home: {
          played: 12,
          win: 9,
          draw: 2,
          lose: 1,
          goals: { for: 27, against: 10 },
        },
        away: {
          played: 13,
          win: 8,
          draw: 3,
          lose: 2,
          goals: { for: 22, against: 13 },
        },
        update: '2026-03-11T22:30:00.000Z',
      },
      {
        rank: 5,
        team: { id: 2, name: 'Away FC', logo: '' },
        points: 43,
        goalsDiff: 9,
        group: 'Ligue 1',
        form: 'WDLDW',
        status: 'same',
        description: null,
        all: {
          played: 25,
          win: 12,
          draw: 7,
          lose: 6,
          goals: { for: 36, against: 27 },
        },
        home: {
          played: 12,
          win: 7,
          draw: 3,
          lose: 2,
          goals: { for: 21, against: 12 },
        },
        away: {
          played: 13,
          win: 5,
          draw: 4,
          lose: 4,
          goals: { for: 15, against: 15 },
        },
        update: '2026-03-11T22:30:00.000Z',
      },
    ]],
  },
};

const MATCH_EVENTS = [
  {
    time: { elapsed: 12, extra: null },
    team: { id: 1, name: 'Home FC', logo: '' },
    player: { id: 10, name: 'Home Striker' },
    assist: { id: 11, name: 'Playmaker' },
    type: 'Goal',
    detail: 'Normal Goal',
    comments: null,
  },
];

const MATCH_STATISTICS_ALL = [
  {
    team: { id: 1, name: 'Home FC', logo: '' },
    statistics: [
      { type: 'Shots on Goal', value: 8 },
      { type: 'Total Shots', value: 14 },
      { type: 'Ball Possession', value: '59%' },
      { type: 'Passes %', value: '86%' },
    ],
  },
  {
    team: { id: 2, name: 'Away FC', logo: '' },
    statistics: [
      { type: 'Shots on Goal', value: 3 },
      { type: 'Total Shots', value: 9 },
      { type: 'Ball Possession', value: '41%' },
      { type: 'Passes %', value: '78%' },
    ],
  },
];

const MATCH_STATISTICS_FIRST = [
  {
    team: { id: 1, name: 'Home FC', logo: '' },
    statistics: [{ type: 'Shots on Goal', value: 5 }],
  },
  {
    team: { id: 2, name: 'Away FC', logo: '' },
    statistics: [{ type: 'Shots on Goal', value: 2 }],
  },
];

const MATCH_STATISTICS_SECOND = [
  {
    team: { id: 1, name: 'Home FC', logo: '' },
    statistics: [{ type: 'Shots on Goal', value: 3 }],
  },
  {
    team: { id: 2, name: 'Away FC', logo: '' },
    statistics: [{ type: 'Shots on Goal', value: 1 }],
  },
];

const MATCH_PREDICTIONS = [
  {
    predictions: {
      winner: { id: 1, name: 'Home FC', comment: 'Winner' },
      win_or_draw: true,
      under_over: '2.5',
      goals: { home: '2.0', away: '1.0' },
      advice: 'Home should edge this game.',
      percent: { home: '50%', draw: '25%', away: '25%' },
    },
  },
];

const COMPETITION_FULL = {
  competition: COMPETITION,
  competitionKind: 'league',
  season: CURRENT_SEASON,
  standings: FULL_STANDINGS,
  matches: COMPETITION_FIXTURES,
  bracket: null,
  playerStats: {
    topScorers: [],
    topAssists: [],
    topYellowCards: [],
    topRedCards: [],
  },
  teamStats: null,
  transfers: [],
};

const MATCH_FULL_BY_ID = {
  101: {
    fixture: FIXTURE_101,
    lifecycleState: 'finished',
    context: {
      leagueId: COMPETITION.league.id,
      season: CURRENT_SEASON,
      homeTeamId: 1,
      awayTeamId: 2,
    },
    events: MATCH_EVENTS,
    statistics: {
      all: MATCH_STATISTICS_ALL,
      first: MATCH_STATISTICS_FIRST,
      second: MATCH_STATISTICS_SECOND,
    },
    lineups: [],
    predictions: MATCH_PREDICTIONS,
    absences: [],
    headToHead: [],
    standings: FULL_STANDINGS,
    homeRecentResults: TEAM_CONTEXT_FIXTURES[1],
    awayRecentResults: TEAM_CONTEXT_FIXTURES[2],
    homeLeaders: null,
    awayLeaders: null,
    playersStats: {
      homeTeamId: 1,
      awayTeamId: 2,
      home: [],
      away: [],
    },
  },
  202: {
    fixture: FIXTURE_202,
    lifecycleState: 'finished',
    context: {
      leagueId: COMPETITION.league.id,
      season: CURRENT_SEASON,
      homeTeamId: 3,
      awayTeamId: 4,
    },
    events: [],
    statistics: {
      all: [],
      first: [],
      second: [],
    },
    lineups: [],
    predictions: [],
    absences: [],
    headToHead: [],
    standings: FULL_STANDINGS,
    homeRecentResults: [],
    awayRecentResults: [],
    homeLeaders: null,
    awayLeaders: null,
    playersStats: {
      homeTeamId: 3,
      awayTeamId: 4,
      home: [],
      away: [],
    },
  },
};

const SEARCH_GLOBAL_RESPONSE = {
  teams: [
    {
      id: '1',
      name: 'Home FC',
      logo: '',
      country: 'France',
    },
  ],
  competitions: [
    {
      id: String(COMPETITION.league.id),
      name: COMPETITION.league.name,
      logo: COMPETITION.league.logo,
      country: COMPETITION.country.name,
      type: COMPETITION.league.type,
    },
  ],
  players: [],
  matches: [
    {
      fixtureId: String(FIXTURE_101.fixture.id),
      startDate: FIXTURE_101.fixture.date,
      statusShort: FIXTURE_101.fixture.status.short,
      statusLong: FIXTURE_101.fixture.status.long,
      competitionId: String(FIXTURE_101.league.id),
      competitionName: FIXTURE_101.league.name,
      competitionCountry: FIXTURE_101.league.country,
      competitionLogo: FIXTURE_101.league.logo,
      homeTeamId: String(FIXTURE_101.teams.home.id),
      homeTeamName: FIXTURE_101.teams.home.name,
      homeTeamLogo: FIXTURE_101.teams.home.logo,
      awayTeamId: String(FIXTURE_101.teams.away.id),
      awayTeamName: FIXTURE_101.teams.away.name,
      awayTeamLogo: FIXTURE_101.teams.away.logo,
      homeGoals: FIXTURE_101.goals.home,
      awayGoals: FIXTURE_101.goals.away,
    },
  ],
  meta: {
    partial: false,
    degradedSources: [],
  },
};

const DISCOVERY_TEAMS = {
  items: [
    {
      teamId: '1',
      teamName: 'Home FC',
      teamLogo: '',
      country: 'France',
      activeFollowersCount: 42,
      recentNet30d: 8,
      totalFollowAdds: 112,
    },
  ],
  meta: {
    source: 'dynamic',
    complete: true,
    seedCount: 0,
    generatedAt: '2026-03-11T08:00:00.000Z',
    refreshAfterMs: null,
  },
};

const DISCOVERY_PLAYERS = {
  items: [
    {
      playerId: '278',
      playerName: 'Test Playmaker',
      playerPhoto: '',
      position: 'Midfielder',
      teamName: 'Home FC',
      teamLogo: '',
      leagueName: 'Ligue 1',
      activeFollowersCount: 18,
      recentNet30d: 5,
      totalFollowAdds: 54,
    },
  ],
  meta: {
    source: 'dynamic',
    complete: true,
    seedCount: 0,
    generatedAt: '2026-03-11T08:00:00.000Z',
    refreshAfterMs: null,
  },
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function sendList(response, items, pageInfo) {
  sendJson(response, 200, {
    response: items,
    ...(pageInfo ? { pageInfo } : {}),
  });
}

function sendDiscovery(response, payload) {
  sendJson(response, 200, payload);
}

function sendUpstreamError(response) {
  sendJson(response, 503, {
    error: 'UPSTREAM_HTTP_ERROR',
    message: 'Stub upstream unavailable.',
  });
}

function normalizeQuery(value) {
  return String(value ?? '').trim().toLowerCase();
}

function getFixtureById(fixtureId) {
  if (fixtureId === '101') {
    return FIXTURE_101;
  }

  if (fixtureId === '202') {
    return FIXTURE_202;
  }

  return null;
}

function getMatchFullPayload(fixtureId) {
  return MATCH_FULL_BY_ID[Number(fixtureId)] ?? null;
}

function routeRequest(request, response) {
  const requestUrl = new URL(request.url ?? '/', 'http://localhost');
  const segments = requestUrl.pathname.split('/').filter(Boolean);

  if (segments[0] !== 'v1') {
    sendJson(response, 404, { error: 'NOT_FOUND', message: 'Route not found.' });
    return;
  }

  if (segments[1] === 'matches' && segments.length === 2) {
    sendList(response, COMPETITION_FIXTURES);
    return;
  }

  if (segments[1] === 'matches' && segments.length >= 3) {
    const fixtureId = segments[2];

    if (fixtureId === '999') {
      sendUpstreamError(response);
      return;
    }

    if (segments.length === 3) {
      sendList(response, getFixtureById(fixtureId) ? [getFixtureById(fixtureId)] : []);
      return;
    }

    const subRoute = segments[3];
    if (subRoute === 'full') {
      const payload = getMatchFullPayload(fixtureId);
      if (!payload) {
        sendJson(response, 200, {
          fixture: null,
          lifecycleState: 'pre_match',
          context: {
            leagueId: null,
            season: null,
            homeTeamId: null,
            awayTeamId: null,
          },
          events: [],
          statistics: { all: [], first: [], second: [] },
          lineups: [],
          predictions: [],
          absences: [],
          headToHead: [],
          standings: null,
          homeRecentResults: [],
          awayRecentResults: [],
          homeLeaders: null,
          awayLeaders: null,
          playersStats: {
            homeTeamId: null,
            awayTeamId: null,
            home: [],
            away: [],
          },
        });
        return;
      }

      sendJson(response, 200, payload);
      return;
    }

    if (subRoute === 'events') {
      sendList(response, fixtureId === '101' ? MATCH_EVENTS : []);
      return;
    }

    if (subRoute === 'statistics') {
      const period = requestUrl.searchParams.get('period') ?? 'all';
      if (fixtureId !== '101') {
        sendList(response, []);
        return;
      }

      if (period === 'first') {
        sendList(response, MATCH_STATISTICS_FIRST);
        return;
      }

      if (period === 'second') {
        sendList(response, MATCH_STATISTICS_SECOND);
        return;
      }

      sendList(response, MATCH_STATISTICS_ALL);
      return;
    }

    if (subRoute === 'lineups' || subRoute === 'absences' || subRoute === 'head-to-head') {
      sendList(response, []);
      return;
    }

    if (subRoute === 'predictions') {
      sendList(response, fixtureId === '101' ? MATCH_PREDICTIONS : []);
      return;
    }

    if (subRoute === 'players' && segments[5] === 'stats') {
      sendList(response, []);
      return;
    }

    sendList(response, []);
    return;
  }

  if (segments[1] === 'competitions' && segments.length === 2) {
    sendList(response, [COMPETITION]);
    return;
  }

  if (segments[1] === 'competitions' && segments[2] === 'search') {
    const query = normalizeQuery(requestUrl.searchParams.get('q'));
    const hasMatch = query.length === 0 || COMPETITION.league.name.toLowerCase().includes(query);
    sendList(response, hasMatch ? [COMPETITION] : []);
    return;
  }

  if (segments[1] === 'competitions' && segments.length >= 3) {
    const competitionId = segments[2];
    const isKnownCompetition = competitionId === String(COMPETITION.league.id);

    if (segments.length === 3) {
      sendList(response, isKnownCompetition ? [COMPETITION] : []);
      return;
    }

    if (segments[3] === 'full') {
      sendJson(response, 200, isKnownCompetition ? COMPETITION_FULL : {
        competition: null,
        competitionKind: 'league',
        season: CURRENT_SEASON,
        standings: null,
        matches: [],
        bracket: null,
        playerStats: {
          topScorers: [],
          topAssists: [],
          topYellowCards: [],
          topRedCards: [],
        },
        teamStats: null,
        transfers: [],
      });
      return;
    }

    if (segments[3] === 'standings') {
      sendList(response, isKnownCompetition ? [FULL_STANDINGS] : []);
      return;
    }

    if (segments[3] === 'matches') {
      sendList(response, isKnownCompetition ? COMPETITION_FIXTURES : [], {
        hasMore: false,
        nextCursor: null,
        returnedCount: isKnownCompetition ? COMPETITION_FIXTURES.length : 0,
        hasPrevious: false,
        previousCursor: null,
      });
      return;
    }

    if (
      segments[3] === 'player-stats' ||
      segments[3] === 'transfers' ||
      segments[3] === 'totw' ||
      segments[3] === 'team-stats'
    ) {
      sendList(response, []);
      return;
    }
  }

  if (segments[1] === 'follows' && segments[2] === 'discovery' && segments[3] === 'teams') {
    sendDiscovery(response, DISCOVERY_TEAMS);
    return;
  }

  if (segments[1] === 'follows' && segments[2] === 'discovery' && segments[3] === 'players') {
    sendDiscovery(response, DISCOVERY_PLAYERS);
    return;
  }

  if (segments[1] === 'search' && segments[2] === 'global') {
    const query = normalizeQuery(requestUrl.searchParams.get('q'));
    const hasCompetitionMatch =
      query.length === 0 ||
      COMPETITION.league.name.toLowerCase().includes(query) ||
      'league'.includes(query);
    sendJson(response, 200, hasCompetitionMatch ? SEARCH_GLOBAL_RESPONSE : {
      teams: [],
      competitions: [],
      players: [],
      matches: [],
      meta: {
        partial: false,
        degradedSources: [],
      },
    });
    return;
  }

  sendList(response, []);
}

const server = createServer((request, response) => {
  if ((request.method ?? 'GET').toUpperCase() !== 'GET') {
    sendJson(response, 405, { error: 'METHOD_NOT_ALLOWED', message: 'Only GET is supported.' });
    return;
  }

  routeRequest(request, response);
});

server.listen(PORT, HOST, () => {
  console.log(
    `[mobile-ci-bff-stub] listening on http://${HOST}:${PORT}/v1 for ${CURRENT_DATE}`,
  );
});

function closeServer() {
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGTERM', closeServer);
process.on('SIGINT', closeServer);
