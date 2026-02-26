export const NAVIGATION_ROUTE_CHANGE_THROTTLE_MS = 300;

export type NavigationTelemetryRateLimitState = {
  lastTrackedAtMs: number;
  lastTransitionKey: string | null;
};

export function buildRouteTransitionKey(
  fromRoute: string | undefined,
  toRoute: string,
): string {
  return `${fromRoute ?? 'unknown'}->${toRoute}`;
}

export function shouldTrackRouteChangeEvent(
  state: NavigationTelemetryRateLimitState,
  transitionKey: string,
  nowMs: number,
  throttleMs: number = NAVIGATION_ROUTE_CHANGE_THROTTLE_MS,
): boolean {
  if (state.lastTransitionKey === transitionKey) {
    return false;
  }

  const elapsedMs = nowMs - state.lastTrackedAtMs;
  if (elapsedMs < throttleMs) {
    return false;
  }

  return true;
}
