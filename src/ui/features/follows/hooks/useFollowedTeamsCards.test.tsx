import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useFollowedTeamsCards } from '@ui/features/follows/hooks/useFollowedTeamsCards';
import { fetchNextFixtureForTeam, fetchTeamById } from '@data/endpoints/followsApi';

jest.mock('@data/endpoints/followsApi', () => ({
  fetchNextFixtureForTeam: jest.fn(async () => null),
  fetchTeamById: jest.fn(async () => null),
}));

const mockedFetchNextFixtureForTeam = jest.mocked(fetchNextFixtureForTeam);
const mockedFetchTeamById = jest.mocked(fetchTeamById);

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

  it('does not run query when no team IDs are provided', () => {
    const { result } = renderHook(
      () =>
        useFollowedTeamsCards({
          teamIds: [],
          timezone: 'Europe/Paris',
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedFetchTeamById).not.toHaveBeenCalled();
    expect(mockedFetchNextFixtureForTeam).not.toHaveBeenCalled();
  });

  it('hydrates cards from API', async () => {
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

    expect(mockedFetchTeamById).toHaveBeenCalledTimes(1);
    expect(mockedFetchNextFixtureForTeam).toHaveBeenCalledTimes(1);
  });
});
