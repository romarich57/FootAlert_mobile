const rawBaseUrl = process.env.MOBILE_API_BASE_URL?.trim();

if (!rawBaseUrl) {
  throw new Error('Missing MOBILE_API_BASE_URL for staging smoke tests.');
}

const apiBaseUrl = rawBaseUrl.replace(/\/+$/, '');
const hasVersionPrefix = /\/v1$/.test(apiBaseUrl);
const serviceBaseUrl = hasVersionPrefix ? apiBaseUrl.replace(/\/v1$/, '') : apiBaseUrl;
const apiPrefix = hasVersionPrefix ? '' : '/v1';

const now = new Date();
const defaultSeason = Math.max(now.getUTCFullYear() - 1, 2024);
const date = process.env.SMOKE_DATE?.trim() || now.toISOString().slice(0, 10);
const timezone = process.env.SMOKE_TIMEZONE?.trim() || 'UTC';
const season = process.env.SMOKE_SEASON?.trim() || String(defaultSeason);
const leagueIds = process.env.SMOKE_LEAGUE_IDS?.trim() || '39,140';

const checks = [
  {
    name: 'health',
    url: `${serviceBaseUrl}/health`,
    expectedStatuses: [200],
  },
  {
    name: 'competitions',
    url: `${apiBaseUrl}${apiPrefix}/competitions`,
    expectedStatuses: [200],
  },
  {
    name: 'matches',
    url: `${apiBaseUrl}${apiPrefix}/matches?date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`,
    expectedStatuses: [200],
  },
  {
    name: 'teams trends',
    url: `${apiBaseUrl}${apiPrefix}/follows/trends/teams?leagueIds=${encodeURIComponent(leagueIds)}&season=${encodeURIComponent(season)}`,
    expectedStatuses: [200],
  },
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
}

for (const check of checks) {
  await runCheck(check);
}

console.log('Staging smoke checks completed successfully.');
