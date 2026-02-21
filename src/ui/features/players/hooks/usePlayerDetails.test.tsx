import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { usePlayerDetails } from '@ui/features/players/hooks/usePlayerDetails';
import * as playersApi from '@data/endpoints/playersApi';

jest.mock('@data/endpoints/playersApi');

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: false },
    },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('usePlayerDetails', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        queryClient.clear();
    });

    it('fetches and maps player details correctly', async () => {
        // Mock the API response
        const mockDetailsDto = {
            player: {
                id: 123,
                name: 'Test Player',
                age: 25,
                height: '180 cm',
                weight: '75 kg',
            },
            statistics: [
                {
                    team: { id: 1, name: 'Team A' },
                    league: { id: 1, name: 'League 1', season: 2024 },
                    games: { appearences: 10, position: 'Attacker' },
                    goals: { total: 5 },
                }
            ]
        };

        // @ts-ignore
        jest.spyOn(playersApi, 'fetchPlayerDetails').mockResolvedValue(mockDetailsDto);
        jest.spyOn(playersApi, 'fetchPlayerTrophies').mockResolvedValue([]);

        const { result } = renderHook(() => usePlayerDetails('123', 2024), { wrapper });

        expect(result.current.isLoading).toBe(true);

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.profile).toEqual(expect.objectContaining({
            id: '123',
            name: 'Test Player',
            position: 'Attacker',
            age: 25,
            team: { id: '1', name: 'Team A', logo: undefined },
        }));

        expect(result.current.seasonStats).toEqual(expect.objectContaining({
            matches: 10,
            goals: 5,
        }));
    });
});
