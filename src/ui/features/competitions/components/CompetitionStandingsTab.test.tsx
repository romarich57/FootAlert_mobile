import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { CompetitionStandingsTab } from '@ui/features/competitions/components/CompetitionStandingsTab';
import { useCompetitionStandings } from '@ui/features/competitions/hooks/useCompetitionStandings';
import { useCompetitionBracket } from '@ui/features/competitions/hooks/useCompetitionBracket';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

jest.mock('@ui/features/competitions/hooks/useCompetitionStandings');
jest.mock('@ui/features/competitions/hooks/useCompetitionBracket');
jest.mock('@ui/features/competitions/components/KnockoutBracketView', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return {
    KnockoutBracketView: ({ sectionTitle }: { sectionTitle?: string }) => (
      ReactLib.createElement(Text, null, sectionTitle ?? 'bracket-view')
    ),
  };
});

const mockedUseCompetitionStandings = jest.mocked(useCompetitionStandings);
const mockedUseCompetitionBracket = jest.mocked(useCompetitionBracket);

describe('CompetitionStandingsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseCompetitionStandings.mockReturnValue({
      data: [
        {
          groupName: 'Group Stage',
          rows: [
            {
              rank: 1,
              teamId: 1,
              teamName: 'Alpha',
              teamLogo: '',
              points: 10,
              goalsDiff: 4,
              played: 4,
              win: 3,
              draw: 1,
              lose: 0,
              goalsFor: 8,
              goalsAgainst: 4,
              group: 'Group Stage',
              form: 'WWDW',
              description: null,
              home: {
                played: 2,
                win: 1,
                draw: 1,
                lose: 0,
                goalsFor: 2,
                goalsAgainst: 1,
              },
              away: {
                played: 2,
                win: 2,
                draw: 0,
                lose: 0,
                goalsFor: 6,
                goalsAgainst: 3,
              },
            },
            {
              rank: 2,
              teamId: 2,
              teamName: 'Beta',
              teamLogo: '',
              points: 8,
              goalsDiff: 2,
              played: 4,
              win: 2,
              draw: 2,
              lose: 0,
              goalsFor: 6,
              goalsAgainst: 4,
              group: 'Group Stage',
              form: 'WDWD',
              description: null,
              home: {
                played: 2,
                win: 2,
                draw: 0,
                lose: 0,
                goalsFor: 5,
                goalsAgainst: 1,
              },
              away: {
                played: 2,
                win: 0,
                draw: 2,
                lose: 0,
                goalsFor: 1,
                goalsAgainst: 3,
              },
            },
          ],
        },
      ],
      isLoading: false,
      error: null,
    } as never);
    mockedUseCompetitionBracket.mockReturnValue({
      data: { competitionKind: 'league', bracket: null },
      isLoading: false,
    } as never);
  });

  function renderTab() {
    return renderWithAppProviders(
      <CompetitionStandingsTab competitionId={61} season={2025} />,
    );
  }

  it('renders the shared standings modes and switches to detailed mode', async () => {
    renderTab();

    expect(screen.getByText(i18n.t('teamDetails.standings.displayModes.simple'))).toBeTruthy();
    expect(screen.getByText(i18n.t('teamDetails.standings.subFilters.all'))).toBeTruthy();

    fireEvent.press(screen.getByText(i18n.t('teamDetails.standings.displayModes.detailed')));

    await waitFor(() => {
      expect(screen.getByText(i18n.t('teamDetails.standings.headers.goalsForAgainst'))).toBeTruthy();
    });
  });

  it('reranks standings locally for the home filter', async () => {
    renderTab();

    fireEvent.press(screen.getByText(i18n.t('teamDetails.standings.subFilters.all')));
    fireEvent.press(screen.getByText(i18n.t('teamDetails.standings.subFilters.home')));

    await waitFor(() => {
      const rows = screen.getAllByTestId(/team-standing-row-/);
      expect(within(rows[0]!).getByText('Beta')).toBeTruthy();
      expect(within(rows[1]!).getByText('Alpha')).toBeTruthy();
    });
  });

  it('keeps the bracket footer when the competition is mixed', () => {
    mockedUseCompetitionBracket.mockReturnValue({
      data: {
        competitionKind: 'mixed',
        bracket: [{ name: 'Semi-finals', order: 1, matches: [] }],
      },
      isLoading: false,
    } as never);

    renderTab();

    expect(screen.getByText(i18n.t('competitionDetails.bracket.title'))).toBeTruthy();
  });
});
