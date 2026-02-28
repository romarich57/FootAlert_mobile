#!/usr/bin/env node
import { createServer } from 'node:http';

const PORT = Number(process.env.MOBILE_E2E_BFF_STUB_PORT ?? 3001);
const HOST = process.env.MOBILE_E2E_BFF_STUB_HOST ?? '0.0.0.0';

const FULL_FIXTURE = {
  fixture: {
    id: 101,
    date: '2026-02-20T20:00:00.000Z',
    status: {
      short: 'FT',
      long: 'Match Finished',
      elapsed: 90,
    },
    venue: {
      name: 'Parc des Princes',
      city: 'Paris',
    },
  },
  league: {
    id: 61,
    name: 'Ligue 1',
    country: 'France',
    logo: null,
    season: 2026,
    round: 'Regular Season - 25',
  },
  teams: {
    home: {
      id: 1,
      name: 'Home FC',
      logo: null,
      winner: true,
    },
    away: {
      id: 2,
      name: 'Away FC',
      logo: null,
      winner: false,
    },
  },
  goals: {
    home: 2,
    away: 1,
  },
  score: {
    halftime: {
      home: 1,
      away: 1,
    },
    fulltime: {
      home: 2,
      away: 1,
    },
  },
};

const SPARSE_FIXTURE = {
  fixture: {
    id: 202,
    date: '2026-02-21T20:00:00.000Z',
    status: {
      short: 'FT',
      long: 'Match Finished',
      elapsed: 90,
    },
    venue: {
      name: 'Stade de Test',
      city: 'Lyon',
    },
  },
  league: {
    id: 61,
    name: 'Ligue 1',
    country: 'France',
    logo: null,
    season: 2026,
    round: 'Regular Season - 26',
  },
  teams: {
    home: {
      id: 3,
      name: 'Sparse Home',
      logo: null,
      winner: null,
    },
    away: {
      id: 4,
      name: 'Sparse Away',
      logo: null,
      winner: null,
    },
  },
  goals: {
    home: 0,
    away: 0,
  },
  score: {
    halftime: {
      home: 0,
      away: 0,
    },
    fulltime: {
      home: 0,
      away: 0,
    },
  },
};

const FULL_EVENTS = [
  {
    time: { elapsed: 12, extra: null },
    team: { id: 1, name: 'Home FC', logo: null },
    player: { id: 10, name: 'Home Striker' },
    assist: { id: 11, name: 'Playmaker' },
    type: 'Goal',
    detail: 'Normal Goal',
    comments: null,
  },
];

const FULL_STATISTICS_ALL = [
  {
    team: { id: 1, name: 'Home FC', logo: null },
    statistics: [
      { type: 'Shots on Goal', value: 8 },
      { type: 'Total Shots', value: 14 },
      { type: 'Ball Possession', value: '59%' },
      { type: 'Passes %', value: '86%' },
    ],
  },
  {
    team: { id: 2, name: 'Away FC', logo: null },
    statistics: [
      { type: 'Shots on Goal', value: 3 },
      { type: 'Total Shots', value: 9 },
      { type: 'Ball Possession', value: '41%' },
      { type: 'Passes %', value: '78%' },
    ],
  },
];

const FULL_STATISTICS_FIRST = [
  {
    team: { id: 1, name: 'Home FC', logo: null },
    statistics: [{ type: 'Shots on Goal', value: 5 }],
  },
  {
    team: { id: 2, name: 'Away FC', logo: null },
    statistics: [{ type: 'Shots on Goal', value: 2 }],
  },
];

const FULL_STATISTICS_SECOND = [
  {
    team: { id: 1, name: 'Home FC', logo: null },
    statistics: [{ type: 'Shots on Goal', value: 3 }],
  },
  {
    team: { id: 2, name: 'Away FC', logo: null },
    statistics: [{ type: 'Shots on Goal', value: 1 }],
  },
];

const FULL_STANDINGS = {
  league: {
    id: 61,
    name: 'Ligue 1',
    country: 'France',
    logo: null,
    season: 2026,
    standings: [[
      {
        rank: 2,
        team: { id: 1, name: 'Home FC', logo: null },
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
        update: '2026-02-20T22:30:00.000Z',
      },
      {
        rank: 5,
        team: { id: 2, name: 'Away FC', logo: null },
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
        update: '2026-02-20T22:30:00.000Z',
      },
    ]],
  },
};

const TEAM_FIXTURES = {
  1: [
    {
      fixture: {
        id: 9001,
        date: '2026-02-08T20:00:00.000Z',
        status: { short: 'FT', long: 'Match Finished', elapsed: 90 },
      },
      league: { id: 61, name: 'Ligue 1', logo: null },
      teams: {
        home: { id: 1, name: 'Home FC', logo: null },
        away: { id: 50, name: 'Opponent A', logo: null },
      },
      goals: { home: 2, away: 0 },
    },
    {
      fixture: {
        id: 9002,
        date: '2026-02-14T20:00:00.000Z',
        status: { short: 'FT', long: 'Match Finished', elapsed: 90 },
      },
      league: { id: 61, name: 'Ligue 1', logo: null },
      teams: {
        home: { id: 51, name: 'Opponent B', logo: null },
        away: { id: 1, name: 'Home FC', logo: null },
      },
      goals: { home: 1, away: 1 },
    },
    {
      fixture: {
        id: 9003,
        date: '2026-03-01T20:00:00.000Z',
        status: { short: 'NS', long: 'Not Started', elapsed: null },
      },
      league: { id: 61, name: 'Ligue 1', logo: null },
      teams: {
        home: { id: 1, name: 'Home FC', logo: null },
        away: { id: 52, name: 'Opponent C', logo: null },
      },
      goals: { home: null, away: null },
    },
  ],
  2: [
    {
      fixture: {
        id: 9101,
        date: '2026-02-09T20:00:00.000Z',
        status: { short: 'FT', long: 'Match Finished', elapsed: 90 },
      },
      league: { id: 61, name: 'Ligue 1', logo: null },
      teams: {
        home: { id: 2, name: 'Away FC', logo: null },
        away: { id: 60, name: 'Opponent X', logo: null },
      },
      goals: { home: 3, away: 2 },
    },
    {
      fixture: {
        id: 9102,
        date: '2026-02-15T20:00:00.000Z',
        status: { short: 'FT', long: 'Match Finished', elapsed: 90 },
      },
      league: { id: 61, name: 'Ligue 1', logo: null },
      teams: {
        home: { id: 61, name: 'Opponent Y', logo: null },
        away: { id: 2, name: 'Away FC', logo: null },
      },
      goals: { home: 0, away: 1 },
    },
    {
      fixture: {
        id: 9103,
        date: '2026-03-02T18:00:00.000Z',
        status: { short: 'NS', long: 'Not Started', elapsed: null },
      },
      league: { id: 61, name: 'Ligue 1', logo: null },
      teams: {
        home: { id: 62, name: 'Opponent Z', logo: null },
        away: { id: 2, name: 'Away FC', logo: null },
      },
      goals: { home: null, away: null },
    },
  ],
  3: [],
  4: [],
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function sendList(response, items) {
  sendJson(response, 200, { response: items });
}

function sendPagedList(response, items) {
  sendJson(response, 200, {
    response: items,
    paging: { current: 1, total: 1 },
  });
}

function sendUpstreamError(response) {
  sendJson(response, 503, {
    error: 'UPSTREAM_HTTP_ERROR',
    message: 'Stub upstream unavailable.',
  });
}

function fixtureForId(fixtureId) {
  if (fixtureId === '101') {
    return FULL_FIXTURE;
  }

  if (fixtureId === '202') {
    return SPARSE_FIXTURE;
  }

  return null;
}

function routeRequest(request, response) {
  const requestUrl = new URL(request.url ?? '/', 'http://localhost');
  const segments = requestUrl.pathname.split('/').filter(Boolean);

  if (segments[0] !== 'v1') {
    sendJson(response, 404, { error: 'NOT_FOUND', message: 'Route not found.' });
    return;
  }

  if (segments[1] === 'matches' && segments.length >= 3) {
    const fixtureId = segments[2];
    if (fixtureId === '999') {
      sendUpstreamError(response);
      return;
    }

    if (segments.length === 3) {
      const fixture = fixtureForId(fixtureId);
      sendList(response, fixture ? [fixture] : []);
      return;
    }

    const matchSubRoute = segments[3];
    if (matchSubRoute === 'events') {
      sendList(response, fixtureId === '101' ? FULL_EVENTS : []);
      return;
    }

    if (matchSubRoute === 'statistics') {
      const period = requestUrl.searchParams.get('period') ?? 'all';
      if (fixtureId !== '101') {
        sendList(response, []);
        return;
      }

      if (period === 'first') {
        sendList(response, FULL_STATISTICS_FIRST);
        return;
      }

      if (period === 'second') {
        sendList(response, FULL_STATISTICS_SECOND);
        return;
      }

      sendList(response, FULL_STATISTICS_ALL);
      return;
    }

    if (matchSubRoute === 'lineups') {
      sendList(response, []);
      return;
    }

    if (matchSubRoute === 'predictions') {
      sendList(
        response,
        fixtureId === '101'
          ? [{
            predictions: {
              winner: { id: 1, name: 'Home FC', comment: 'Winner' },
              win_or_draw: true,
              under_over: '2.5',
              goals: { home: '2.0', away: '1.0' },
              advice: 'Home should edge this game.',
              percent: { home: '50%', draw: '25%', away: '25%' },
            },
          }]
          : [],
      );
      return;
    }

    if (matchSubRoute === 'absences') {
      sendList(response, []);
      return;
    }

    if (matchSubRoute === 'head-to-head') {
      sendList(response, []);
      return;
    }

    if (matchSubRoute === 'players' && segments[5] === 'stats') {
      sendList(response, []);
      return;
    }

    sendList(response, []);
    return;
  }

  if (segments[1] === 'competitions' && segments.length >= 4 && segments[3] === 'standings') {
    const competitionId = segments[2];
    sendList(response, competitionId === '61' ? [FULL_STANDINGS] : []);
    return;
  }

  if (segments[1] === 'teams' && segments.length >= 4 && segments[3] === 'fixtures') {
    const teamId = Number(segments[2]);
    const fixtures = TEAM_FIXTURES[teamId] ?? [];
    sendList(response, fixtures);
    return;
  }

  if (segments[1] === 'teams' && segments.length >= 4 && segments[3] === 'players') {
    sendPagedList(response, []);
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
  console.log(`[mobile-bff-stub] listening on http://${HOST}:${PORT}`);
});

function closeServer() {
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGTERM', closeServer);
process.on('SIGINT', closeServer);
