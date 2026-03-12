import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useFollowedTeamsCards } from '@ui/features/follows/hooks/useFollowedTeamsCards';
import { fetchFollowedTeamCards } from '@data/endpoints/followsApi';

jest.mock('@data/endpoints/followsApi', () => ({
  fetchFollowedTeamCards: jest.fn(async () => []),
}));

const mockedFetchFollowedTeamCards = jest.mocked(fetchFollowedTeamCards);

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
    expect(mockedFetchFollowedTeamCards).not.toHaveBeenCalled();
  });

  it('hydrates cards from API', async () => {
    mockedFetchFollowedTeamCards.mockResolvedValueOnce([
      {
        teamId: '529',
        teamName: 'Barcelona',
        teamLogo: 'barca.png',
        nextMatch: {
          fixtureId: '90',
          opponentTeamName: 'Real Madrid',
          opponentTeamLogo: 'rm.png',
          startDate: '2026-03-20T20:00:00+00:00',
        },
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
      expect(result.current.data?.[0].teamName).toBe('Barcelona');
    });

    expect(mockedFetchFollowedTeamCards).toHaveBeenCalledTimes(1);
  });
});
