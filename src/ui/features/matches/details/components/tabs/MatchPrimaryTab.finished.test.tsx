import React from 'react';

import { MatchPrimaryTab } from '@ui/features/matches/details/components/tabs/MatchPrimaryTab';
import { createMatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import type { MatchPostMatchTabViewModel } from '@ui/features/matches/types/matches.types';
import i18n from '@ui/shared/i18n';
import { lightThemeColors } from '@ui/shared/theme/theme';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

const styles = createMatchDetailsTabStyles(lightThemeColors);

function buildPostMatchTabAll(): MatchPostMatchTabViewModel {
  return {
    isLoading: false,
    hasAnySection: true,
    sectionsOrdered: [
      {
        id: 'venueWeather',
        order: 4,
        isAvailable: true,
        payload: {
          venueName: 'Parc des Princes',
          venueCity: 'Paris',
          capacity: 47929,
          surface: 'Grass',
          weather: {
            temperature: 12,
            feelsLike: 10,
            humidity: 66,
            windSpeed: 14,
            description: 'Partly cloudy',
            icon: null,
          },
        },
      },
      {
        id: 'competitionMeta',
        order: 5,
        isAvailable: true,
        payload: {
          competitionName: 'Ligue 1',
          competitionType: 'League',
          competitionRound: 'Regular Season - 25',
          kickoffDateIso: '2026-02-20T20:00:00.000Z',
          kickoffDisplay: 'ven. 20 févr. 2026, 20:00',
          referee: 'A. Referee',
        },
      },
      {
        id: 'standings',
        order: 6,
        isAvailable: true,
        payload: {
          competitionName: 'Ligue 1',
          home: {
            teamId: '1',
            teamName: 'Home FC',
            teamLogo: null,
            rank: 2,
            played: 25,
            win: 17,
            draw: 5,
            lose: 3,
            goalDiff: 26,
            points: 56,
          },
          away: {
            teamId: '2',
            teamName: 'Away FC',
            teamLogo: null,
            rank: 5,
            played: 25,
            win: 12,
            draw: 7,
            lose: 6,
            goalDiff: 9,
            points: 43,
          },
        },
      },
      {
        id: 'recentResults',
        order: 7,
        isAvailable: true,
        payload: {
          home: {
            teamId: '1',
            teamName: 'Home FC',
            teamLogo: null,
            matches: [
              {
                fixtureId: 'h1',
                homeTeamName: 'Home FC',
                homeTeamLogo: null,
                awayTeamName: 'A',
                awayTeamLogo: null,
                homeGoals: 2,
                awayGoals: 1,
                score: '2-1',
                result: 'W',
              },
            ],
          },
          away: {
            teamId: '2',
            teamName: 'Away FC',
            teamLogo: null,
            matches: [
              {
                fixtureId: 'a1',
                homeTeamName: 'B',
                homeTeamLogo: null,
                awayTeamName: 'Away FC',
                awayTeamLogo: null,
                homeGoals: 1,
                awayGoals: 1,
                score: '1-1',
                result: 'D',
              },
            ],
          },
        },
      },
      {
        id: 'upcomingMatches',
        order: 8,
        isAvailable: true,
        payload: {
          home: {
            teamId: '1',
            teamName: 'Home FC',
            teamLogo: null,
            matches: [
              {
                fixtureId: 'n1',
                leagueId: '61',
                leagueName: 'Ligue 1',
                leagueLogo: null,
                dateIso: '2026-03-01T20:00:00.000Z',
                kickoffDisplay: 'dim. 1 mars 2026, 20:00',
                homeTeamName: 'Home FC',
                homeTeamLogo: null,
                awayTeamName: 'Next Home Opponent',
                awayTeamLogo: null,
                homeGoals: null,
                awayGoals: null,
              },
            ],
          },
          away: {
            teamId: '2',
            teamName: 'Away FC',
            teamLogo: null,
            matches: [
              {
                fixtureId: 'n2',
                leagueId: '61',
                leagueName: 'Ligue 1',
                leagueLogo: null,
                dateIso: '2026-03-02T18:00:00.000Z',
                kickoffDisplay: 'lun. 2 mars 2026, 18:00',
                homeTeamName: 'Next Away Opponent',
                homeTeamLogo: null,
                awayTeamName: 'Away FC',
                awayTeamLogo: null,
                homeGoals: null,
                awayGoals: null,
              },
            ],
          },
        },
      },
    ],
  };
}

describe('MatchPrimaryTab finished summary', () => {
  const baseProps: React.ComponentProps<typeof MatchPrimaryTab> = {
    styles,
    lifecycleState: 'finished',
    homeTeamName: 'Home FC',
    awayTeamName: 'Away FC',
    winPercent: { home: '40%', draw: '30%', away: '30%' },
    venueName: 'Parc',
    venueCity: 'Paris',
    competitionName: 'Ligue 1',
    insightText: 'Insight',
    isLiveRefreshing: false,
    statRows: [
      {
        key: 'shots_on_goal',
        metricKey: 'shots_on_goal',
        section: 'shots',
        labelKey: 'matchDetails.stats.labels.shotsOnGoal',
        homeValue: '8',
        awayValue: '3',
        homePercent: 72,
        awayPercent: 28,
      },
    ],
    eventRows: [
      {
        id: 'ev-1',
        minute: "12'",
        label: 'Goal · Home Striker (Playmaker)',
        type: 'Goal',
        detail: 'Normal Goal',
        team: 'home',
        isNew: false,
        playerName: 'Home Striker',
        playerId: '10',
        playerPhoto: null,
        assistName: 'Playmaker',
        assistId: '11',
        assistPhoto: null,
      },
    ],
    finalScorers: [
      {
        id: 'sc-1',
        minute: "12'",
        team: 'home',
        playerName: 'Home Striker',
        playerId: '10',
        assistName: 'Playmaker',
        assistId: '11',
        eventType: 'Goal',
        eventDetail: 'Normal Goal',
      },
    ],
    postMatchTab: buildPostMatchTabAll(),
    matchScore: '2-1',
  };

  it('renders finished blocks in the expected order when all datasets are available', () => {
    const { toJSON, getByText, getAllByText } = renderWithAppProviders(<MatchPrimaryTab {...baseProps} />);

    const expectedOrder = [
      i18n.t('matchDetails.primary.finalSummaryTitle'),
      i18n.t('matchDetails.tabs.stats'),
      i18n.t('matchDetails.primary.keyMomentsTitle'),
      i18n.t('matchDetails.preMatch.venueWeather.title'),
      i18n.t('matchDetails.preMatch.competitionMeta.title'),
      i18n.t('matchDetails.preMatch.standings.title'),
      i18n.t('matchDetails.preMatch.recentResults.title'),
      i18n.t('matchDetails.postMatch.upcomingMatches.title'),
    ];

    const serializedTree = JSON.stringify(toJSON());
    let previousIndex = -1;
    expectedOrder.forEach(label => {
      const index = serializedTree.indexOf(label);
      expect(index).toBeGreaterThan(previousIndex);
      previousIndex = index;
    });

    expect(getAllByText("12'").length).toBeGreaterThan(0);
    expect(getAllByText('Home Striker').length).toBeGreaterThan(0);
    expect(getByText(i18n.t('matchDetails.postMatch.scorers.assistBy', { player: 'Playmaker' }), { exact: false })).toBeTruthy();
  });

  it('hides empty optional blocks instead of rendering empty cards', () => {
    const emptyPostMatchTab: MatchPostMatchTabViewModel = {
      isLoading: false,
      hasAnySection: false,
      sectionsOrdered: [
        { id: 'venueWeather', order: 4, isAvailable: false, payload: null },
        { id: 'competitionMeta', order: 5, isAvailable: false, payload: null },
        { id: 'standings', order: 6, isAvailable: false, payload: null },
        { id: 'recentResults', order: 7, isAvailable: false, payload: null },
        { id: 'upcomingMatches', order: 8, isAvailable: false, payload: null },
      ],
    };

    const { queryByText, getByText } = renderWithAppProviders(
      <MatchPrimaryTab
        {...baseProps}
        statRows={[]}
        eventRows={[]}
        finalScorers={[]}
        postMatchTab={emptyPostMatchTab}
      />,
    );

    expect(getByText(i18n.t('matchDetails.primary.finalSummaryTitle'))).toBeTruthy();
    expect(queryByText(i18n.t('matchDetails.tabs.stats'))).toBeNull();
    expect(queryByText(i18n.t('matchDetails.primary.keyMomentsTitle'))).toBeNull();
    expect(queryByText(i18n.t('matchDetails.postMatch.upcomingMatches.title'))).toBeNull();
  });
});
