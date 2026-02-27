import type {
  TeamComparisonMetric,
  TeamFormEntry,
  TeamIdentity,
  TeamMatchItem,
  TeamOverviewCoachPerformance,
  TeamOverviewHistoryPoint,
  TeamOverviewMiniStanding,
  TeamOverviewPlayerLeaders,
  TeamSeasonLineup,
  TeamStandingRow,
  TeamStatsData,
  TeamTopPlayer,
} from '@ui/features/teams/types/teams.types';

function createStandingStats(overrides?: Partial<TeamStandingRow['all']>): TeamStandingRow['all'] {
  return {
    played: 24,
    win: 14,
    draw: 6,
    lose: 4,
    goalsFor: 42,
    goalsAgainst: 20,
    ...overrides,
  };
}

function createStandingRow(overrides?: Partial<TeamStandingRow>): TeamStandingRow {
  return {
    rank: 2,
    teamId: '85',
    teamName: 'Paris SG',
    teamLogo: 'https://media.api-sports.io/football/teams/85.png',
    played: 24,
    goalDiff: 22,
    points: 48,
    isTargetTeam: false,
    form: 'WWDWW',
    update: null,
    all: createStandingStats(),
    home: createStandingStats({ played: 12, win: 9, draw: 2, lose: 1, goalsFor: 27, goalsAgainst: 10 }),
    away: createStandingStats({ played: 12, win: 5, draw: 4, lose: 3, goalsFor: 15, goalsAgainst: 10 }),
    ...overrides,
  };
}

function createTopPlayer(overrides: Partial<TeamTopPlayer>): TeamTopPlayer {
  return {
    playerId: '0',
    name: 'Unknown Player',
    photo: null,
    teamLogo: 'https://media.api-sports.io/football/teams/85.png',
    position: 'Attacker',
    goals: null,
    assists: null,
    rating: null,
    ...overrides,
  };
}

export const sampleTeamMatch: TeamMatchItem = {
  fixtureId: '1001',
  leagueId: '61',
  leagueName: 'Ligue 1',
  leagueLogo: 'https://media.api-sports.io/football/leagues/61.png',
  date: '2026-03-02T20:00:00.000Z',
  round: 'Regular Season - 26',
  venue: 'Parc des Princes',
  status: 'upcoming',
  statusLabel: 'Not Started',
  minute: null,
  homeTeamId: '85',
  homeTeamName: 'Paris SG',
  homeTeamLogo: 'https://media.api-sports.io/football/teams/85.png',
  awayTeamId: '81',
  awayTeamName: 'Marseille',
  awayTeamLogo: 'https://media.api-sports.io/football/teams/81.png',
  homeGoals: null,
  awayGoals: null,
};

export const sampleTeamIdentity: TeamIdentity = {
  id: '85',
  name: 'Paris SG',
  logo: 'https://media.api-sports.io/football/teams/85.png',
  country: 'France',
  founded: 1970,
  venueName: 'Parc des Princes',
  venueCity: 'Paris',
  venueCapacity: 47929,
  venueImage: 'https://media.api-sports.io/football/venues/665.png',
};

export const sampleRecentForm: TeamFormEntry[] = [
  {
    fixtureId: 'f-1',
    result: 'W',
    score: '2-1',
    opponentName: 'Marseille',
    opponentLogo: 'https://media.api-sports.io/football/teams/81.png',
  },
  {
    fixtureId: 'f-2',
    result: 'D',
    score: '1-1',
    opponentName: 'Monaco',
    opponentLogo: 'https://media.api-sports.io/football/teams/91.png',
  },
  {
    fixtureId: 'f-3',
    result: 'L',
    score: '0-1',
    opponentName: 'Lille',
    opponentLogo: null,
  },
];

export const sampleMiniStanding: TeamOverviewMiniStanding = {
  leagueId: '61',
  leagueName: 'Ligue 1',
  leagueLogo: 'https://media.api-sports.io/football/leagues/61.png',
  rows: [
    createStandingRow({ rank: 1, teamId: '81', teamName: 'Marseille', points: 52 }),
    createStandingRow({ rank: 2, teamId: '85', teamName: 'Paris SG', isTargetTeam: true, points: 48 }),
    createStandingRow({ rank: 3, teamId: '91', teamName: 'Monaco', points: 47 }),
  ],
};

export const sampleStandingHistory: TeamOverviewHistoryPoint[] = [
  { season: 2021, rank: 2 },
  { season: 2022, rank: 1 },
  { season: 2023, rank: 3 },
  { season: 2024, rank: 2 },
  { season: 2025, rank: 1 },
];

export const sampleStandingHistoryLeague = {
  name: 'Ligue 1',
  logo: 'https://media.api-sports.io/football/leagues/61.png',
};

export const sampleCoachPerformance: TeamOverviewCoachPerformance = {
  coach: {
    id: 'coach-1',
    name: 'Luis Enrique',
    photo: 'https://media.api-sports.io/football/coachs/1118.png',
    age: 55,
  },
  winRate: 66.7,
  pointsPerMatch: 2.18,
  played: 24,
  wins: 16,
  draws: 4,
  losses: 4,
};

const playerA = createTopPlayer({
  playerId: 'p-1',
  name: 'Kylian Mbappé',
  photo: 'https://media.api-sports.io/football/players/276.png',
  goals: 18,
  assists: 6,
  rating: 7.9,
});

const playerB = createTopPlayer({
  playerId: 'p-2',
  name: 'Ousmane Dembélé',
  photo: 'https://media.api-sports.io/football/players/658.png',
  goals: 9,
  assists: 11,
  rating: 7.4,
});

const playerC = createTopPlayer({
  playerId: 'p-3',
  name: 'Vitinha',
  photo: 'https://media.api-sports.io/football/players/1628.png',
  goals: 5,
  assists: 4,
  rating: 7.2,
  position: 'Midfielder',
});

export const samplePlayerLeaders: TeamOverviewPlayerLeaders = {
  ratings: [playerA, playerB, playerC],
  scorers: [playerA, playerB, playerC],
  assisters: [playerB, playerA, playerC],
};

export const sampleSeasonLineup: TeamSeasonLineup = {
  formation: '4-3-3',
  estimated: true,
  goalkeeper: createTopPlayer({
    playerId: 'gk-1',
    name: 'Gianluigi Donnarumma',
    position: 'Goalkeeper',
    photo: 'https://media.api-sports.io/football/players/642.png',
    rating: 7.0,
  }),
  defenders: [
    createTopPlayer({ playerId: 'd-1', name: 'Hakimi', position: 'Defender', rating: 7.1 }),
    createTopPlayer({ playerId: 'd-2', name: 'Marquinhos', position: 'Defender', rating: 7.3 }),
    createTopPlayer({ playerId: 'd-3', name: 'Skriniar', position: 'Defender', rating: 7.0 }),
    createTopPlayer({ playerId: 'd-4', name: 'Nuno Mendes', position: 'Defender', rating: 7.2 }),
  ],
  midfielders: [
    createTopPlayer({ playerId: 'm-1', name: 'Vitinha', position: 'Midfielder', rating: 7.4 }),
    createTopPlayer({ playerId: 'm-2', name: 'Ugarte', position: 'Midfielder', rating: 7.0 }),
    createTopPlayer({ playerId: 'm-3', name: 'Zaïre-Emery', position: 'Midfielder', rating: 7.1 }),
  ],
  attackers: [
    createTopPlayer({ playerId: 'a-1', name: 'Dembélé', position: 'Attacker', rating: 7.3 }),
    createTopPlayer({ playerId: 'a-2', name: 'Ramos', position: 'Attacker', rating: 7.0 }),
    createTopPlayer({ playerId: 'a-3', name: 'Mbappé', position: 'Attacker', rating: 7.9 }),
  ],
};

export const sampleCompetitionsForSeason = [
  {
    leagueId: '61',
    leagueLogo: 'https://media.api-sports.io/football/leagues/61.png',
    leagueName: 'Ligue 1',
    season: 2025,
  },
  {
    leagueId: '2',
    leagueLogo: 'https://media.api-sports.io/football/leagues/2.png',
    leagueName: 'UEFA Champions League',
    season: 2025,
  },
];

export const sampleTeamStatsData: TeamStatsData = {
  rank: 2,
  points: 51,
  played: 24,
  wins: 15,
  draws: 6,
  losses: 3,
  goalsFor: 46,
  goalsAgainst: 21,
  homePlayed: 12,
  homeWins: 9,
  homeDraws: 2,
  homeLosses: 1,
  awayPlayed: 12,
  awayWins: 6,
  awayDraws: 4,
  awayLosses: 2,
  expectedGoalsFor: 41.6,
  pointsByVenue: {
    home: {
      played: 12,
      wins: 9,
      draws: 2,
      losses: 1,
      goalsFor: 27,
      goalsAgainst: 10,
      goalDiff: 17,
      points: 29,
    },
    away: {
      played: 12,
      wins: 6,
      draws: 4,
      losses: 2,
      goalsFor: 19,
      goalsAgainst: 11,
      goalDiff: 8,
      points: 22,
    },
  },
  goalsForPerMatch: 1.92,
  goalsAgainstPerMatch: 0.88,
  cleanSheets: 9,
  failedToScore: 2,
  goalBreakdown: [
    { key: '0-15', label: '0-15', value: 8 },
    { key: '16-30', label: '16-30', value: 5 },
    { key: '31-45', label: '31-45', value: 7 },
    { key: '46-60', label: '46-60', value: 9 },
    { key: '61-75', label: '61-75', value: 10 },
    { key: '76-90', label: '76-90', value: 7 },
  ],
  topPlayersByCategory: {
    ratings: [playerA, playerC, playerB],
    scorers: [playerA, playerB, playerC],
    assisters: [playerB, playerA, playerC],
  },
  comparisonMetrics: [
    {
      key: 'pointsPerMatch',
      value: 2.13,
      rank: 2,
      totalTeams: 18,
      leaders: [
        { teamId: '81', teamName: 'Marseille', teamLogo: 'https://media.api-sports.io/football/teams/81.png', value: 2.28 },
        { teamId: '85', teamName: 'Paris SG', teamLogo: 'https://media.api-sports.io/football/teams/85.png', value: 2.13 },
        { teamId: '91', teamName: 'Monaco', teamLogo: 'https://media.api-sports.io/football/teams/91.png', value: 2.1 },
      ],
    },
    {
      key: 'possession',
      value: 58.4,
      rank: 1,
      totalTeams: 18,
      leaders: [
        { teamId: '85', teamName: 'Paris SG', teamLogo: 'https://media.api-sports.io/football/teams/85.png', value: 58.4 },
        { teamId: '81', teamName: 'Marseille', teamLogo: 'https://media.api-sports.io/football/teams/81.png', value: 56.2 },
        { teamId: '93', teamName: 'Rennes', teamLogo: 'https://media.api-sports.io/football/teams/93.png', value: 54.9 },
      ],
    },
  ] as TeamComparisonMetric[],
  topPlayers: [playerA, playerB, playerC],
};
