import React from 'react';
import { act, cleanup, fireEvent, screen } from '@testing-library/react-native';

import { CompetitionTransfersTab } from '@ui/features/competitions/components/CompetitionTransfersTab';
import { useCompetitionTransfers } from '@ui/features/competitions/hooks/useCompetitionTransfers';
import type { Transfer } from '@ui/features/competitions/types/competitions.types';
import '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

jest.mock('@ui/features/competitions/hooks/useCompetitionTransfers', () => ({
  useCompetitionTransfers: jest.fn(),
}));

const mockedUseCompetitionTransfers = jest.mocked(useCompetitionTransfers);

const baseTransfers: Transfer[] = [
  {
    id: '1',
    playerId: 1,
    playerName: 'Player Arrival',
    playerPhoto: 'https://img/1.png',
    date: '2025-08-10',
    timestamp: new Date('2025-08-10').getTime(),
    type: 'Loan',
    direction: 'arrival',
    isArrival: true,
    isDeparture: false,
    teamIn: { id: 10, name: 'Team In', logo: '' },
    teamOut: { id: 20, name: 'Team Out', logo: '' },
  },
  {
    id: '2',
    playerId: 2,
    playerName: 'Player Departure',
    playerPhoto: 'https://img/2.png',
    date: '2025-07-10',
    timestamp: new Date('2025-07-10').getTime(),
    type: 'Transfer',
    direction: 'departure',
    isArrival: false,
    isDeparture: true,
    teamIn: { id: 30, name: 'Team In 2', logo: '' },
    teamOut: { id: 40, name: 'Team Out 2', logo: '' },
  },
];

describe('CompetitionTransfersTab', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockedUseCompetitionTransfers.mockReturnValue({
      data: baseTransfers,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as never);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    cleanup();
    jest.useRealTimers();
  });

  it('filters list by arrivals and departures', () => {
    renderWithAppProviders(<CompetitionTransfersTab competitionId={61} season={2025} />);

    expect(screen.getByText('Player Arrival')).toBeTruthy();
    expect(screen.getByText('Player Departure')).toBeTruthy();

    fireEvent.press(screen.getByText('Départs'));
    expect(screen.queryByText('Player Arrival')).toBeNull();
    expect(screen.getByText('Player Departure')).toBeTruthy();

    fireEvent.press(screen.getByText('Arrivées'));
    expect(screen.getByText('Player Arrival')).toBeTruthy();
    expect(screen.queryByText('Player Departure')).toBeNull();
  });

  it('toggles sorting label when pressing sort chip', () => {
    renderWithAppProviders(<CompetitionTransfersTab competitionId={61} season={2025} />);

    expect(screen.getByText('Plus récents')).toBeTruthy();
    fireEvent.press(screen.getByText('Plus récents'));
    expect(screen.getByText('Plus anciens')).toBeTruthy();
  });
});
