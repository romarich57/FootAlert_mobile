export type PlayerProfile = {
    id: string;
    name: string;
    photo: string;
    position: string;
    age: number;
    height: string;
    weight: string;
    nationality: string;
    dateOfBirth: string;
    number: number | null;
    foot: string;
    transferValue?: string; // Optional as it might not be provided by API
    team: {
        id: string;
        name: string;
        logo: string;
    };
    league: {
        id: string;
        name: string;
        logo: string;
        season: number;
    };
};

export type PlayerCharacteristics = {
    touches: number;
    dribbles: number;
    chances: number;
    defense: number;
    duels: number;
    attack: number; // calculated roughly from shots/goals
};

export type PlayerTrophy = {
    name: string;
    count: number;
};

export type PlayerSeasonStats = {
    matches: number;
    starts: number;
    minutes: number;
    goals: number;
    assists: number;
    rating: string;
    // Deep stats
    shots: number;
    shotsOnTarget: number;
    passes: number;
    passesAccuracy: number;
    tackles: number;
    interceptions: number;
    yellowCards: number;
    redCards: number;
};

export type PlayerMatchPerformance = {
    fixtureId: string;
    date: string;
    competition: {
        id: string;
        name: string;
        logo: string;
    };
    homeTeam: {
        id: string;
        name: string;
        logo: string;
    };
    awayTeam: {
        id: string;
        name: string;
        logo: string;
    };
    goalsHome: number | null;
    goalsAway: number | null;
    playerStats: {
        minutes: number;
        rating: string;
        goals: number;
        assists: number;
        yellowCards: number;
        redCards: number;
        isStarter: boolean;
    };
};

export type PlayerCareerSeason = {
    season: string;
    team: {
        id: string;
        name: string;
        logo: string;
    };
    matches: number;
    goals: number;
    assists: number;
    rating: string;
};

export type PlayerCareerTeam = {
    team: {
        id: string;
        name: string;
        logo: string;
    };
    period: string;
    matches: number;
    goals: number;
    assists: number;
};

// API DTOs

export type PlayerApiDetailsDto = {
    player?: {
        id?: number;
        name?: string;
        firstname?: string;
        lastname?: string;
        age?: number;
        birth?: {
            date?: string;
            place?: string;
            country?: string;
        };
        nationality?: string;
        height?: string;
        weight?: string;
        injured?: boolean;
        photo?: string;
    };
    statistics?: Array<{
        team?: {
            id?: number;
            name?: string;
            logo?: string;
        };
        league?: {
            id?: number;
            name?: string;
            country?: string;
            logo?: string;
            flag?: string;
            season?: number;
        };
        games?: {
            appearences?: number;
            lineups?: number;
            minutes?: number;
            number?: number | null;
            position?: string;
            rating?: string | null;
            captain?: boolean;
        };
        substitutes?: {
            in?: number;
            out?: number;
            bench?: number;
        };
        shots?: {
            total?: number;
            on?: number;
        };
        goals?: {
            total?: number;
            conceded?: number;
            assists?: number;
            saves?: number;
        };
        passes?: {
            total?: number;
            key?: number;
            accuracy?: number;
        };
        tackles?: {
            total?: number;
            blocks?: number;
            interceptions?: number;
        };
        duels?: {
            total?: number;
            won?: number;
        };
        dribbles?: {
            attempts?: number;
            success?: number;
            past?: number;
        };
        fouls?: {
            drawn?: number;
            committed?: number;
        };
        cards?: {
            yellow?: number;
            yellowred?: number;
            red?: number;
        };
        penalty?: {
            won?: number;
            commited?: number;
            scored?: number;
            missed?: number;
            saved?: number;
        };
    }>;
};

export type PlayerApiTrophyDto = {
    league?: string;
    country?: string;
    season?: string;
    place?: string; // "Winner", "Runner-up"
};

export type PlayerApiFixtureDto = {
    fixture?: {
        id?: number;
        date?: string;
        status?: {
            long?: string;
            short?: string;
            elapsed?: number;
        };
    };
    league?: {
        id?: number;
        name?: string;
        country?: string;
        logo?: string;
        season?: number;
    };
    teams?: {
        home?: {
            id?: number;
            name?: string;
            logo?: string;
            winner?: boolean | null;
        };
        away?: {
            id?: number;
            name?: string;
            logo?: string;
            winner?: boolean | null;
        };
    };
    goals?: {
        home?: number | null;
        away?: number | null;
    };
    score?: {
        halftime?: { home?: number | null; away?: number | null };
        fulltime?: { home?: number | null; away?: number | null };
        extratime?: { home?: number | null; away?: number | null };
        penalty?: { home?: number | null; away?: number | null };
    };
};

export type PlayerApiMatchPerformanceDto = {
    players?: Array<{
        team?: {
            id?: number;
            name?: string;
            logo?: string;
            update?: string;
        };
        players?: Array<{
            player?: {
                id?: number;
                name?: string;
                photo?: string;
            };
            statistics?: Array<{
                games?: {
                    minutes?: number;
                    number?: number;
                    position?: string;
                    rating?: string;
                    captain?: boolean;
                    substitute?: boolean;
                };
                offsides?: number | null;
                shots?: {
                    total?: number | null;
                    on?: number | null;
                };
                goals?: {
                    total?: number | null;
                    conceded?: number | null;
                    assists?: number | null;
                    saves?: number | null;
                };
                passes?: {
                    total?: number | null;
                    key?: number | null;
                    accuracy?: string | null;
                };
                tackles?: {
                    total?: number | null;
                    blocks?: number | null;
                    interceptions?: number | null;
                };
                duels?: {
                    total?: number | null;
                    won?: number | null;
                };
                dribbles?: {
                    attempts?: number | null;
                    success?: number | null;
                    past?: number | null;
                };
                fouls?: {
                    drawn?: number | null;
                    committed?: number | null;
                };
                cards?: {
                    yellow?: number | null;
                    red?: number | null;
                };
                penalty?: {
                    won?: number | null;
                    commited?: number | null;
                    scored?: number | null;
                    missed?: number | null;
                    saved?: number | null;
                };
            }>;
        }>;
    }>;
};

export type PlayerApiResponse<T> = {
    errors: Array<string> | Record<string, string>;
    results: number;
    paging: {
        current: number;
        total: number;
    };
    response: T[];
};
