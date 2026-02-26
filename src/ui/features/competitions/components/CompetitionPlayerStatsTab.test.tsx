import React from 'react';
import { screen } from '@testing-library/react-native';

import { CompetitionPlayerStatsTab } from '@ui/features/competitions/components/CompetitionPlayerStatsTab';
import { useCompetitionPlayerStats } from '@ui/features/competitions/hooks/useCompetitionPlayerStats';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

jest.mock('@ui/features/competitions/hooks/useCompetitionPlayerStats');

const mockedUseCompetitionPlayerStats = jest.mocked(useCompetitionPlayerStats);

const basePlayerStat = {
  playerId: 1,
  playerName: 'Player One',
  playerPhoto: 'https://example.com/p.png',
  teamId: 10,
  teamName: 'Team One',
  teamLogo: 'https://example.com/t.png',
  goals: 10,
  assists: 2,
  yellowCards: 1,
  redCards: 0,
};

describe('CompetitionPlayerStatsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows only stat type chips that contain data', () => {
    mockedUseCompetitionPlayerStats.mockImplementation((_competitionId, _season, statType) => {
      if (statType === 'goals' || statType === 'yellowCards') {
        return {
          data: [basePlayerStat],
          isLoading: false,
        } as never;
      }

      return {
        data: [],
        isLoading: false,
      } as never;
    });

    renderWithAppProviders(<CompetitionPlayerStatsTab competitionId={61} season={2025} />);

    expect(screen.getByText(i18n.t('competitionDetails.playerStats.statTypes.goals'))).toBeTruthy();
    expect(screen.getByText(i18n.t('competitionDetails.playerStats.statTypes.yellowCards'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('competitionDetails.playerStats.statTypes.assists'))).toBeNull();
    expect(screen.queryByText(i18n.t('competitionDetails.playerStats.statTypes.redCards'))).toBeNull();
  });

  it('shows unavailable state when all stat types are empty', () => {
    mockedUseCompetitionPlayerStats.mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    renderWithAppProviders(<CompetitionPlayerStatsTab competitionId={61} season={2025} />);

    expect(screen.getByText(i18n.t('competitionDetails.playerStats.unavailable'))).toBeTruthy();
  });
});
