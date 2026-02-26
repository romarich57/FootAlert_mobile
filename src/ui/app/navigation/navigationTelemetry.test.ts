import {
  buildRouteTransitionKey,
  NAVIGATION_ROUTE_CHANGE_THROTTLE_MS,
  shouldTrackRouteChangeEvent,
  type NavigationTelemetryRateLimitState,
} from '@ui/app/navigation/navigationTelemetry';

describe('navigationTelemetry', () => {
  it('builds deterministic transition keys', () => {
    expect(buildRouteTransitionKey('Matches', 'TeamDetails')).toBe('Matches->TeamDetails');
    expect(buildRouteTransitionKey(undefined, 'More')).toBe('unknown->More');
  });

  it('throttles events inside the 300ms window', () => {
    const state: NavigationTelemetryRateLimitState = {
      lastTrackedAtMs: 1_000,
      lastTransitionKey: 'Matches->TeamDetails',
    };

    const shouldTrack = shouldTrackRouteChangeEvent(
      state,
      'TeamDetails->More',
      1_250,
      NAVIGATION_ROUTE_CHANGE_THROTTLE_MS,
    );

    expect(shouldTrack).toBe(false);
  });

  it('drops identical consecutive transitions', () => {
    const state: NavigationTelemetryRateLimitState = {
      lastTrackedAtMs: 1_000,
      lastTransitionKey: 'Matches->TeamDetails',
    };

    const shouldTrack = shouldTrackRouteChangeEvent(
      state,
      'Matches->TeamDetails',
      2_000,
      NAVIGATION_ROUTE_CHANGE_THROTTLE_MS,
    );

    expect(shouldTrack).toBe(false);
  });

  it('allows a different transition after the throttle window', () => {
    const state: NavigationTelemetryRateLimitState = {
      lastTrackedAtMs: 1_000,
      lastTransitionKey: 'Matches->TeamDetails',
    };

    const shouldTrack = shouldTrackRouteChangeEvent(
      state,
      'TeamDetails->More',
      1_500,
      NAVIGATION_ROUTE_CHANGE_THROTTLE_MS,
    );

    expect(shouldTrack).toBe(true);
  });
});
