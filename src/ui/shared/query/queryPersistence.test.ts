import { QueryClient, dehydrate } from '@tanstack/react-query';

import {
  MAX_PERSIST_BYTES,
  safeAsyncStoragePersister,
  shouldDehydrateQuery,
} from '@ui/shared/query/queryPersistence';

const mockTrackEvent = jest.fn();

jest.mock('@data/telemetry/mobileTelemetry', () => ({
  getMobileTelemetry: () => ({
    trackEvent: mockTrackEvent,
    trackError: jest.fn(),
    setUserContext: jest.fn(),
    addBreadcrumb: jest.fn(),
    trackBatch: jest.fn(),
    flush: jest.fn(async () => undefined),
  }),
}));

type MockStorage = {
  getItem: jest.MockedFunction<(key: string) => Promise<string | null>>;
  setItem: jest.MockedFunction<(key: string, value: string) => Promise<void>>;
  removeItem: jest.MockedFunction<(key: string) => Promise<void>>;
};

function createMockStorage(): MockStorage {
  return {
    getItem: jest.fn(async (_key: string) => null),
    setItem: jest.fn(async (_key: string, _value: string) => undefined),
    removeItem: jest.fn(async (_key: string) => undefined),
  };
}

describe('queryPersistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps only lightweight allowlisted queries for dehydration', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });

    queryClient.setQueryData(['follows', 'followed-team-ids'], ['529']);
    queryClient.setQueryData(['follows', 'discovery', 'teams', 8], { items: [] });
    queryClient.setQueryData(['competitions', 'catalog'], []);
    queryClient.setQueryData(['competitions', 'details', 'header', '39'], { id: '39' });
    queryClient.setQueryData(['teams', 'details', '529'], { id: '529' });
    queryClient.setQueryData(['team_squad', '529'], { players: [] });
    queryClient.setQueryData(['player_stats_catalog', 'v2', '276'], { competitions: [] });
    queryClient.setQueryData(['match_details', '111', 'Europe/Paris'], { fixture: { id: '111' } });
    queryClient.setQueryData(['competition_standings', 39, 2025], []);
    queryClient.setQueryData(['competition_seasons', 39], []);
    queryClient.setQueryData(['search', 'global', 'barca', 'Europe/Paris', 2025, 20], []);
    queryClient.setQueryData(['team_stats', '529', '39', 2025], {});
    queryClient.setQueryData(['follows', 'team-cards', 'Europe/Paris', '529'], []);
    queryClient.setQueryData(['match_details', '111', 'events'], []);

    const queryCache = queryClient.getQueryCache();
    const followedTeamsQuery = queryCache.find({ queryKey: ['follows', 'followed-team-ids'] });
    const discoveryQuery = queryCache.find({ queryKey: ['follows', 'discovery', 'teams', 8] });
    const competitionsCatalogQuery = queryCache.find({ queryKey: ['competitions', 'catalog'] });
    const competitionsHeaderQuery = queryCache.find({
      queryKey: ['competitions', 'details', 'header', '39'],
    });
    const teamDetailsQuery = queryCache.find({ queryKey: ['teams', 'details', '529'] });
    const teamSquadQuery = queryCache.find({ queryKey: ['team_squad', '529'] });
    const playerStatsCatalogQuery = queryCache.find({
      queryKey: ['player_stats_catalog', 'v2', '276'],
    });
    const matchDetailsQuery = queryCache.find({
      queryKey: ['match_details', '111', 'Europe/Paris'],
    });
    const competitionStandingsQuery = queryCache.find({
      queryKey: ['competition_standings', 39, 2025],
    });
    const competitionSeasonsQuery = queryCache.find({
      queryKey: ['competition_seasons', 39],
    });
    const globalSearchQuery = queryCache.find({
      queryKey: ['search', 'global', 'barca', 'Europe/Paris', 2025, 20],
    });
    const teamStatsQuery = queryCache.find({ queryKey: ['team_stats', '529', '39', 2025] });
    const teamCardsQuery = queryCache.find({
      queryKey: ['follows', 'team-cards', 'Europe/Paris', '529'],
    });
    const matchEventsQuery = queryCache.find({
      queryKey: ['match_details', '111', 'events'],
    });

    expect(followedTeamsQuery && shouldDehydrateQuery(followedTeamsQuery)).toBe(true);
    expect(discoveryQuery && shouldDehydrateQuery(discoveryQuery)).toBe(true);
    expect(competitionsCatalogQuery && shouldDehydrateQuery(competitionsCatalogQuery)).toBe(true);
    expect(competitionsHeaderQuery && shouldDehydrateQuery(competitionsHeaderQuery)).toBe(true);
    expect(teamDetailsQuery && shouldDehydrateQuery(teamDetailsQuery)).toBe(true);
    expect(teamSquadQuery && shouldDehydrateQuery(teamSquadQuery)).toBe(true);
    expect(playerStatsCatalogQuery && shouldDehydrateQuery(playerStatsCatalogQuery)).toBe(true);
    expect(matchDetailsQuery && shouldDehydrateQuery(matchDetailsQuery)).toBe(true);
    expect(competitionStandingsQuery && shouldDehydrateQuery(competitionStandingsQuery)).toBe(true);
    expect(competitionSeasonsQuery && shouldDehydrateQuery(competitionSeasonsQuery)).toBe(true);
    expect(globalSearchQuery && shouldDehydrateQuery(globalSearchQuery)).toBe(false);
    expect(teamStatsQuery && shouldDehydrateQuery(teamStatsQuery)).toBe(false);
    expect(teamCardsQuery && shouldDehydrateQuery(teamCardsQuery)).toBe(false);
    expect(matchEventsQuery && shouldDehydrateQuery(matchEventsQuery)).toBe(false);
  });

  it('clears a corrupted persisted snapshot during restore without throwing', async () => {
    const storage = createMockStorage();
    storage.getItem.mockResolvedValueOnce('{bad-json');
    const persister = safeAsyncStoragePersister({
      key: 'query-cache-test',
      storage,
      throttleTime: 0,
    });

    await expect(persister.restoreClient()).resolves.toBeUndefined();

    expect(storage.removeItem).toHaveBeenCalledWith('query-cache-test');
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'query_persist.restore_cleared',
      expect.objectContaining({
        reason: 'deserialize_error',
      }),
    );
  });

  it('skips oversized writes and removes the old snapshot', async () => {
    const storage = createMockStorage();
    const persister = safeAsyncStoragePersister({
      key: 'query-cache-test',
      storage,
      throttleTime: 0,
      maxBytes: 128,
    });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });

    queryClient.setQueryData(['follows', 'discovery', 'teams', 8], {
      items: [
        {
          teamId: '529',
          teamName: 'Barcelona',
          teamLogo: 'barca.png',
          country: 'Spain',
          activeFollowersCount: 0,
          recentNet30d: 0,
          totalFollowAdds: 0,
          blob: 'x'.repeat(MAX_PERSIST_BYTES),
        },
      ],
      meta: {
        source: 'dynamic',
      },
    });

    await persister.persistClient({
      buster: 'v4',
      timestamp: Date.now(),
      clientState: dehydrate(queryClient, {
        shouldDehydrateQuery: () => true,
      }),
    });

    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).toHaveBeenCalledWith('query-cache-test');
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'query_persist.write_skipped_oversize',
      expect.objectContaining({
        reason: 'oversize',
      }),
    );
  });

  it('supports a larger custom persistence budget when explicitly configured', async () => {
    const storage = createMockStorage();
    const persister = safeAsyncStoragePersister({
      key: 'query-cache-test',
      storage,
      throttleTime: 0,
      maxBytes: 1_048_576,
    });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });

    queryClient.setQueryData(['follows', 'discovery', 'teams', 8], {
      items: [
        {
          teamId: '529',
          teamName: 'Barcelona',
          teamLogo: 'barca.png',
          country: 'Spain',
          activeFollowersCount: 0,
          recentNet30d: 0,
          totalFollowAdds: 0,
          blob: 'x'.repeat(700_000),
        },
      ],
      meta: {
        source: 'dynamic',
      },
    });

    await persister.persistClient({
      buster: 'v4',
      timestamp: Date.now(),
      clientState: dehydrate(queryClient, {
        shouldDehydrateQuery: () => true,
      }),
    });

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});
