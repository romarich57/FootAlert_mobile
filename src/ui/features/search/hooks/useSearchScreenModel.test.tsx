import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';

import { appEnv } from '@data/config/env';
import {
  fetchDiscoveryPlayers,
  fetchDiscoveryTeams,
  searchTeamsByName,
} from '@data/endpoints/followsApi';
import { searchGlobal } from '@data/endpoints/searchApi';
import { useSearchScreenModel } from '@ui/features/search/hooks/useSearchScreenModel';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
  };
});

jest.mock('@data/endpoints/searchApi', () => ({
  searchGlobal: jest.fn(async () => ({
    teams: [],
    players: [],
    competitions: [],
    matches: [],
    meta: {
      partial: false,
      degradedSources: [],
    },
  })),
}));

jest.mock('@data/endpoints/followsApi', () => ({
  fetchDiscoveryPlayers: jest.fn(async () => ({
    items: [],
    meta: {
      source: 'dynamic',
      complete: true,
      seedCount: 0,
      generatedAt: '2026-03-07T00:00:00.000Z',
      refreshAfterMs: null,
    },
  })),
  fetchDiscoveryTeams: jest.fn(async () => ({
    items: [],
    meta: {
      source: 'dynamic',
      complete: true,
      seedCount: 0,
      generatedAt: '2026-03-07T00:00:00.000Z',
      refreshAfterMs: null,
    },
  })),
  searchPlayersByName: jest.fn(async () => []),
  searchTeamsByName: jest.fn(async () => []),
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedSearchGlobal = jest.mocked(searchGlobal);
const mockedFetchDiscoveryPlayers = jest.mocked(fetchDiscoveryPlayers);
const mockedFetchDiscoveryTeams = jest.mocked(fetchDiscoveryTeams);
const mockedSearchTeamsByName = jest.mocked(searchTeamsByName);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('useSearchScreenModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockedUseNavigation.mockReturnValue({
      navigate: jest.fn(),
    } as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces query and supports empty results', async () => {
    mockedSearchGlobal.mockResolvedValueOnce({
      teams: [],
      players: [],
      competitions: [],
      matches: [],
      meta: {
        partial: false,
        degradedSources: [],
      },
    });

    const { result } = renderHook(() => useSearchScreenModel(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setQuery('Barca');
    });

    expect(mockedSearchGlobal).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(appEnv.followsSearchDebounceMs + 10);
    });

    await waitFor(() => {
      expect(mockedSearchGlobal).toHaveBeenCalledWith(
        'Barca',
        expect.any(String),
        expect.any(Number),
        appEnv.followsSearchResultsLimit,
        expect.anything(),
      );
    });

    await waitFor(() => {
      expect(result.current.hasEnoughChars).toBe(true);
      expect(result.current.teamResults).toEqual([]);
      expect(result.current.competitionResults).toEqual([]);
      expect(result.current.matchResults).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });
  });

  it('exposes loading while request is pending', async () => {
    const deferred = createDeferred<Awaited<ReturnType<typeof searchGlobal>>>();
    mockedSearchGlobal.mockImplementationOnce(() => deferred.promise);

    const { result } = renderHook(() => useSearchScreenModel(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setQuery('Barcelona');
      jest.advanceTimersByTime(appEnv.followsSearchDebounceMs + 10);
    });

    await waitFor(() => {
      expect(mockedSearchGlobal).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(true);
    });

    act(() => {
      deferred.resolve({
        teams: [
          {
            id: '529',
            name: 'Barcelona',
            logo: 'barca.png',
            country: 'Spain',
          },
        ],
        players: [],
        competitions: [],
        matches: [],
        meta: {
          partial: false,
          degradedSources: [],
        },
      });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.teamResults).toHaveLength(1);
      expect(result.current.teamResults[0]).toMatchObject({
        teamId: '529',
        teamName: 'Barcelona',
      });
    });
  });

  it('exposes error state when global search fails', async () => {
    mockedSearchGlobal.mockRejectedValueOnce(new Error('global failed'));

    const { result } = renderHook(() => useSearchScreenModel(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setQuery('Mbappe');
      jest.advanceTimersByTime(appEnv.followsSearchDebounceMs + 10);
    });

    await waitFor(() => {
      expect(mockedSearchGlobal).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('surfaces the aborted global search as an error state without results', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    mockedSearchGlobal.mockRejectedValueOnce(abortError);

    const { result } = renderHook(() => useSearchScreenModel(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setQuery('Messi');
      jest.advanceTimersByTime(appEnv.followsSearchDebounceMs + 10);
    });

    await waitFor(() => {
      expect(mockedSearchGlobal).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.teamResults).toEqual([]);
    expect(result.current.playerResults).toEqual([]);
    expect(result.current.competitionResults).toEqual([]);
  });

  it('uses the specialized teams endpoint for the teams tab', async () => {
    mockedSearchTeamsByName.mockResolvedValueOnce([
      {
        team: {
          id: 529,
          name: 'Barcelona',
          logo: 'barca.png',
          country: 'Spain',
        },
      },
    ]);

    const { result } = renderHook(() => useSearchScreenModel(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handleSelectTab('teams');
      result.current.setQuery('Barca');
      jest.advanceTimersByTime(260);
    });

    await waitFor(() => {
      expect(mockedSearchTeamsByName).toHaveBeenCalledWith(
        'Barca',
        expect.anything(),
      );
    });

    expect(mockedSearchGlobal).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.teamResults).toEqual([
        {
          teamId: '529',
          teamName: 'Barcelona',
          teamLogo: 'barca.png',
          country: 'Spain',
        },
      ]);
    });
  });

  it('shows discovery suggestions when teams tab is selected with an empty query', async () => {
    mockedFetchDiscoveryTeams.mockResolvedValueOnce({
      items: [
        {
          teamId: '529',
          teamName: 'Barcelona',
          teamLogo: 'barca.png',
          country: 'Spain',
          activeFollowersCount: 120,
          recentNet30d: 25,
          totalFollowAdds: 400,
        },
      ],
      meta: {
        source: 'dynamic',
        complete: true,
        seedCount: 0,
        generatedAt: '2026-03-07T00:00:00.000Z',
        refreshAfterMs: null,
      },
    });

    const { result } = renderHook(() => useSearchScreenModel(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handleSelectTab('teams');
    });

    await waitFor(() => {
      expect(mockedFetchDiscoveryTeams).toHaveBeenCalled();
      expect(result.current.teamResults).toEqual([
        {
          teamId: '529',
          teamName: 'Barcelona',
          teamLogo: 'barca.png',
          country: 'Spain',
        },
      ]);
    });

    expect(result.current.hasEnoughChars).toBe(false);
    expect(mockedSearchTeamsByName).not.toHaveBeenCalled();
    expect(mockedSearchGlobal).not.toHaveBeenCalled();
  });

  it('shows team seed suggestions immediately while the empty-query discovery request is still pending', async () => {
    const deferred = createDeferred<Awaited<ReturnType<typeof fetchDiscoveryTeams>>>();
    mockedFetchDiscoveryTeams.mockImplementationOnce(() => deferred.promise);

    const { result } = renderHook(() => useSearchScreenModel(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handleSelectTab('teams');
    });

    await waitFor(() => {
      expect(result.current.teamResults).toEqual([
        {
          teamId: '529',
          teamName: 'Barcelona',
          teamLogo: 'https://media.api-sports.io/football/teams/529.png',
          country: 'Spain',
        },
        {
          teamId: '541',
          teamName: 'Real Madrid',
          teamLogo: 'https://media.api-sports.io/football/teams/541.png',
          country: 'Spain',
        },
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
      ]);
    });

    act(() => {
      deferred.resolve({
        items: [
          {
            teamId: '50',
            teamName: 'Manchester City',
            teamLogo: 'city.png',
            country: 'England',
            activeFollowersCount: 5,
            recentNet30d: 2,
            totalFollowAdds: 20,
          },
        ],
        meta: {
          source: 'dynamic',
          complete: true,
          seedCount: 0,
          generatedAt: '2026-03-07T00:00:01.000Z',
          refreshAfterMs: null,
        },
      });
    });

    await waitFor(() => {
      expect(result.current.teamResults).toEqual([
        {
          teamId: '50',
          teamName: 'Manchester City',
          teamLogo: 'city.png',
          country: 'England',
        },
      ]);
    });
  });

  it('does not reuse team discovery results when switching to players with an empty query', async () => {
    mockedFetchDiscoveryTeams.mockResolvedValueOnce({
      items: [
        {
          teamId: '529',
          teamName: 'Barcelona',
          teamLogo: 'barca.png',
          country: 'Spain',
          activeFollowersCount: 120,
          recentNet30d: 25,
          totalFollowAdds: 400,
        },
      ],
      meta: {
        source: 'dynamic',
        complete: true,
        seedCount: 0,
        generatedAt: '2026-03-07T00:00:00.000Z',
        refreshAfterMs: null,
      },
    });
    const deferred = createDeferred<Awaited<ReturnType<typeof fetchDiscoveryPlayers>>>();
    mockedFetchDiscoveryPlayers.mockImplementationOnce(() => deferred.promise);

    const { result } = renderHook(() => useSearchScreenModel(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handleSelectTab('teams');
    });

    await waitFor(() => {
      expect(result.current.teamResults).toEqual([
        {
          teamId: '529',
          teamName: 'Barcelona',
          teamLogo: 'barca.png',
          country: 'Spain',
        },
      ]);
    });

    act(() => {
      result.current.handleSelectTab('players');
    });

    await waitFor(() => {
      expect(result.current.teamResults).toEqual([]);
      expect(result.current.playerResults).toEqual([
        {
          playerId: '278',
          playerName: 'Kylian Mbappe',
          playerPhoto: expect.stringContaining('/football/players/'),
          position: 'Attacker',
          teamName: 'Real Madrid',
          teamLogo: 'https://media.api-sports.io/football/teams/541.png',
          leagueName: 'La Liga',
        },
        {
          playerId: '154',
          playerName: 'Cristiano Ronaldo',
          playerPhoto: expect.stringContaining('/football/players/'),
          position: 'Attacker',
          teamName: 'Al-Nassr',
          teamLogo: 'https://media.api-sports.io/football/teams/5411.png',
          leagueName: 'Saudi Pro League',
        },
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
      ]);
    });
  });

  it('keeps player discovery suggestions visible when the empty-query request fails', async () => {
    mockedFetchDiscoveryPlayers.mockRejectedValueOnce(new Error('players discovery failed'));

    const { result } = renderHook(() => useSearchScreenModel(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handleSelectTab('players');
    });

    await waitFor(() => {
      expect(result.current.playerResults).toEqual([
        {
          playerId: '278',
          playerName: 'Kylian Mbappe',
          playerPhoto: expect.stringContaining('/football/players/'),
          position: 'Attacker',
          teamName: 'Real Madrid',
          teamLogo: 'https://media.api-sports.io/football/teams/541.png',
          leagueName: 'La Liga',
        },
        {
          playerId: '154',
          playerName: 'Cristiano Ronaldo',
          playerPhoto: expect.stringContaining('/football/players/'),
          position: 'Attacker',
          teamName: 'Al-Nassr',
          teamLogo: 'https://media.api-sports.io/football/teams/5411.png',
          leagueName: 'Saudi Pro League',
        },
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
      ]);
    });

    expect(result.current.isError).toBe(false);
  });
});
