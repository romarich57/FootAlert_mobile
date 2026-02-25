import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { TeamTrophiesTab } from '@ui/features/teams/components/TeamTrophiesTab';
import type { TeamTrophiesData } from '@ui/features/teams/types/teams.types';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

describe('TeamTrophiesTab', () => {
  const defaultData: TeamTrophiesData = {
    groups: [
      {
        id: 'Premier League::England',
        competition: 'Premier League',
        country: 'England',
        placements: [
          { place: 'champion', count: 13, seasons: ['2003/04', '2001/02'] },
          { place: 'runnerUp', count: 12, seasons: ['2024/25', '2023/24'] },
        ],
      },
    ],
    total: 25,
    totalWins: 13,
  };

  it('renders trophy card rows with place labels, seasons and separators', () => {
    renderWithAppProviders(
      <TeamTrophiesTab
        data={defaultData}
        isLoading={false}
        isError={false}
        hasFetched
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText('Premier League')).toBeTruthy();
    expect(screen.getByText(i18n.t('teamDetails.trophies.places.champion'))).toBeTruthy();
    expect(screen.getByText(i18n.t('teamDetails.trophies.places.runnerUp'))).toBeTruthy();
    expect(screen.getByText('(2003/04 • 2001/02)')).toBeTruthy();
    expect(screen.getByText('(2024/25 • 2023/24)')).toBeTruthy();
    expect(screen.getAllByTestId('team-trophy-placement-separator')).toHaveLength(1);
  });

  it('renders empty state when no trophies are available', () => {
    renderWithAppProviders(
      <TeamTrophiesTab
        data={{ groups: [], total: 0, totalWins: 0 }}
        isLoading={false}
        isError={false}
        hasFetched
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText(i18n.t('teamDetails.states.empty'))).toBeTruthy();
  });

  it('renders error state and triggers retry callback', () => {
    const onRetry = jest.fn();

    renderWithAppProviders(
      <TeamTrophiesTab
        data={undefined}
        isLoading={false}
        isError
        hasFetched
        onRetry={onRetry}
      />,
    );

    fireEvent.press(screen.getByText(i18n.t('actions.retry')));

    expect(screen.getByText(i18n.t('teamDetails.states.error'))).toBeTruthy();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
