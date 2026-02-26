import { createBffMobileTelemetry } from './mobileTelemetry.bff';
import { createConsoleMobileTelemetry } from './mobileTelemetry.console';
import type { MobileTelemetry } from './mobileTelemetry.types';

export type {
  MobileTelemetry,
  TelemetryAttributes,
  TelemetryBatchEvent,
  TelemetryErrorContext,
  TelemetryFlushReason,
} from './mobileTelemetry.types';
export { createBffMobileTelemetry } from './mobileTelemetry.bff';

export function createNoopMobileTelemetry(): MobileTelemetry {
  return {
    trackEvent: () => undefined,
    trackError: () => undefined,
    setUserContext: () => undefined,
    addBreadcrumb: () => undefined,
    trackBatch: () => undefined,
    flush: async () => undefined,
  };
}

export function createDefaultMobileTelemetry(): MobileTelemetry {
  if (typeof __DEV__ === 'boolean' && __DEV__) {
    return createConsoleMobileTelemetry();
  }

  return createBffMobileTelemetry();
}

let activeTelemetry: MobileTelemetry = createNoopMobileTelemetry();

export function setMobileTelemetry(telemetry: MobileTelemetry): void {
  if (activeTelemetry !== telemetry) {
    activeTelemetry.flush('shutdown').catch(() => undefined);
  }
  activeTelemetry = telemetry;
}

export function getMobileTelemetry(): MobileTelemetry {
  return activeTelemetry;
}
