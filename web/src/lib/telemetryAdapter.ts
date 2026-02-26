import type { TelemetryAdapter, TelemetryAttributes } from '@app-core';

export const browserTelemetryAdapter: TelemetryAdapter = {
  addBreadcrumb(name: string, attributes?: TelemetryAttributes) {
    console.info(`[web.breadcrumb] ${name}`, attributes ?? {});
  },
  trackError(
    error: unknown,
    context: { feature: string; endpoint: string; details?: TelemetryAttributes },
  ) {
    console.error('[web.error]', {
      context,
      error,
    });
  },
};
