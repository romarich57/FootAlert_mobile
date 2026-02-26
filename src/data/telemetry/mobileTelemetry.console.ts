import type {
  MobileTelemetry,
  TelemetryAttributes,
  TelemetryErrorContext,
} from './mobileTelemetry.types';

export function createConsoleMobileTelemetry(): MobileTelemetry {
  const userContext: TelemetryAttributes = {};

  const shouldSuppressExpectedErrorLog = (
    error: unknown,
    context?: TelemetryErrorContext,
  ): boolean => {
    if (
      context?.feature === 'network' &&
      typeof context.status === 'number' &&
      context.status >= 400 &&
      context.status < 500
    ) {
      return true;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      return true;
    }

    return false;
  };

  const shouldLogNetworkErrorAsWarning = (context?: TelemetryErrorContext): boolean => {
    return (
      context?.feature === 'network' &&
      typeof context.status === 'number' &&
      context.status >= 500
    );
  };

  return {
    trackEvent: (eventName, attributes) => {
      console.info('[telemetry:event]', eventName, {
        ...userContext,
        ...(attributes ?? {}),
      });
    },
    trackError: (error, context) => {
      const payload = {
        error,
        context,
        userContext,
      };

      if (shouldSuppressExpectedErrorLog(error, context)) {
        return;
      }

      if (shouldLogNetworkErrorAsWarning(context)) {
        console.warn('[telemetry:warning]', payload);
        return;
      }

      console.error('[telemetry:error]', payload);
    },
    setUserContext: attributes => {
      Object.assign(userContext, attributes);
    },
    addBreadcrumb: (name, attributes) => {
      console.info('[telemetry:breadcrumb]', name, {
        ...userContext,
        ...(attributes ?? {}),
      });
    },
    trackBatch: events => {
      events.forEach(event => {
        console.info('[telemetry:batch]', event.path, event.payload);
      });
    },
    flush: async () => undefined,
  };
}
