import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { CompetitionMatchesTab } from '@ui/features/competitions/components/CompetitionMatchesTab';
import { useCompetitionFixtures } from '@ui/features/competitions/hooks/useCompetitionFixtures';
import type { Fixture } from '@ui/features/competitions/types/competitions.types';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

jest.mock('@ui/features/competitions/hooks/useCompetitionFixtures');

const mockedUseCompetitionFixtures = jest.mocked(useCompetitionFixtures);

const baseFixtures: Fixture[] = [
  {
    id: 101,
    date: '2025-03-01T20:00:00.000Z',
    timestamp: 1740859200,
    status: 'FT',
    elapsed: 90,
    round: 'Regular Season - 12',
    homeTeam: {
      id: 11,
      name: 'Home FC',
      logo: 'https://img.example/home.png',
      winner: true,
    },
    awayTeam: {
      id: 22,
      name: 'Away FC',
      logo: 'https://img.example/away.png',
      winner: false,
    },
    goalsHome: 2,
    goalsAway: 1,
    penaltyHome: null,
    penaltyAway: null,
  },
];

describe('CompetitionMatchesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseCompetitionFixtures.mockReturnValue({
      data: { pages: [{ items: baseFixtures, hasMore: false, nextCursor: null }], pageParams: [undefined] },
      isLoading: false,
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as never);
  });

  it('routes match and team clicks to callbacks', () => {
    const onPressMatch = jest.fn();
    const onPressTeam = jest.fn();

    renderWithAppProviders(
      <CompetitionMatchesTab
        competitionId={61}
        season={2025}
        onPressMatch={onPressMatch}
        onPressTeam={onPressTeam}
      />,
    );

    fireEvent.press(screen.getByText('Home FC'));
    fireEvent.press(screen.getByText('Away FC'));
    fireEvent.press(screen.getByText('2 - 1'));

    expect(onPressTeam).toHaveBeenNthCalledWith(1, '11');
    expect(onPressTeam).toHaveBeenNthCalledWith(2, '22');
    expect(onPressMatch).toHaveBeenCalledWith('101');
  });

  it('shows unavailable state when fixtures are empty', () => {
    mockedUseCompetitionFixtures.mockReturnValue({
      data: { pages: [{ items: [], hasMore: false, nextCursor: null }], pageParams: [undefined] },
      isLoading: false,
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as never);

    renderWithAppProviders(<CompetitionMatchesTab competitionId={61} season={2025} />);

    expect(screen.getByText(i18n.t('competitionDetails.matches.unavailable'))).toBeTruthy();
  });
});
