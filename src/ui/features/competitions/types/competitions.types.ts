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
};

export type StandingGroup = {
    groupName: string;
    rows: StandingRow[];
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
