import BackgroundFetch from 'react-native-background-fetch';
import { DevSettings } from 'react-native';

import {
  isBackgroundRefreshEligible,
  registerBackgroundRefresh,
  registerBackgroundRefreshDebugMenuItem,
  resetBackgroundRefreshStateForTests,
  triggerDebugBackgroundRefresh,
} from '@data/background/backgroundRefresh';

const mockFetchAllLeagues = jest.fn<Promise<unknown[]>, [AbortSignal?]>(async () => []);
const mockBuildMatchesQueryResult = jest.fn<Promise<unknown[]>, [unknown]>(async () => []);
const mockRunGarbageCollection = jest.fn(() => ({
  deletedByType: {
    team: 0,
    player: 0,
    competition: 0,
    match: 0,
  },
  matchesByDateDeleted: 0,
  dbSizeBytes: 2048,
}));
const mockTelemetry = {
  trackEvent: jest.fn(),
  trackError: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUserContext: jest.fn(),
  trackBatch: jest.fn(),
  flush: jest.fn(),
};

jest.mock('@data/endpoints/competitionsApi', () => ({
  fetchAllLeagues: (signal?: AbortSignal) => mockFetchAllLeagues(signal),
}));

jest.mock('@data/matches/matchesQueryData', () => ({
  MATCHES_QUERY_STALE_TIME_MS: 30_000,
  shouldRetryMatchesQuery: () => false,
  buildMatchesQueryResult: (params: unknown) => mockBuildMatchesQueryResult(params),
}));

jest.mock('@data/db/garbageCollector', () => ({
  runGarbageCollection: () => mockRunGarbageCollection(),
}));

jest.mock('@data/telemetry/mobileTelemetry', () => ({
  getMobileTelemetry: () => mockTelemetry,
}));

const mockedBackgroundFetchConfigure = jest.mocked(BackgroundFetch.configure);
const mockedBackgroundFetchScheduleTask = jest.mocked(BackgroundFetch.scheduleTask);
const mockedBackgroundFetchFinish = jest.mocked(BackgroundFetch.finish);
const mockedDevSettingsAddMenuItem = jest.spyOn(DevSettings, 'addMenuItem');
const runtimeGlobal = globalThis as typeof globalThis & { __DEV__?: boolean };

describe('backgroundRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetBackgroundRefreshStateForTests();
    mockedBackgroundFetchConfigure.mockResolvedValue(2 as never);
    mockedBackgroundFetchScheduleTask.mockResolvedValue(undefined as never);
    runtimeGlobal.__DEV__ = true;
  });

  it('blocks registration until the app hydration is complete', async () => {
    expect(
      isBackgroundRefreshEligible({
        isHydrated: false,
      }),
    ).toEqual({
      allowed: false,
      reason: 'not_hydrated',
    });

    await registerBackgroundRefresh({
      isHydrated: false,
    });

    expect(mockedBackgroundFetchConfigure).not.toHaveBeenCalled();
    expect(mockTelemetry.trackEvent).toHaveBeenCalledWith(
      'background.refresh.skipped',
      expect.objectContaining({
        reason: 'not_hydrated',
      }),
    );
  });

  it('blocks registration while low power mode is active', async () => {
    expect(
      isBackgroundRefreshEligible({
        isHydrated: true,
        isOnline: true,
        lowPowerMode: true,
      }),
    ).toEqual({
      allowed: false,
      reason: 'low_power_mode',
    });

    await registerBackgroundRefresh({
      isHydrated: true,
      isOnline: true,
      lowPowerMode: true,
    });

    expect(mockedBackgroundFetchConfigure).not.toHaveBeenCalled();
    expect(mockTelemetry.trackEvent).toHaveBeenCalledWith(
      'background.refresh.skipped',
      expect.objectContaining({
        reason: 'low_power_mode',
      }),
    );
  });

  it('registers background refresh once when runtime conditions are eligible', async () => {
    await registerBackgroundRefresh({
      isHydrated: true,
      isOnline: true,
      lowPowerMode: false,
    });

    expect(mockedBackgroundFetchConfigure).toHaveBeenCalledTimes(1);
    expect(mockedBackgroundFetchScheduleTask).toHaveBeenCalledTimes(1);
    expect(mockTelemetry.trackEvent).toHaveBeenCalledWith(
      'background.refresh.registered',
      expect.objectContaining({
        taskId: 'com.footalert.app.refresh',
      }),
    );

    expect(
      isBackgroundRefreshEligible({
        isHydrated: true,
        isOnline: true,
        lowPowerMode: false,
      }),
    ).toEqual({
      allowed: false,
      reason: 'already_registered',
    });
  });

  it('warms cache, runs GC and tracks completion when the background task fires', async () => {
    const queryClient = {
      prefetchQuery: jest.fn(async options =>
        options.queryFn({ signal: new AbortController().signal })),
    } as any;

    await registerBackgroundRefresh({
      isHydrated: true,
      isOnline: true,
      lowPowerMode: false,
      queryClient,
    });

    const taskHandler = mockedBackgroundFetchConfigure.mock.calls[0]?.[1];
    expect(taskHandler).toBeDefined();

    await taskHandler?.('bg-task');

    expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(2);
    expect(mockFetchAllLeagues).toHaveBeenCalledTimes(1);
    expect(mockBuildMatchesQueryResult).toHaveBeenCalledTimes(1);
    expect(mockRunGarbageCollection).toHaveBeenCalledTimes(1);
    expect(mockedBackgroundFetchFinish).toHaveBeenCalledWith('bg-task');
    expect(mockTelemetry.trackEvent).toHaveBeenCalledWith(
      'background.refresh.completed',
      expect.objectContaining({
        dbSizeBytes: 2048,
      }),
    );
  });

  it('registers a dev-only menu item once and uses the same refresh pipeline on demand', async () => {
    const queryClient = {
      prefetchQuery: jest.fn(async options =>
        options.queryFn({ signal: new AbortController().signal })),
    } as any;

    registerBackgroundRefreshDebugMenuItem({
      queryClient,
    });
    registerBackgroundRefreshDebugMenuItem({
      queryClient,
    });

    expect(mockedDevSettingsAddMenuItem).toHaveBeenCalledTimes(1);
    expect(mockedDevSettingsAddMenuItem).toHaveBeenCalledWith(
      'Run SQLite Background Refresh',
      expect.any(Function),
    );

    const handler = mockedDevSettingsAddMenuItem.mock.calls[0]?.[1];
    expect(handler).toBeDefined();

    await handler?.();

    expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(2);
    expect(mockFetchAllLeagues).toHaveBeenCalledTimes(1);
    expect(mockBuildMatchesQueryResult).toHaveBeenCalledTimes(1);
    expect(mockTelemetry.trackEvent).toHaveBeenCalledWith(
      'background.refresh.debug_triggered',
      expect.objectContaining({
        source: 'dev_menu',
      }),
    );
  });

  it('does not trigger the debug refresh helper outside dev runtime', async () => {
    runtimeGlobal.__DEV__ = false;

    const result = await triggerDebugBackgroundRefresh();

    expect(result).toBe(false);
    expect(mockFetchAllLeagues).not.toHaveBeenCalled();
    expect(mockBuildMatchesQueryResult).not.toHaveBeenCalled();
  });
});
