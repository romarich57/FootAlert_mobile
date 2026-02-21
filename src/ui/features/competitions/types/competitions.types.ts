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
