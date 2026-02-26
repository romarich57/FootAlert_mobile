import type {
  TelemetryAttributes,
  TelemetryPayload,
} from './mobileTelemetry.types';

export function toTelemetryPayload(attributes: TelemetryAttributes | undefined): TelemetryPayload {
  if (!attributes) {
    return {};
  }

  return Object.entries(attributes).reduce<TelemetryPayload>((accumulator, [key, value]) => {
    if (typeof value === 'undefined') {
      return accumulator;
    }

    accumulator[key] = value;
    return accumulator;
  }, {});
}

export function serializeError(error: unknown): {
  name: string;
  message: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
    };
  }

  let serialized = '[unserializable-error]';
  try {
    serialized = JSON.stringify(error);
  } catch {
    serialized = String(error);
  }

  return {
    name: 'UnknownError',
    message: serialized,
  };
}
