import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useFollowedTeamsCards } from '@ui/features/follows/hooks/useFollowedTeamsCards';
import { fetchNextFixtureForTeam, fetchTeamById } from '@data/endpoints/followsApi';
import { loadCachedTeamCards, saveCachedTeamCards } from '@data/storage/followsCardsCacheStorage';

jest.mock('@data/endpoints/followsApi', () => ({
  fetchNextFixtureForTeam: jest.fn(async () => null),
  fetchTeamById: jest.fn(async () => null),
}));

jest.mock('@data/storage/followsCardsCacheStorage', () => ({
  loadCachedTeamCards: jest.fn(async () => null),
  saveCachedTeamCards: jest.fn(async () => undefined),
  loadCachedPlayerCards: jest.fn(async () => null),
  saveCachedPlayerCards: jest.fn(async () => undefined),
}));

const mockedFetchNextFixtureForTeam = jest.mocked(fetchNextFixtureForTeam);
const mockedFetchTeamById = jest.mocked(fetchTeamById);
const mockedLoadCachedTeamCards = jest.mocked(loadCachedTeamCards);
const mockedSaveCachedTeamCards = jest.mocked(saveCachedTeamCards);

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

describe('useFollowedTeamsCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached cards when available', async () => {
    mockedLoadCachedTeamCards.mockResolvedValueOnce([
      {
        teamId: '529',
        teamName: 'Barcelona',
        teamLogo: 'barca.png',
        nextMatch: null,
      },
    ]);

    const { result } = renderHook(
      () =>
        useFollowedTeamsCards({
          teamIds: ['529'],
          timezone: 'Europe/Paris',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });

    expect(mockedFetchTeamById).not.toHaveBeenCalled();
    expect(mockedFetchNextFixtureForTeam).not.toHaveBeenCalled();
  });

  it('hydrates cards from API and caches them', async () => {
    mockedFetchTeamById.mockResolvedValueOnce({
      team: { id: 529, name: 'Barcelona', logo: 'barca.png' },
    });
    mockedFetchNextFixtureForTeam.mockResolvedValueOnce({
      fixture: { id: 90, date: '2026-03-20T20:00:00+00:00' },
      teams: {
        home: { id: 529, name: 'Barcelona', logo: 'barca.png' },
        away: { id: 541, name: 'Real Madrid', logo: 'rm.png' },
      },
    });

    const { result } = renderHook(
      () =>
        useFollowedTeamsCards({
          teamIds: ['529'],
          timezone: 'Europe/Paris',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data?.[0].teamName).toBe('Barcelona');
    });

    expect(mockedSaveCachedTeamCards).toHaveBeenCalled();
  });
});
