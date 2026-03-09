import { buildBearerHeaders, readBooleanEnv, resolveServiceUrls } from './lib/service-urls.mjs';

const {
  serviceBaseUrl,
} = resolveServiceUrls(process.env.MOBILE_API_BASE_URL);

const metricsToken = process.env.OPS_METRICS_AUTH_BEARER_TOKEN?.trim() || '';
const metricsExpectPublic = readBooleanEnv(process.env.METRICS_EXPECT_PUBLIC, false);
const includeHealth = readBooleanEnv(process.env.PROBES_INCLUDE_HEALTH, true);

const serviceChecks = [
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
];

if (includeHealth) {
  serviceChecks.push({
    name: 'health',
    url: `${serviceBaseUrl}/health`,
    expectedStatuses: [200],
  });
}

function isPrometheusLikePayload(bodyText) {
  if (!bodyText.trim()) {
    return false;
  }

  return (
    bodyText.includes('# HELP ')
    || bodyText.includes('# TYPE ')
    || /^[a-zA-Z_:][a-zA-Z0-9_:]*(\{[^}]*\})?\s+[-+]?\d/m.test(bodyText)
  );
}

async function runCheck(check, options = {}) {
  const response = await fetch(check.url, {
    method: 'GET',
    headers: options.headers ?? {
      Accept: 'application/json',
    },
  }).catch(error => {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`[${check.name}] unable to reach ${check.url}. ${details}`);
  });

  const bodyText = await response.text();
  const bodySnippet = bodyText.length > 350 ? `${bodyText.slice(0, 350)}...` : bodyText;

  if (!check.expectedStatuses.includes(response.status)) {
    throw new Error(
      `[${check.name}] expected ${check.expectedStatuses.join(', ')} but got ${response.status}. Body: ${bodySnippet}`,
    );
  }

  if (typeof options.validateBody === 'function') {
    options.validateBody(bodyText, response.status);
  }

  console.log(`[OK] ${check.name}: HTTP ${response.status}`);
}

for (const check of serviceChecks) {
  await runCheck(check);
}

await runCheck(
  {
    name: 'metrics',
    url: `${serviceBaseUrl}/metrics`,
    expectedStatuses:
      metricsToken || metricsExpectPublic
        ? [200]
        : [200, 401, 403],
  },
  {
    headers: buildBearerHeaders(metricsToken, 'text/plain, application/openmetrics-text;q=0.9'),
    validateBody: (bodyText, status) => {
      if (status === 200 && !isPrometheusLikePayload(bodyText)) {
        throw new Error('[metrics] endpoint returned 200 but payload is not Prometheus-compatible.');
      }

      if ((status === 401 || status === 403) && (metricsToken || metricsExpectPublic)) {
        throw new Error(`[metrics] endpoint returned ${status} while public/authenticated access was expected.`);
      }
    },
  },
);

console.log('Service probes completed successfully.');
