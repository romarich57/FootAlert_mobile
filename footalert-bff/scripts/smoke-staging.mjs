import { resolveServiceUrls } from './lib/service-urls.mjs';

const {
  apiBaseUrl,
  apiPrefix,
  serviceBaseUrl,
} = resolveServiceUrls(process.env.MOBILE_API_BASE_URL);

const now = new Date();
const defaultSeason = Math.max(now.getUTCFullYear() - 1, 2024);
const date = process.env.SMOKE_DATE?.trim() || now.toISOString().slice(0, 10);
const timezone = process.env.SMOKE_TIMEZONE?.trim() || 'UTC';
const season = process.env.SMOKE_SEASON?.trim() || String(defaultSeason);
const leagueIds = process.env.SMOKE_LEAGUE_IDS?.trim() || '39,140';
const smokeMatchId = process.env.SMOKE_MATCH_ID?.trim();
const smokeTeamId = process.env.SMOKE_TEAM_ID?.trim();

const coreChecks = [
  {
    name: 'health',
    url: `${serviceBaseUrl}/health`,
    expectedStatuses: [200],
  },
  {
    name: 'liveness',
    url: `${serviceBaseUrl}/liveness`,
    expectedStatuses: [200],
  },
  {
    name: 'readiness',
    url: `${serviceBaseUrl}/readiness`,
    expectedStatuses: [200],
  },
  {
    name: 'competitions',
    url: `${apiBaseUrl}${apiPrefix}/competitions`,
    expectedStatuses: [200],
  },
  {
    name: 'capabilities',
    url: `${apiBaseUrl}${apiPrefix}/capabilities`,
    expectedStatuses: [200],
  },
  {
    name: 'teams trends',
    url: `${apiBaseUrl}${apiPrefix}/follows/trends/teams?leagueIds=${encodeURIComponent(leagueIds)}&season=${encodeURIComponent(season)}`,
    expectedStatuses: [200],
  },
];

const validationChecks = [
  {
    name: 'validation: matches missing timezone',
    url: `${apiBaseUrl}${apiPrefix}/matches?date=${encodeURIComponent(date)}`,
    expectedStatuses: [400],
  },
  {
    name: 'validation: standings missing season',
    url: `${apiBaseUrl}${apiPrefix}/teams/standings?leagueId=39`,
    expectedStatuses: [400],
  },
];

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function toNumericString(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return value;
  }

  return null;
}

async function runCheck(check) {
  let response;
  try {
    response = await fetch(check.url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`[${check.name}] unable to reach ${check.url}. ${details}`);
  }

  const bodyText = await response.text();
  const bodySnippet = bodyText.length > 350 ? `${bodyText.slice(0, 350)}...` : bodyText;

  if (!check.expectedStatuses.includes(response.status)) {
    throw new Error(
      `[${check.name}] expected ${check.expectedStatuses.join(', ')} but got ${response.status}. Body: ${bodySnippet}`,
    );
  }

  console.log(`[OK] ${check.name}: HTTP ${response.status}`);

  return {
    response,
    bodyText,
  };
}

for (const check of coreChecks) {
  await runCheck(check);
}

const matchesCheck = {
  name: 'matches',
  url: `${apiBaseUrl}${apiPrefix}/matches?date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`,
  expectedStatuses: [200],
};

const matchesResult = await runCheck(matchesCheck);
const matchesPayload = parseJsonSafe(matchesResult.bodyText);
const fixtures = Array.isArray(matchesPayload?.response) ? matchesPayload.response : [];

const selectedFixture =
  smokeMatchId
    ? fixtures.find(fixture => toNumericString(fixture?.fixture?.id) === smokeMatchId)
    : fixtures[0];

const matchId = smokeMatchId ?? toNumericString(selectedFixture?.fixture?.id);
if (!matchId) {
  throw new Error(
    '[match details] unable to resolve fixture id from /v1/matches. Provide SMOKE_MATCH_ID.',
  );
}

const homeTeamIdFromFixture = toNumericString(selectedFixture?.teams?.home?.id);
const awayTeamIdFromFixture = toNumericString(selectedFixture?.teams?.away?.id);
const teamIdForPlayers = smokeTeamId ?? homeTeamIdFromFixture ?? awayTeamIdFromFixture;
if (!teamIdForPlayers) {
  throw new Error(
    '[match details] unable to resolve team id for /players/:teamId/stats. Provide SMOKE_TEAM_ID.',
  );
}

const detailChecks = [
  {
    name: 'match details',
    url: `${apiBaseUrl}${apiPrefix}/matches/${encodeURIComponent(matchId)}?timezone=${encodeURIComponent(timezone)}`,
    expectedStatuses: [200],
  },
  {
    name: 'match events',
    url: `${apiBaseUrl}${apiPrefix}/matches/${encodeURIComponent(matchId)}/events`,
    expectedStatuses: [200],
  },
  {
    name: 'match statistics',
    url: `${apiBaseUrl}${apiPrefix}/matches/${encodeURIComponent(matchId)}/statistics`,
    expectedStatuses: [200],
  },
  {
    name: 'match statistics first half',
    url: `${apiBaseUrl}${apiPrefix}/matches/${encodeURIComponent(matchId)}/statistics?period=first`,
    expectedStatuses: [200],
  },
  {
    name: 'match statistics second half',
    url: `${apiBaseUrl}${apiPrefix}/matches/${encodeURIComponent(matchId)}/statistics?period=second`,
    expectedStatuses: [200],
  },
  {
    name: 'match lineups',
    url: `${apiBaseUrl}${apiPrefix}/matches/${encodeURIComponent(matchId)}/lineups`,
    expectedStatuses: [200],
  },
  {
    name: 'match head-to-head',
    url: `${apiBaseUrl}${apiPrefix}/matches/${encodeURIComponent(matchId)}/head-to-head?last=5&timezone=${encodeURIComponent(timezone)}`,
    expectedStatuses: [200],
  },
  {
    name: 'match predictions',
    url: `${apiBaseUrl}${apiPrefix}/matches/${encodeURIComponent(matchId)}/predictions`,
    expectedStatuses: [200],
  },
  {
    name: 'match absences',
    url: `${apiBaseUrl}${apiPrefix}/matches/${encodeURIComponent(matchId)}/absences?timezone=${encodeURIComponent(timezone)}`,
    expectedStatuses: [200],
  },
  {
    name: 'match players stats',
    url: `${apiBaseUrl}${apiPrefix}/matches/${encodeURIComponent(matchId)}/players/${encodeURIComponent(teamIdForPlayers)}/stats`,
    expectedStatuses: [200],
  },
];

for (const check of detailChecks) {
  await runCheck(check);
}

for (const check of validationChecks) {
  await runCheck(check);
}

console.log(
  `Staging smoke checks completed successfully (fixtureId=${matchId}, teamId=${teamIdForPlayers}).`,
);
