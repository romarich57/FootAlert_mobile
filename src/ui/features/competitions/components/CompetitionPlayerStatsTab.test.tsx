import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { CompetitionPlayerStatsTab } from '@ui/features/competitions/components/CompetitionPlayerStatsTab';
import { useCompetitionPlayerStats } from '@ui/features/competitions/hooks/useCompetitionPlayerStats';
import type { CompetitionPlayerStat } from '@ui/features/competitions/types/competitions.types';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

jest.mock('@ui/features/competitions/hooks/useCompetitionPlayerStats');

const mockedUseCompetitionPlayerStats = jest.mocked(useCompetitionPlayerStats);

const stats: CompetitionPlayerStat[] = [
  {
    playerId: 10,
    playerName: 'Leader Player',
    playerPhoto: 'https://img.example/p10.png',
    teamId: 110,
    teamName: 'Leader FC',
    teamLogo: 'https://img.example/t110.png',
    position: 'F',
    rating: '8.3',
    matchesPlayed: 18,
    goals: 14,
    assists: 4,
    yellowCards: 1,
    redCards: 0,
  },
  {
    playerId: 11,
    playerName: 'Runner Player',
    playerPhoto: 'https://img.example/p11.png',
    teamId: 111,
    teamName: 'Runner FC',
    teamLogo: 'https://img.example/t111.png',
    position: 'F',
    rating: '7.9',
    matchesPlayed: 18,
    goals: 11,
    assists: 3,
    yellowCards: 2,
    redCards: 0,
  },
];

describe('CompetitionPlayerStatsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseCompetitionPlayerStats.mockReturnValue({
      data: stats,
      isLoading: false,
      error: null,
    } as never);
  });

  it('routes player and team clicks to callbacks for hero and ranking', () => {
    const onPressPlayer = jest.fn();
    const onPressTeam = jest.fn();

    renderWithAppProviders(
      <CompetitionPlayerStatsTab
        competitionId={61}
        season={2025}
        onPressPlayer={onPressPlayer}
        onPressTeam={onPressTeam}
      />,
    );

    fireEvent.press(screen.getAllByLabelText('Leader Player')[0]);
    fireEvent.press(screen.getByLabelText('Leader FC'));
    fireEvent.press(screen.getAllByLabelText('Runner Player')[0]);
    fireEvent.press(screen.getByLabelText('Runner FC'));

    expect(onPressPlayer).toHaveBeenCalledWith('10');
    expect(onPressPlayer).toHaveBeenCalledWith('11');
    expect(onPressTeam).toHaveBeenCalledWith('110');
    expect(onPressTeam).toHaveBeenCalledWith('111');
  });

  it('shows unavailable state when no leader exists', () => {
    mockedUseCompetitionPlayerStats.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as never);

    renderWithAppProviders(<CompetitionPlayerStatsTab competitionId={61} season={2025} />);

    expect(screen.getByText(i18n.t('competitionDetails.playerStats.unavailable'))).toBeTruthy();
  });
});

