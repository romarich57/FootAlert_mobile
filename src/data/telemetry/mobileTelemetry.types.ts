export type TelemetryAttributes = Record<
  string,
  string | number | boolean | null | undefined
>;

export type TelemetryErrorContext = {
  feature?: string;
  status?: number;
  url?: string;
  method?: string;
  details?: TelemetryAttributes;
};

export type TelemetryEndpointPath =
  | '/telemetry/events'
  | '/telemetry/errors'
  | '/telemetry/breadcrumbs';

export type TelemetryBatchEndpointPath =
  | '/telemetry/events/batch'
  | '/telemetry/errors/batch'
  | '/telemetry/breadcrumbs/batch';

export type TelemetryScalar = string | number | boolean | null;
export type TelemetryPayload = Record<string, TelemetryScalar>;

export type TelemetryBatchEvent = {
  path: TelemetryEndpointPath;
  payload: Record<string, unknown>;
};

export type TelemetryFlushReason =
  | 'interval'
  | 'batch_size'
  | 'app_state_change'
  | 'shutdown'
  | 'manual';

export interface MobileTelemetry {
  trackEvent: (eventName: string, attributes?: TelemetryAttributes) => void;
  trackError: (
    error: unknown,
    context?: TelemetryErrorContext,
  ) => void;
  setUserContext: (attributes: TelemetryAttributes) => void;
  addBreadcrumb: (name: string, attributes?: TelemetryAttributes) => void;
  trackBatch: (events: TelemetryBatchEvent[]) => void;
  flush: (reason?: TelemetryFlushReason) => Promise<void>;
}

export const TELEMETRY_QUEUE_MAX_EVENTS = 100;
export const TELEMETRY_FLUSH_BATCH_SIZE = 20;
export const TELEMETRY_FLUSH_INTERVAL_MS = 5_000;
