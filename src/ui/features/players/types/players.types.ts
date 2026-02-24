export type PlayerProfile = {
    id: string | null;
    name: string | null;
    photo: string | null;
    position: string | null;
    age: number | null;
    height: string | null;
    weight: string | null;
    nationality: string | null;
    dateOfBirth: string | null;
    number: number | null;
    foot: string | null;
    transferValue: string | null;
    team: {
        id: string | null;
        name: string | null;
        logo: string | null;
    };
    league: {
        id: string | null;
        name: string | null;
        logo: string | null;
        season: number | null;
    };
};

export type PlayerCharacteristics = {
    touches: number | null;
    dribbles: number | null;
    chances: number | null;
    defense: number | null;
    duels: number | null;
    attack: number | null; // calculated roughly from available API values
};

export type PlayerTrophy = {
    name: string;
    count: number;
};

export type PlayerSeasonStats = {
    matches: number | null;
    starts: number | null;
    minutes: number | null;
    goals: number | null;
    assists: number | null;
    rating: string | null;
    // Tir
    shots: number | null;
    shotsOnTarget: number | null;
    penaltyGoals: number | null;
    // Passes
    passes: number | null;
    passesAccuracy: number | null;
    keyPasses: number | null;
    // Dribbles
    dribblesAttempts: number | null;
    dribblesSuccess: number | null;
    // Défense
    tackles: number | null;
    interceptions: number | null;
    blocks: number | null;
    duelsTotal: number | null;
    duelsWon: number | null;
    // Discipline / Fautes
    foulsCommitted: number | null;
    foulsDrawn: number | null;
    yellowCards: number | null;
    redCards: number | null;
    dribblesBeaten: number | null;
    // Gardien
    saves: number | null;
    goalsConceded: number | null;
    // Penalties
    penaltiesWon: number | null;
    penaltiesMissed: number | null;
    penaltiesCommitted: number | null;
};

export type PlayerMatchPerformance = {
    fixtureId: string;
    date: string | null;
    playerTeamId: string | null;
    competition: {
        id: string | null;
        name: string | null;
        logo: string | null;
    };
    homeTeam: {
        id: string | null;
        name: string | null;
        logo: string | null;
    };
    awayTeam: {
        id: string | null;
        name: string | null;
        logo: string | null;
    };
    goalsHome: number | null;
    goalsAway: number | null;
    playerStats: {
        minutes: number | null;
        rating: string | null;
        goals: number | null;
        assists: number | null;
        yellowCards: number | null;
        secondYellowCards: number | null;
        redCards: number | null;
        saves: number | null;
        penaltiesSaved: number | null;
        penaltiesMissed: number | null;
        isStarter: boolean | null;
    };
};

export type PlayerCareerSeason = {
    season: string | null;
    team: {
        id: string | null;
        name: string | null;
        logo: string | null;
    };
    matches: number | null;
    goals: number | null;
    assists: number | null;
    rating: string | null;
};

export type PlayerCareerTeam = {
    team: {
        id: string | null;
        name: string | null;
        logo: string | null;
    };
    period: string | null;
    matches: number | null;
    goals: number | null;
    assists: number | null;
};

export type PlayerApiCareerSeasonAggregateDto = {
    season?: string | null;
    team?: {
        id?: string | number | null;
        name?: string | null;
        logo?: string | null;
    };
    matches?: number | null;
    goals?: number | null;
    assists?: number | null;
    rating?: string | number | null;
};

export type PlayerApiCareerTeamAggregateDto = {
    team?: {
        id?: string | number | null;
        name?: string | null;
        logo?: string | null;
    };
    period?: string | null;
    matches?: number | null;
    goals?: number | null;
    assists?: number | null;
};

export type PlayerApiCareerAggregateResponse = {
    response?: {
        seasons?: PlayerApiCareerSeasonAggregateDto[];
        teams?: PlayerApiCareerTeamAggregateDto[];
    };
};

export type PlayerApiMatchPerformanceAggregateDto = {
    fixtureId?: string | number | null;
    date?: string | null;
    playerTeamId?: string | number | null;
    competition?: {
        id?: string | number | null;
        name?: string | null;
        logo?: string | null;
    };
    homeTeam?: {
        id?: string | number | null;
        name?: string | null;
        logo?: string | null;
    };
    awayTeam?: {
        id?: string | number | null;
        name?: string | null;
        logo?: string | null;
    };
    goalsHome?: number | null;
    goalsAway?: number | null;
    playerStats?: {
        minutes?: number | null;
        rating?: string | number | null;
        goals?: number | null;
        assists?: number | null;
        yellowCards?: number | null;
        secondYellowCards?: number | null;
        redCards?: number | null;
        saves?: number | null;
        penaltiesSaved?: number | null;
        penaltiesMissed?: number | null;
        isStarter?: boolean | null;
    };
};

export type PlayerApiMatchesAggregateResponse = {
    response?: PlayerApiMatchPerformanceAggregateDto[];
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
                    yellowred?: number | null;
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
