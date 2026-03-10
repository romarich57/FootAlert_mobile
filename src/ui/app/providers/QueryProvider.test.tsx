import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { useQueryClient } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { QueryProvider } from '@ui/app/providers/QueryProvider';

const mockGetDatabase = jest.fn(async () => ({}));
const mockRunGarbageCollection = jest.fn(() => ({
  deletedByType: {
    team: 0,
    player: 0,
    competition: 0,
    match: 0,
  },
  matchesByDateDeleted: 0,
  dbSizeBytes: 4096,
}));
const mockHydrateQueryClientFromSqlite = jest.fn<
  {
    hydratedCounts: {
      team: number;
      player: number;
      competition: number;
      match: number;
    };
    durationMs: number;
  },
  [unknown, unknown]
>(() => ({
  hydratedCounts: {
    team: 1,
    player: 2,
    competition: 3,
    match: 4,
  },
  durationMs: 12,
}));
const mockBuildDefaultHydrationMappings = jest.fn<unknown[], [string]>(() => []);
const mockSetupQueryCacheSyncMiddleware = jest.fn<() => void, [unknown]>(() => jest.fn());
const mockGetStoreSizeBytes = jest.fn(() => 4096);
const mockTelemetry = {
  trackEvent: jest.fn(),
  trackError: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUserContext: jest.fn(),
  trackBatch: jest.fn(),
  flush: jest.fn(),
};

jest.mock('@data/db/database', () => ({
  getDatabase: () => mockGetDatabase(),
}));

jest.mock('@data/db/garbageCollector', () => ({
  runGarbageCollection: () => mockRunGarbageCollection(),
}));

jest.mock('@data/db/hydrationBridge', () => ({
  hydrateQueryClientFromSqlite: (queryClient: unknown, mappings: unknown) =>
    mockHydrateQueryClientFromSqlite(queryClient, mappings),
}));

jest.mock('@data/db/hydrationMappings', () => ({
  buildDefaultHydrationMappings: (timezone: string) =>
    mockBuildDefaultHydrationMappings(timezone),
}));

jest.mock('@data/db/queryCacheSyncMiddleware', () => ({
  setupQueryCacheSyncMiddleware: (queryCache: unknown) =>
    mockSetupQueryCacheSyncMiddleware(queryCache),
}));

jest.mock('@data/db/entityStore', () => ({
  getStoreSizeBytes: () => mockGetStoreSizeBytes(),
}));

jest.mock('@data/telemetry/mobileTelemetry', () => ({
  getMobileTelemetry: () => mockTelemetry,
}));

function Probe() {
  const queryClient = useQueryClient();

  return <Text>{queryClient ? 'ready' : 'missing'}</Text>;
}

describe('QueryProvider', () => {
  const originalJestWorkerId = process.env.JEST_WORKER_ID;
  const originalSqliteFlag = appEnv.mobileEnableSqliteLocalFirst;

  beforeEach(() => {
    jest.clearAllMocks();
    appEnv.mobileEnableSqliteLocalFirst = true;
    delete process.env.JEST_WORKER_ID;
  });

  afterEach(() => {
    appEnv.mobileEnableSqliteLocalFirst = originalSqliteFlag;

    if (originalJestWorkerId) {
      process.env.JEST_WORKER_ID = originalJestWorkerId;
      return;
    }

    delete process.env.JEST_WORKER_ID;
  });

  it('bootstraps SQLite before rendering children and installs sync middleware once', async () => {
    const screen = render(
      <QueryProvider enablePersistence={false}>
        <Probe />
      </QueryProvider>,
    );

    expect(screen.queryByText('ready')).toBeNull();

    await waitFor(() => {
      expect(screen.getByText('ready')).toBeTruthy();
    });

    expect(mockGetDatabase).toHaveBeenCalledTimes(1);
    expect(mockRunGarbageCollection).toHaveBeenCalledTimes(1);
    expect(mockBuildDefaultHydrationMappings).toHaveBeenCalledTimes(1);
    expect(mockHydrateQueryClientFromSqlite).toHaveBeenCalledTimes(1);
    expect(mockSetupQueryCacheSyncMiddleware).toHaveBeenCalledTimes(1);
    expect(mockTelemetry.trackEvent).toHaveBeenCalledWith(
      'db.bootstrap.complete',
      expect.objectContaining({
        hydrationDurationMs: 12,
        dbSizeBytes: 4096,
        hydratedTeams: 1,
        hydratedPlayers: 2,
        hydratedCompetitions: 3,
        hydratedMatches: 4,
      }),
    );

    const unsubscribe = mockSetupQueryCacheSyncMiddleware.mock.results[0]?.value;
    screen.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
