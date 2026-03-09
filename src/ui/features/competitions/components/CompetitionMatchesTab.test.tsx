import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { CompetitionMatchesTab } from '@ui/features/competitions/components/CompetitionMatchesTab';
import { useCompetitionFixtures } from '@ui/features/competitions/hooks/useCompetitionFixtures';
import type { Fixture } from '@ui/features/competitions/types/competitions.types';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

jest.mock('@ui/features/competitions/hooks/useCompetitionFixtures');
let latestFlashListProps: Record<string, unknown> | null = null;

jest.mock('@shopify/flash-list', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');

  return {
    FlashList: ReactLib.forwardRef(({ data = [], renderItem, ListFooterComponent, ...props }: any, ref: React.ForwardedRef<unknown>) => {
      latestFlashListProps = { data, renderItem, ListFooterComponent, ...props };
      ReactLib.useImperativeHandle(ref, () => ({
        scrollToIndex: jest.fn(),
      }));

      return ReactLib.createElement(
        View,
        { testID: 'competition-matches-flash-list' },
        data.map((item: any, index: number) =>
          ReactLib.createElement(
            ReactLib.Fragment,
            { key: item.key ?? String(index) },
            renderItem({ item, index }),
          ),
        ),
        typeof ListFooterComponent === 'function'
          ? ListFooterComponent()
          : ListFooterComponent,
      );
    }),
  };
});

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

const knockoutFixtures: Fixture[] = [
  {
    ...baseFixtures[0],
    id: 201,
    round: 'Final',
    date: '2025-05-20T20:00:00.000Z',
  },
  {
    ...baseFixtures[0],
    id: 202,
    round: '64th Finals',
    date: '2025-01-05T20:00:00.000Z',
  },
  {
    ...baseFixtures[0],
    id: 203,
    round: 'Quarter-Final',
    date: '2025-04-01T20:00:00.000Z',
  },
  {
    ...baseFixtures[0],
    id: 204,
    round: '16th Finals',
    date: '2025-02-10T20:00:00.000Z',
  },
  {
    ...baseFixtures[0],
    id: 205,
    round: 'Semi-Final',
    date: '2025-05-01T20:00:00.000Z',
  },
  {
    ...baseFixtures[0],
    id: 206,
    round: '32nd Finals',
    date: '2025-01-20T20:00:00.000Z',
  },
  {
    ...baseFixtures[0],
    id: 207,
    round: '8th Finals',
    date: '2025-03-01T20:00:00.000Z',
  },
];

describe('CompetitionMatchesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestFlashListProps = null;
    mockedUseCompetitionFixtures.mockReturnValue({
      data: { pages: [{ items: baseFixtures, hasMore: false, nextCursor: null }], pageParams: [undefined] },
      isLoading: false,
      error: null,
      fetchPreviousPage: jest.fn(),
      fetchNextPage: jest.fn(),
      hasPreviousPage: false,
      hasNextPage: false,
      isFetchingPreviousPage: false,
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

  it('sorts knockout rounds from early stages to final by default', () => {
    mockedUseCompetitionFixtures.mockReturnValue({
      data: { pages: [{ items: knockoutFixtures, hasMore: false, nextCursor: null }], pageParams: [undefined] },
      isLoading: false,
      error: null,
      fetchPreviousPage: jest.fn(),
      fetchNextPage: jest.fn(),
      hasPreviousPage: false,
      hasNextPage: false,
      isFetchingPreviousPage: false,
      isFetchingNextPage: false,
    } as never);

    renderWithAppProviders(<CompetitionMatchesTab competitionId={66} season={2025} />);

    const displayedRoundHeaders = screen
      .getAllByTestId('competition-matches-round-header')
      .map(node => node.props.children);

    expect(displayedRoundHeaders).toEqual([
      i18n.t('matches.rounds.roundOf128'),
      i18n.t('matches.rounds.roundOf64'),
      i18n.t('matches.rounds.roundOf32'),
      i18n.t('matches.rounds.roundOf16'),
      i18n.t('matches.rounds.quarterFinals'),
      i18n.t('matches.rounds.semiFinals'),
      i18n.t('matches.rounds.final'),
    ]);
  });

  it('loads previous pages when the list start is reached', () => {
    const fetchPreviousPage = jest.fn();
    mockedUseCompetitionFixtures.mockReturnValue({
      data: { pages: [{ items: baseFixtures, hasMore: true, nextCursor: 'next-1' }], pageParams: [undefined] },
      isLoading: false,
      error: null,
      fetchPreviousPage,
      fetchNextPage: jest.fn(),
      hasPreviousPage: true,
      hasNextPage: true,
      isFetchingPreviousPage: false,
      isFetchingNextPage: false,
    } as never);

    renderWithAppProviders(<CompetitionMatchesTab competitionId={61} season={2025} />);

    expect(typeof latestFlashListProps?.onStartReached).toBe('function');
    (latestFlashListProps?.onStartReached as () => void)();

    expect(fetchPreviousPage).toHaveBeenCalledTimes(1);
  });
});
