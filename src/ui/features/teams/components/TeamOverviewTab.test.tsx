import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { TeamOverviewTab } from '@ui/features/teams/components/TeamOverviewTab';
import type { TeamCompetitionOption, TeamIdentity, TeamOverviewData } from '@ui/features/teams/types/teams.types';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

const team: TeamIdentity = {
  id: '529',
  name: 'Barcelona',
  logo: null,
  country: 'Spain',
  founded: 1899,
  venueName: 'Camp Nou',
  venueCity: 'Barcelona',
  venueCapacity: 99354,
  venueImage: null,
};

const competitions: TeamCompetitionOption[] = [
  {
    leagueId: '140',
    leagueName: 'LaLiga',
    leagueLogo: 'https://example.com/laliga.png',
    type: 'League',
    country: 'Spain',
    seasons: [2025, 2024],
    currentSeason: 2025,
  },
  {
    leagueId: '2',
    leagueName: 'UEFA Champions League',
    leagueLogo: 'https://example.com/ucl.png',
    type: 'Cup',
    country: 'Europe',
    seasons: [2025],
    currentSeason: 2025,
  },
];

const baseData: TeamOverviewData = {
  nextMatch: {
    fixtureId: 'fixture-1',
    leagueId: '140',
    leagueName: 'LaLiga',
    leagueLogo: null,
    date: '2026-03-02T20:00:00Z',
    round: null,
    venue: null,
    status: 'upcoming',
    statusLabel: 'Not started',
    minute: null,
    homeTeamId: '529',
    homeTeamName: 'Barcelona',
    homeTeamLogo: null,
    awayTeamId: '541',
    awayTeamName: 'Real Madrid',
    awayTeamLogo: null,
    homeGoals: null,
    awayGoals: null,
  },
  recentForm: [
    {
      fixtureId: 'f1',
      result: 'W',
      score: '2-1',
      opponentName: 'Team 1',
      opponentLogo: null,
    },
    {
      fixtureId: 'f2',
      result: 'W',
      score: '1-0',
      opponentName: 'Team 2',
      opponentLogo: null,
    },
    {
      fixtureId: 'f3',
      result: 'D',
      score: '1-1',
      opponentName: 'Team 3',
      opponentLogo: null,
    },
    {
      fixtureId: 'f4',
      result: 'L',
      score: '0-1',
      opponentName: 'Team 4',
      opponentLogo: null,
    },
    {
      fixtureId: 'f5',
      result: 'W',
      score: '3-1',
      opponentName: 'Team 5',
      opponentLogo: null,
    },
  ],
  seasonStats: {
    rank: 2,
    points: 60,
    played: 25,
    goalDiff: 33,
    wins: 19,
    draws: 3,
    losses: 3,
    scored: 58,
    conceded: 25,
  },
  seasonLineup: {
    formation: '4-3-3',
    estimated: true,
    goalkeeper: {
      playerId: 'p-gk',
      name: 'GK',
      photo: null,
      teamLogo: null,
      position: 'Goalkeeper',
      goals: 0,
      assists: 0,
      rating: 7.1,
    },
    defenders: [
      {
        playerId: 'p-def-1',
        name: 'Def 1',
        photo: null,
        teamLogo: null,
        position: 'Defender',
        goals: 1,
        assists: 2,
        rating: 7.3,
      },
      {
        playerId: 'p-def-2',
        name: 'Def 2',
        photo: null,
        teamLogo: null,
        position: 'Defender',
        goals: 2,
        assists: 1,
        rating: 7.2,
      },
      {
        playerId: 'p-def-3',
        name: 'Def 3',
        photo: null,
        teamLogo: null,
        position: 'Defender',
        goals: 1,
        assists: 1,
        rating: 7,
      },
      {
        playerId: 'p-def-4',
        name: 'Def 4',
        photo: null,
        teamLogo: null,
        position: 'Defender',
        goals: 0,
        assists: 1,
        rating: 6.9,
      },
    ],
    midfielders: [
      {
        playerId: 'p-mid-1',
        name: 'Mid 1',
        photo: null,
        teamLogo: null,
        position: 'Midfielder',
        goals: 5,
        assists: 6,
        rating: 7.5,
      },
      {
        playerId: 'p-mid-2',
        name: 'Mid 2',
        photo: null,
        teamLogo: null,
        position: 'Midfielder',
        goals: 3,
        assists: 4,
        rating: 7.4,
      },
      {
        playerId: 'p-mid-3',
        name: 'Mid 3',
        photo: null,
        teamLogo: null,
        position: 'Midfielder',
        goals: 2,
        assists: 3,
        rating: 7.2,
      },
    ],
    attackers: [
      {
        playerId: 'p-att-1',
        name: 'Att 1',
        photo: null,
        teamLogo: null,
        position: 'Attacker',
        goals: 20,
        assists: 7,
        rating: 8.2,
      },
      {
        playerId: 'p-att-2',
        name: 'Att 2',
        photo: null,
        teamLogo: null,
        position: 'Attacker',
        goals: 14,
        assists: 5,
        rating: 7.8,
      },
      {
        playerId: 'p-att-3',
        name: 'Att 3',
        photo: null,
        teamLogo: null,
        position: 'Attacker',
        goals: 11,
        assists: 4,
        rating: 7.6,
      },
    ],
  },
  miniStanding: {
    leagueId: '140',
    leagueName: 'LaLiga',
    leagueLogo: 'https://example.com/laliga.png',
    rows: [
      {
        rank: 1,
        teamId: '541',
        teamName: 'Real Madrid',
        teamLogo: null,
        played: 25,
        goalDiff: 35,
        points: 61,
        isTargetTeam: false,
        form: null,
        update: null,
        all: {
          played: 25,
          win: 20,
          draw: 1,
          lose: 4,
          goalsFor: 60,
          goalsAgainst: 25,
        },
        home: {
          played: 0,
          win: 0,
          draw: 0,
          lose: 0,
          goalsFor: 0,
          goalsAgainst: 0,
        },
        away: {
          played: 0,
          win: 0,
          draw: 0,
          lose: 0,
          goalsFor: 0,
          goalsAgainst: 0,
        },
      },
      {
        rank: 2,
        teamId: '529',
        teamName: 'Barcelona',
        teamLogo: null,
        played: 25,
        goalDiff: 33,
        points: 60,
        isTargetTeam: true,
        form: null,
        update: null,
        all: {
          played: 25,
          win: 19,
          draw: 3,
          lose: 3,
          goalsFor: 58,
          goalsAgainst: 25,
        },
        home: {
          played: 0,
          win: 0,
          draw: 0,
          lose: 0,
          goalsFor: 0,
          goalsAgainst: 0,
        },
        away: {
          played: 0,
          win: 0,
          draw: 0,
          lose: 0,
          goalsFor: 0,
          goalsAgainst: 0,
        },
      },
      {
        rank: 3,
        teamId: '530',
        teamName: 'Atletico',
        teamLogo: null,
        played: 25,
        goalDiff: 20,
        points: 52,
        isTargetTeam: false,
        form: null,
        update: null,
        all: {
          played: 25,
          win: 16,
          draw: 4,
          lose: 5,
          goalsFor: 49,
          goalsAgainst: 29,
        },
        home: {
          played: 0,
          win: 0,
          draw: 0,
          lose: 0,
          goalsFor: 0,
          goalsAgainst: 0,
        },
        away: {
          played: 0,
          win: 0,
          draw: 0,
          lose: 0,
          goalsFor: 0,
          goalsAgainst: 0,
        },
      },
    ],
  },
  standingHistory: [
    { season: 2025, rank: 2 },
    { season: 2024, rank: 1 },
    { season: 2023, rank: 2 },
    { season: 2022, rank: 1 },
    { season: 2021, rank: 2 },
  ],
  coachPerformance: {
    coach: {
      id: 'coach-1',
      name: 'Coach Name',
      photo: null,
      age: 55,
    },
    winRate: 76,
    pointsPerMatch: 2.5,
    played: 25,
    wins: 19,
    draws: 3,
    losses: 3,
  },
  playerLeaders: {
    scorers: [
      {
        playerId: 'p-att-1',
        name: 'Att 1',
        photo: null,
        teamLogo: null,
        position: 'Attacker',
        goals: 20,
        assists: 7,
        rating: 8.2,
      },
      {
        playerId: 'p-att-2',
        name: 'Att 2',
        photo: null,
        teamLogo: null,
        position: 'Attacker',
        goals: 14,
        assists: 5,
        rating: 7.8,
      },
    ],
    assisters: [
      {
        playerId: 'p-mid-1',
        name: 'Mid 1',
        photo: null,
        teamLogo: null,
        position: 'Midfielder',
        goals: 5,
        assists: 6,
        rating: 7.5,
      },
      {
        playerId: 'p-mid-2',
        name: 'Mid 2',
        photo: null,
        teamLogo: null,
        position: 'Midfielder',
        goals: 3,
        assists: 4,
        rating: 7.4,
      },
    ],
    ratings: [
      {
        playerId: 'p-att-1',
        name: 'Att 1',
        photo: null,
        teamLogo: null,
        position: 'Attacker',
        goals: 20,
        assists: 7,
        rating: 8.2,
      },
      {
        playerId: 'p-att-2',
        name: 'Att 2',
        photo: null,
        teamLogo: null,
        position: 'Attacker',
        goals: 14,
        assists: 5,
        rating: 7.8,
      },
    ],
  },
  trophiesCount: 15,
  trophyWinsCount: 10,
};

describe('TeamOverviewTab', () => {
  it('renders all overview sections in the expected order', () => {
    const { toJSON } = renderWithAppProviders(
      <TeamOverviewTab
        team={team}
        competitions={competitions}
        selectedSeason={2025}
        data={baseData}
        isLoading={false}
        isError={false}
        onRetry={jest.fn()}
        onPressMatch={jest.fn()}
        onPressTeam={jest.fn()}
      />,
    );

    const tree = JSON.stringify(toJSON());
    const orderedTitles = [
      i18n.t('teamDetails.overview.nextMatch'),
      i18n.t('teamDetails.overview.recentForm'),
      i18n.t('teamDetails.overview.seasonStats'),
      i18n.t('teamDetails.overview.miniStanding'),
      i18n.t('teamDetails.overview.standingHistory'),
      i18n.t('teamDetails.overview.coachPerformance'),
      i18n.t('teamDetails.overview.playerLeaders'),
      i18n.t('teamDetails.overview.competitions'),
      i18n.t('teamDetails.overview.stadiumInfo'),
    ];

    let previousIndex = -1;
    orderedTitles.forEach(title => {
      const index = tree.indexOf(title);
      expect(index).toBeGreaterThan(previousIndex);
      previousIndex = index;
    });
  });

  it('shows retry button on error and triggers callback', () => {
    const onRetry = jest.fn();

    renderWithAppProviders(
      <TeamOverviewTab
        team={team}
        competitions={competitions}
        selectedSeason={2025}
        data={undefined}
        isLoading={false}
        isError
        onRetry={onRetry}
        onPressMatch={jest.fn()}
        onPressTeam={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText(i18n.t('actions.retry')));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows empty state for competitions when no competition matches selected season', () => {
    renderWithAppProviders(
      <TeamOverviewTab
        team={team}
        competitions={competitions}
        selectedSeason={2030}
        data={baseData}
        isLoading={false}
        isError={false}
        onRetry={jest.fn()}
        onPressMatch={jest.fn()}
        onPressTeam={jest.fn()}
      />,
    );

    expect(screen.getByText(i18n.t('teamDetails.overview.competitions'))).toBeTruthy();
    expect(screen.getAllByText(i18n.t('teamDetails.states.empty')).length).toBeGreaterThan(0);
  });

  it('uses MaterialCommunityIcons for season stats and removes emoji glyphs there', () => {
    renderWithAppProviders(
      <TeamOverviewTab
        team={team}
        competitions={competitions}
        selectedSeason={2025}
        data={baseData}
        isLoading={false}
        isError={false}
        onRetry={jest.fn()}
        onPressMatch={jest.fn()}
        onPressTeam={jest.fn()}
      />,
    );

    expect(screen.getByTestId('team-overview-season-stat-icon-rank')).toBeTruthy();
    expect(screen.getByTestId('team-overview-season-stat-icon-points')).toBeTruthy();
    expect(screen.getByTestId('team-overview-season-stat-icon-played')).toBeTruthy();
    expect(screen.getByTestId('team-overview-season-stat-icon-goalDiff')).toBeTruthy();

    expect(screen.queryByText('🏅')).toBeNull();
    expect(screen.queryByText('⭐')).toBeNull();
    expect(screen.queryByText('🗓️')).toBeNull();
    expect(screen.queryByText('⚽')).toBeNull();
  });
});
