import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseRuntimePayloadOrFallback } from '../../dist/runtime/validation.js';

function createTelemetryRecorder() {
  const breadcrumbs = [];
  const errors = [];

  return {
    telemetry: {
      addBreadcrumb(name) {
        breadcrumbs.push({ name });
      },
      trackError(error) {
        errors.push(error);
      },
    },
    breadcrumbs,
    errors,
  };
}

describe('parseRuntimePayloadOrFallback', () => {
  it('returns parsed payload when schema validation succeeds', () => {
    const { telemetry, breadcrumbs, errors } = createTelemetryRecorder();
    const schema = {
      safeParse(value) {
        const isValid =
          Boolean(value)
          && typeof value === 'object'
          && Array.isArray(value.response)
          && value.response.every(item => typeof item === 'string');

        if (isValid) {
          return {
            success: true,
            data: value,
          };
        }

        return {
          success: false,
          error: new Error('invalid payload'),
        };
      },
    };

    const result = parseRuntimePayloadOrFallback({
      schema,
      payload: { response: ['ok'] },
      fallback: { response: [] },
      telemetry,
      feature: 'tests.runtime.success',
      endpoint: '/tests/success',
    });

    assert.deepEqual(result, { response: ['ok'] });
    assert.equal(breadcrumbs.length, 0);
    assert.equal(errors.length, 0);
  });

  it('returns fallback and emits telemetry when validation fails', () => {
    const { telemetry, breadcrumbs, errors } = createTelemetryRecorder();
    const schema = {
      safeParse() {
        return {
          success: false,
          error: new Error('invalid payload'),
        };
      },
    };

    const fallback = { response: ['fallback'] };
    const result = parseRuntimePayloadOrFallback({
      schema,
      payload: { response: [1, 2, 3] },
      fallback,
      telemetry,
      feature: 'tests.runtime.fallback',
      endpoint: '/tests/fallback',
    });

    assert.equal(result, fallback);
    assert.deepEqual(
      breadcrumbs.map(entry => entry.name),
      ['network.payload_validation_failed'],
    );
    assert.equal(errors.length, 1);
  });
});
