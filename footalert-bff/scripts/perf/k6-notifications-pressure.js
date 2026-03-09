import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const notificationFailures = new Rate('notifications_pressure_failures');
const ingestedEvents = new Counter('notifications_ingested_events_total');
const loadProfile = __ENV.K6_LOAD_PROFILE || 'staging';
const rawBaseUrl = (__ENV.BASE_URL || __ENV.MOBILE_API_BASE_URL || '').trim();
const ingestToken = (__ENV.NOTIFICATIONS_INGEST_TOKEN || '').trim();
const metricsToken = (__ENV.OPS_METRICS_AUTH_BEARER_TOKEN || '').trim();
const alertType = (__ENV.K6_NOTIFICATION_ALERT_TYPE || 'goal').trim();
const allowReadonly = (__ENV.K6_NOTIFICATIONS_ALLOW_READONLY || 'true').trim() !== 'false';

function resolveUrls(rawUrl) {
  if (!rawUrl) {
    throw new Error('Missing BASE_URL or MOBILE_API_BASE_URL for k6 notifications pressure.');
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
        notifications_pressure: {
          executor: 'constant-vus',
          vus: Number(__ENV.K6_VUS || 1),
          duration: __ENV.K6_DURATION || '20s',
        },
      },
    };
  }

  if (profile === 'model') {
    return {
      scenarios: {
        notifications_pressure: {
          executor: 'ramping-arrival-rate',
          startRate: Number(__ENV.K6_START_RATE || 3),
          timeUnit: '1s',
          preAllocatedVUs: Number(__ENV.K6_PREALLOCATED_VUS || 10),
          maxVUs: Number(__ENV.K6_MAX_VUS || 60),
          stages: [
            { target: Number(__ENV.K6_TARGET_RATE_1 || 8), duration: __ENV.K6_STAGE_1 || '1m' },
            { target: Number(__ENV.K6_TARGET_RATE_2 || 15), duration: __ENV.K6_STAGE_2 || '2m' },
            { target: 0, duration: __ENV.K6_STAGE_3 || '30s' },
          ],
        },
      },
    };
  }

  return {
    scenarios: {
      notifications_pressure: {
        executor: 'constant-arrival-rate',
        rate: Number(__ENV.K6_RATE || 4),
        timeUnit: '1s',
        duration: __ENV.K6_DURATION || '2m',
        preAllocatedVUs: Number(__ENV.K6_PREALLOCATED_VUS || 8),
        maxVUs: Number(__ENV.K6_MAX_VUS || 40),
      },
    },
  };
}

export const options = {
  ...resolveOptions(loadProfile),
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<=1200'],
    notifications_pressure_failures: ['rate<0.05'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
};

export function setup() {
  const { apiBaseUrl, apiPrefix, serviceBaseUrl } = resolveUrls(rawBaseUrl);
  const hasIngestToken = Boolean(ingestToken);
  if (!hasIngestToken && !allowReadonly) {
    throw new Error('Missing NOTIFICATIONS_INGEST_TOKEN for notifications pressure scenario.');
  }

  return {
    apiBaseUrl,
    apiPrefix,
    hasIngestToken,
    metricsHeaders: metricsToken
      ? {
          Accept: 'text/plain',
          Authorization: `Bearer ${metricsToken}`,
        }
      : {
          Accept: 'text/plain',
        },
    serviceBaseUrl,
  };
}

function recordCheck(response, name, expectedStatuses) {
  const ok = check(response, {
    [`${name} returns expected status`]: current => expectedStatuses.includes(current.status),
  });
  notificationFailures.add(ok ? 0 : 1);
}

export default function (data) {
  if (data.hasIngestToken) {
    const eventResponse = http.post(
      `${data.apiBaseUrl}${data.apiPrefix}/notifications/events`,
      JSON.stringify({
        source: 'k6',
        externalEventId: `k6-${__VU}-${__ITER}-${Date.now()}`,
        alertType,
        occurredAt: new Date().toISOString(),
        fixtureId: null,
        competitionId: null,
        teamIds: [],
        playerIds: [],
        title: 'k6 queue pressure',
        body: 'Synthetic notifications enqueue pressure.',
        payload: {
          profile: loadProfile,
          vu: __VU,
          iter: __ITER,
        },
      }),
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${ingestToken}`,
          'Content-Type': 'application/json',
        },
        tags: {
          route: 'notifications_events',
        },
      },
    );
    recordCheck(eventResponse, 'notifications events', [200]);

    if (eventResponse.status === 200) {
      ingestedEvents.add(1);
    }
  }

  const readinessResponse = http.get(`${data.serviceBaseUrl}/readiness`, {
    tags: {
      route: 'readiness',
    },
  });
  recordCheck(readinessResponse, 'readiness', [200]);

  const metricsResponse = http.get(`${data.serviceBaseUrl}/metrics`, {
    headers: data.metricsHeaders,
    tags: {
      route: 'metrics',
    },
  });
  recordCheck(metricsResponse, 'metrics', metricsToken ? [200] : [200, 401, 403]);

  sleep(loadProfile === 'smoke' ? 0.5 : 1);
}
