import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const routeFailures = new Rate('critical_route_failures');
const loadProfile = __ENV.K6_LOAD_PROFILE || 'steady';
const rawBaseUrl = (__ENV.BASE_URL || __ENV.MOBILE_API_BASE_URL || '').trim();
const timezone = (__ENV.K6_TIMEZONE || 'UTC').trim();
const now = new Date();
const date = (__ENV.K6_DATE || now.toISOString().slice(0, 10)).trim();
const season = (__ENV.K6_SEASON || String(Math.max(now.getUTCFullYear() - 1, 2024))).trim();

function resolveUrls(rawUrl) {
  if (!rawUrl) {
    throw new Error('Missing BASE_URL or MOBILE_API_BASE_URL for k6 critical routes.');
  }

  const apiBaseUrl = rawUrl.replace(/\/+$/, '');
  const hasVersionPrefix = /\/v1$/.test(apiBaseUrl);
  const serviceBaseUrl = hasVersionPrefix ? apiBaseUrl.replace(/\/v1$/, '') : apiBaseUrl;
  const apiPrefix = hasVersionPrefix ? '' : '/v1';

  return {
    apiBaseUrl,
    apiPrefix,
    serviceBaseUrl,
  };
}

function resolveOptions(profile) {
  if (profile === 'smoke') {
    return {
      scenarios: {
        critical_routes: {
          executor: 'constant-vus',
          vus: Number(__ENV.K6_VUS || 1),
          duration: __ENV.K6_DURATION || '30s',
        },
      },
    };
  }

  if (profile === 'burst') {
    return {
      scenarios: {
        critical_routes: {
          executor: 'ramping-arrival-rate',
          startRate: Number(__ENV.K6_START_RATE || 2),
          timeUnit: '1s',
          preAllocatedVUs: Number(__ENV.K6_PREALLOCATED_VUS || 20),
          maxVUs: Number(__ENV.K6_MAX_VUS || 100),
          stages: [
            { target: Number(__ENV.K6_TARGET_RATE_1 || 10), duration: __ENV.K6_STAGE_1 || '1m' },
            { target: Number(__ENV.K6_TARGET_RATE_2 || 25), duration: __ENV.K6_STAGE_2 || '2m' },
            { target: 0, duration: __ENV.K6_STAGE_3 || '30s' },
          ],
        },
      },
    };
  }

  return {
    scenarios: {
      critical_routes: {
        executor: 'constant-vus',
        vus: Number(__ENV.K6_VUS || 12),
        duration: __ENV.K6_DURATION || '3m',
      },
    },
  };
}

export const options = {
  ...resolveOptions(loadProfile),
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<=1200'],
    critical_route_failures: ['rate<0.05'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
};

export function setup() {
  const { apiBaseUrl, apiPrefix, serviceBaseUrl } = resolveUrls(rawBaseUrl);
  const matchesUrl = `${apiBaseUrl}${apiPrefix}/matches?date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`;
  const matchesResponse = http.get(matchesUrl, {
    tags: {
      route: 'matches_seed',
    },
  });

  const seedOk = check(matchesResponse, {
    'seed matches returns 200': response => response.status === 200,
  });
  routeFailures.add(seedOk ? 0 : 1);

  const payload = matchesResponse.json();
  const fixtures = Array.isArray(payload?.response) ? payload.response : [];
  const selectedFixture = fixtures[0] || {};

  const competitionId =
    String(__ENV.K6_COMPETITION_ID || selectedFixture?.league?.id || '39');
  const leagueId =
    String(__ENV.K6_LEAGUE_ID || selectedFixture?.league?.id || competitionId);
  const teamId =
    String(__ENV.K6_TEAM_ID || selectedFixture?.teams?.home?.id || selectedFixture?.teams?.away?.id || '33');

  return {
    apiBaseUrl,
    apiPrefix,
    competitionId,
    date,
    leagueId,
    serviceBaseUrl,
    season,
    teamId,
    timezone,
  };
}

function recordCheck(response, name) {
  const ok = check(response, {
    [`${name} returns 200`]: current => current.status === 200,
  });
  routeFailures.add(ok ? 0 : 1);
}

export default function (data) {
  const matchesResponse = http.get(
    `${data.apiBaseUrl}${data.apiPrefix}/matches?date=${encodeURIComponent(data.date)}&timezone=${encodeURIComponent(data.timezone)}`,
    {
      tags: {
        route: 'matches',
      },
    },
  );
  recordCheck(matchesResponse, 'matches');

  const competitionMatchesResponse = http.get(
    `${data.apiBaseUrl}${data.apiPrefix}/competitions/${encodeURIComponent(data.competitionId)}/matches?season=${encodeURIComponent(data.season)}&limit=50`,
    {
      tags: {
        route: 'competition_matches',
      },
    },
  );
  recordCheck(competitionMatchesResponse, 'competition matches');

  const teamOverviewResponse = http.get(
    `${data.apiBaseUrl}${data.apiPrefix}/teams/${encodeURIComponent(data.teamId)}/overview?leagueId=${encodeURIComponent(data.leagueId)}&season=${encodeURIComponent(data.season)}&timezone=${encodeURIComponent(data.timezone)}`,
    {
      tags: {
        route: 'team_overview',
      },
    },
  );
  recordCheck(teamOverviewResponse, 'team overview');

  const readinessResponse = http.get(`${data.serviceBaseUrl}/readiness`, {
    tags: {
      route: 'readiness',
    },
  });
  recordCheck(readinessResponse, 'readiness');

  sleep(loadProfile === 'burst' ? 0.1 : 1);
}
