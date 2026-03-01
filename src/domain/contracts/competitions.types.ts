export type CompetitionsApiResponse<T> = {
    response: T[];
};

export type CompetitionsApiLeagueDto = {
    league: {
        id: number;
        name: string;
        type: string;
        logo: string;
    };
    country: {
        name: string;
        code: string | null;
        flag: string | null;
    };
    seasons: Array<{
        year: number;
        current: boolean;
    }>;
};

export type Competition = {
    id: string;
    name: string;
    logo: string;
    type: string;
    countryName: string;
};

export type CountryWithCompetitions = {
    name: string;
    code: string | null;
    flag: string | null;
    competitions: Competition[];
};

// --- API DTOs for Details ---

type CompetitionsApiStandingSplitDto = {
    played?: number;
    win?: number;
    draw?: number;
    lose?: number;
    goals?: {
        for?: number;
        against?: number;
    };
};

export type CompetitionsApiStandingDto = {
    league: {
        id: number;
        name: string;
        country: string;
        logo: string;
        flag: string | null;
        season: number;
        standings: Array<Array<{
            rank: number;
            team: {
                id: number;
                name: string;
                logo: string;
            };
            points: number;
            goalsDiff: number;
            group: string;
            form: string;
            status: string;
            description: string | null;
            all: {
                played: number;
                win: number;
                draw: number;
                lose: number;
                goals: {
                    for: number;
                    against: number;
                };
            };
            home: CompetitionsApiStandingSplitDto;
            away: CompetitionsApiStandingSplitDto;
            update: string;
        }>>;
    };
};

export type CompetitionsApiFixtureDto = {
    fixture: {
        id: number;
        referee: string | null;
        timezone: string;
        date: string;
        timestamp: number;
        periods: {
            first: number | null;
            second: number | null;
        };
        venue: {
            id: number | null;
            name: string | null;
            city: string | null;
        };
        status: {
            long: string;
            short: string;
            elapsed: number | null;
        };
    };
    league: {
        id: number;
        name: string;
        country: string;
        logo: string;
        flag: string | null;
        season: number;
        round: string;
    };
    teams: {
        home: {
            id: number;
            name: string;
            logo: string;
            winner: boolean | null;
        };
        away: {
            id: number;
            name: string;
            logo: string;
            winner: boolean | null;
        };
    };
    goals: {
        home: number | null;
        away: number | null;
    };
    score: {
        halftime: { home: number | null; away: number | null };
        fulltime: { home: number | null; away: number | null };
        extratime: { home: number | null; away: number | null };
        penalty: { home: number | null; away: number | null };
    };
};

export type CompetitionsApiTransferDto = {
    player: {
        id: number;
        name: string;
    };
    update: string;
    transfers: Array<{
        date: string;
        type: string;
        teams: {
            in: {
                id: number;
                name: string;
                logo: string;
            };
            out: {
                id: number;
                name: string;
                logo: string;
            };
        };
    }>;
    context?: {
        teamInInLeague: boolean;
        teamOutInLeague: boolean;
    };
};

// Players Stats uses existing types from players, but we can define a simplified DTO
export type CompetitionsApiPlayerStatDto = {
    player: {
        id: number;
        name: string;
        firstname: string;
        lastname: string;
        age: number | null;
        nationality: string | null;
        height: string | null;
        weight: string | null;
        injured: boolean;
        photo: string;
    };
    statistics: Array<{
        team: {
            id: number;
            name: string;
            logo: string;
        };
        league: {
            id: number;
            name: string;
            country: string;
            logo: string;
            flag: string | null;
            season: number;
        };
        games: {
            appearences: number | null;
            lineups: number | null;
            minutes: number | null;
            number: number | null;
            position: string;
            rating: string | null;
            captain: boolean;
        };
        substitutes: {
            in: number | null;
            out: number | null;
            bench: number | null;
        } | null;
        shots: {
            total: number | null;
            on: number | null;
        };
        goals: {
            total: number | null;
            conceded: number | null;
            assists: number | null;
            saves: number | null;
        };
        passes: {
            total: number | null;
            key: number | null;
            accuracy: number | null;
        };
        tackles: {
            total: number | null;
            blocks: number | null;
            interceptions: number | null;
        };
        duels: {
            total: number | null;
            won: number | null;
        };
        dribbles: {
            attempts: number | null;
            success: number | null;
            past: number | null;
        };
        fouls: {
            drawn: number | null;
            committed: number | null;
        };
        cards: {
            yellow: number | null;
            yellowred: number | null;
            red: number | null;
        };
        penalty: {
            won: number | null;
            commited: number | null;
            scored: number | null;
            missed: number | null;
            saved: number | null;
        };
    }>;
};

// --- Domain Models for Details ---

export type StandingRow = {
    rank: number;
    teamId: number;
    teamName: string;
    teamLogo: string;
    points: number;
    goalsDiff: number;
    played: number;
    win: number;
    draw: number;
    lose: number;
    goalsFor: number;
    goalsAgainst: number;
    group: string;
    form: string;
    description: string | null;
    home: StandingVenueStats;
    away: StandingVenueStats;
};

export type StandingVenueStats = {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goalsFor: number;
    goalsAgainst: number;
};

export type StandingGroup = {
    groupName: string;
    rows: StandingRow[];
};

export type CompetitionTeamStatsMetricKey =
    | 'pointsPerMatch'
    | 'winRate'
    | 'goalsScoredPerMatch'
    | 'goalsConcededPerMatch'
    | 'goalDiffPerMatch'
    | 'formIndex'
    | 'formPointsPerMatch';

export type CompetitionTeamHomeAwayMetricKey =
    | 'homePPG'
    | 'awayPPG'
    | 'homeGoalsFor'
    | 'awayGoalsFor'
    | 'homeGoalsAgainst'
    | 'awayGoalsAgainst'
    | 'deltaHomeAwayPPG'
    | 'deltaHomeAwayGoalsFor'
    | 'deltaHomeAwayGoalsAgainst';

export type CompetitionTeamAdvancedMetricKey =
    | 'cleanSheets'
    | 'failedToScore'
    | 'xGPerMatch'
    | 'possession'
    | 'shotsPerMatch'
    | 'shotsOnTargetPerMatch';

export type CompetitionTeamGoalMinuteBreakdownItem = {
    key: string;
    label: string;
    value: number | null;
};

export type CompetitionTeamStatsComputedRow = {
    rank: number;
    teamId: number;
    teamName: string;
    teamLogo: string;
    points: number;
    goalsDiff: number;
    played: number;
    win: number;
    draw: number;
    lose: number;
    goalsFor: number;
    goalsAgainst: number;
    form: string;
    home: StandingVenueStats;
    away: StandingVenueStats;
    pointsPerMatch: number | null;
    winRate: number | null;
    goalsScoredPerMatch: number | null;
    goalsConcededPerMatch: number | null;
    goalDiffPerMatch: number | null;
    formIndex: number | null;
    formPointsPerMatch: number | null;
    homePPG: number | null;
    awayPPG: number | null;
    homeGoalsFor: number | null;
    awayGoalsFor: number | null;
    homeGoalsAgainst: number | null;
    awayGoalsAgainst: number | null;
    deltaHomeAwayPPG: number | null;
    deltaHomeAwayGoalsFor: number | null;
    deltaHomeAwayGoalsAgainst: number | null;
};

export type CompetitionTeamAdvancedRow = {
    teamId: number;
    teamName: string;
    teamLogo: string;
    cleanSheets: number | null;
    failedToScore: number | null;
    xGPerMatch: number | null;
    possession: number | null;
    shotsPerMatch: number | null;
    shotsOnTargetPerMatch: number | null;
    goalMinuteBreakdown: CompetitionTeamGoalMinuteBreakdownItem[];
};

export type CompetitionTeamStatsLeaderboardItem = {
    teamId: number;
    teamName: string;
    teamLogo: string;
    value: number;
};

export type CompetitionTeamStatsSortOrder = 'asc' | 'desc';

export type CompetitionTeamStatsLeaderboard<K extends string> = {
    metric: K;
    sortOrder: CompetitionTeamStatsSortOrder;
    items: CompetitionTeamStatsLeaderboardItem[];
};

export type CompetitionTeamStatsSection<K extends string> = {
    metrics: K[];
    leaderboards: Record<K, CompetitionTeamStatsLeaderboard<K>>;
};

export type CompetitionTeamAdvancedSection = CompetitionTeamStatsSection<CompetitionTeamAdvancedMetricKey> & {
    rows: CompetitionTeamAdvancedRow[];
    top10TeamIds: number[];
    unavailableMetrics: CompetitionTeamAdvancedMetricKey[];
};

export type CompetitionTeamStatsDashboardData = {
    summary: CompetitionTeamStatsSection<CompetitionTeamStatsMetricKey>;
    homeAway: CompetitionTeamStatsSection<CompetitionTeamHomeAwayMetricKey>;
    advanced: CompetitionTeamAdvancedSection;
};

export type Fixture = {
    id: number;
    date: string;
    timestamp: number;
    status: string;
    elapsed: number | null;
    round: string;
    homeTeam: {
        id: number;
        name: string;
        logo: string;
        winner: boolean | null;
    };
    awayTeam: {
        id: number;
        name: string;
        logo: string;
        winner: boolean | null;
    };
    goalsHome: number | null;
    goalsAway: number | null;
    penaltyHome: number | null;
    penaltyAway: number | null;
};

export type TransferDirection = 'arrival' | 'departure' | 'internal';

export type Transfer = {
    id: string;
    playerId: number;
    playerName: string;
    playerPhoto: string;
    date: string;
    timestamp: number;
    type: string;
    direction: TransferDirection;
    isArrival: boolean;
    isDeparture: boolean;
    teamIn: {
        id: number;
        name: string;
        logo: string;
    };
    teamOut: {
        id: number;
        name: string;
        logo: string;
    };
};

export type CompetitionPlayerStat = {
    playerId: number;
    playerName: string;
    playerPhoto: string;
    teamId: number;
    teamName: string;
    teamLogo: string;
    position: string;
    rating: string | null;
    matchesPlayed: number | null;
    goals: number | null;
    assists: number | null;
    yellowCards: number | null;
    redCards: number | null;
};

export type CompetitionTotwRole = 'GK' | 'DEF' | 'MID' | 'ATT';

export type CompetitionTotwFormation = '4-3-3';

export type CompetitionTotwPlayer = {
    playerId: number;
    playerName: string;
    playerPhoto: string;
    teamId: number;
    teamName: string;
    teamLogo: string;
    position: string;
    role: CompetitionTotwRole;
    rating: number;
    gridX: number;
    gridY: number;
};

export type CompetitionTotwData = {
    formation: CompetitionTotwFormation;
    season: number;
    averageRating: number;
    players: CompetitionTotwPlayer[];
};
