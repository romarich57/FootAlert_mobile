// AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
// Source: packages/api-contract/openapi/footalert.v1.yaml

export type paths = {
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health check */
        get: operations["getHealth"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/competitions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List competitions */
        get: operations["getCompetitions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/competitions/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get competition details by id */
        get: operations["getCompetitionById"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/competitions/{id}/matches": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get competition matches */
        get: operations["getCompetitionMatches"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/competitions/{id}/player-stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get competition player stats by type */
        get: operations["getCompetitionPlayerStats"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/competitions/{id}/standings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get competition standings */
        get: operations["getCompetitionStandings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/competitions/{id}/transfers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get competition transfers */
        get: operations["getCompetitionTransfers"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/competitions/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Search competitions by query */
        get: operations["searchCompetitions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/follows/players/{playerId}/season/{season}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get followed player stats by season */
        get: operations["getFollowPlayerSeason"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/follows/search/players": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Search players for follows feature */
        get: operations["searchFollowPlayers"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/follows/search/teams": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Search teams for follows feature */
        get: operations["searchFollowTeams"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/follows/teams/{teamId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get followed team details */
        get: operations["getFollowTeam"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/follows/teams/{teamId}/next-fixture": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get next fixture for followed team */
        get: operations["getFollowTeamNextFixture"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/follows/trends/players": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get trending players */
        get: operations["getFollowPlayersTrends"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/follows/trends/teams": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get trending teams */
        get: operations["getFollowTeamsTrends"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/matches": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List fixtures by date */
        get: operations["getMatchesByDate"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/matches/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get fixture details by id */
        get: operations["getMatchById"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notifications/tokens": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Register push token (signed request) */
        post: operations["registerPushToken"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notifications/tokens/{token}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Revoke push token (signed request) */
        delete: operations["revokePushToken"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/players/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get player details for a season */
        get: operations["getPlayerDetails"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/players/{id}/career": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get player career aggregates */
        get: operations["getPlayerCareer"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/players/{id}/matches": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get aggregated player matches */
        get: operations["getPlayerMatches"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/players/{id}/seasons": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get player seasons */
        get: operations["getPlayerSeasons"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/players/{id}/trophies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get player trophies */
        get: operations["getPlayerTrophies"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/players/fixtures/{fixtureId}/team/{teamId}/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get fixture player stats for a team */
        get: operations["getFixturePlayerStats"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/players/team/{teamId}/fixtures": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get fixtures for a team (players context) */
        get: operations["getPlayerTeamFixtures"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/teams/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get team details */
        get: operations["getTeamById"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/teams/{id}/advanced-stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get advanced team stats */
        get: operations["getTeamAdvancedStats"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/teams/{id}/fixtures": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get team fixtures */
        get: operations["getTeamFixtures"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/teams/{id}/leagues": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get leagues for a team */
        get: operations["getTeamLeagues"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/teams/{id}/next-fixture": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get next fixture for team */
        get: operations["getTeamNextFixture"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/teams/{id}/players": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get team players (paged) */
        get: operations["getTeamPlayers"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/teams/{id}/squad": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get team squad */
        get: operations["getTeamSquad"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/teams/{id}/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get team statistics */
        get: operations["getTeamStats"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/teams/{id}/transfers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get team transfers */
        get: operations["getTeamTransfers"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/teams/{id}/trophies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get team trophies */
        get: operations["getTeamTrophies"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/teams/standings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get league standings for teams endpoint */
        get: operations["getTeamsStandings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/telemetry/breadcrumbs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Push telemetry breadcrumb (signed request) */
        post: operations["sendTelemetryBreadcrumb"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/telemetry/errors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Push telemetry error (signed request) */
        post: operations["sendTelemetryError"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/telemetry/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Push telemetry event (signed request) */
        post: operations["sendTelemetryEvent"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
};
export type webhooks = Record<string, never>;
export type components = {
    schemas: {
        FlexibleObject: {
            [key: string]: unknown;
        };
        HealthResponse: {
            /** @enum {string} */
            status: "ok";
        };
        ListEnvelope: {
            response: components["schemas"]["FlexibleObject"][];
        };
        OptionalEnvelope: {
            response?: components["schemas"]["FlexibleObject"] | components["schemas"]["FlexibleObject"][] | number | string | boolean | null;
        };
        PagedEnvelope: {
            paging?: {
                [key: string]: unknown;
            } | null;
            response: components["schemas"]["FlexibleObject"][];
        };
        ProblemResponse: {
            details?: {
                [key: string]: unknown;
            } | {
                [key: string]: unknown;
            }[] | null;
            error: string;
            message: string;
        };
        PushTokenPayload: {
            appVersion: string;
            deviceId: string;
            /** @enum {string} */
            locale: "fr" | "en";
            /** @enum {string} */
            platform: "ios" | "android";
            /** @enum {string} */
            provider: "apns" | "fcm";
            timezone: string;
            token: string;
        };
        TelemetryAttributes: {
            [key: string]: components["schemas"]["TelemetryScalar"];
        };
        TelemetryBreadcrumbPayload: {
            attributes?: components["schemas"]["TelemetryAttributes"];
            name: string;
            /** Format: date-time */
            timestamp?: string;
            userContext?: components["schemas"]["TelemetryAttributes"];
        };
        TelemetryErrorContext: {
            details?: components["schemas"]["TelemetryAttributes"];
            feature?: string;
            method?: string;
            status?: number;
            url?: string;
        };
        TelemetryErrorPayload: {
            context?: components["schemas"]["TelemetryErrorContext"];
            message: string;
            name: string;
            stack?: string;
            /** Format: date-time */
            timestamp?: string;
            userContext?: components["schemas"]["TelemetryAttributes"];
        };
        TelemetryEventPayload: {
            attributes?: components["schemas"]["TelemetryAttributes"];
            name: string;
            /** Format: date-time */
            timestamp?: string;
            userContext?: components["schemas"]["TelemetryAttributes"];
        };
        TelemetryScalar: string | number | boolean | null;
    };
    responses: {
        /** @description Telemetry payload accepted */
        AcceptedTelemetryResponse: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    /** @enum {string} */
                    status: "accepted";
                    /** @enum {string} */
                    type: "event" | "error" | "breadcrumb";
                };
            };
        };
        /** @description Player career aggregate payload */
        CareerAggregateResponse: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    response: {
                        seasons?: components["schemas"]["FlexibleObject"][];
                        teams?: components["schemas"]["FlexibleObject"][];
                    };
                };
            };
        };
        /** @description API response envelope with list payload */
        ListEnvelopeResponse: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ListEnvelope"];
            };
        };
        /** @description API response envelope with optional payload */
        OptionalEnvelopeResponse: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["OptionalEnvelope"];
            };
        };
        /** @description API response envelope with list + paging */
        PagedEnvelopeResponse: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["PagedEnvelope"];
            };
        };
        /** @description Error payload */
        ProblemResponse: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ProblemResponse"];
            };
        };
    };
    parameters: {
        DateQuery: string;
        FixtureIdPath: string;
        IdPath: string;
        LeagueIdQuery: string;
        LeagueIdsQuery: string;
        OptionalLastQuery: number;
        OptionalLeagueIdQuery: string;
        OptionalNextQuery: number;
        OptionalPageQuery: number;
        OptionalSeasonQuery: number;
        OptionalTimezoneQuery: string;
        PlayerIdPath: string;
        PlayerStatsTypeQuery: "topscorers" | "topassists" | "topyellowcards" | "topredcards";
        QQuery: string;
        SeasonPath: number;
        SeasonQuery: number;
        TeamIdPath: string;
        TeamIdQuery: string;
        TimezoneQuery: string;
        TokenPath: string;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
};
export type $defs = Record<string, never>;
export interface operations {
    getHealth: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Service is healthy */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthResponse"];
                };
            };
        };
    };
    getCompetitions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getCompetitionById: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
            400: components["responses"]["ProblemResponse"];
        };
    };
    getCompetitionMatches: {
        parameters: {
            query: {
                season: components["parameters"]["SeasonQuery"];
            };
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getCompetitionPlayerStats: {
        parameters: {
            query: {
                season: components["parameters"]["SeasonQuery"];
                type: components["parameters"]["PlayerStatsTypeQuery"];
            };
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
            400: components["responses"]["ProblemResponse"];
        };
    };
    getCompetitionStandings: {
        parameters: {
            query: {
                season: components["parameters"]["SeasonQuery"];
            };
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
            400: components["responses"]["ProblemResponse"];
        };
    };
    getCompetitionTransfers: {
        parameters: {
            query?: {
                season?: components["parameters"]["OptionalSeasonQuery"];
            };
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    searchCompetitions: {
        parameters: {
            query: {
                q: components["parameters"]["QQuery"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
            400: components["responses"]["ProblemResponse"];
        };
    };
    getFollowPlayerSeason: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                playerId: components["parameters"]["PlayerIdPath"];
                season: components["parameters"]["SeasonPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    searchFollowPlayers: {
        parameters: {
            query: {
                q: components["parameters"]["QQuery"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    searchFollowTeams: {
        parameters: {
            query: {
                q: components["parameters"]["QQuery"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getFollowTeam: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                teamId: components["parameters"]["TeamIdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getFollowTeamNextFixture: {
        parameters: {
            query: {
                timezone: components["parameters"]["TimezoneQuery"];
            };
            header?: never;
            path: {
                teamId: components["parameters"]["TeamIdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getFollowPlayersTrends: {
        parameters: {
            query: {
                leagueIds: components["parameters"]["LeagueIdsQuery"];
                season: components["parameters"]["SeasonQuery"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getFollowTeamsTrends: {
        parameters: {
            query: {
                leagueIds: components["parameters"]["LeagueIdsQuery"];
                season: components["parameters"]["SeasonQuery"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getMatchesByDate: {
        parameters: {
            query: {
                date: components["parameters"]["DateQuery"];
                timezone: components["parameters"]["TimezoneQuery"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
            400: components["responses"]["ProblemResponse"];
        };
    };
    getMatchById: {
        parameters: {
            query: {
                timezone: components["parameters"]["TimezoneQuery"];
            };
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
            400: components["responses"]["ProblemResponse"];
            404: components["responses"]["ProblemResponse"];
        };
    };
    registerPushToken: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PushTokenPayload"];
            };
        };
        responses: {
            /** @description Token registered */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "registered";
                        token: string;
                    };
                };
            };
            400: components["responses"]["ProblemResponse"];
            401: components["responses"]["ProblemResponse"];
            403: components["responses"]["ProblemResponse"];
        };
    };
    revokePushToken: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                token: components["parameters"]["TokenPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Token revoked */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["ProblemResponse"];
            403: components["responses"]["ProblemResponse"];
        };
    };
    getPlayerDetails: {
        parameters: {
            query: {
                season: components["parameters"]["SeasonQuery"];
            };
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getPlayerCareer: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["CareerAggregateResponse"];
        };
    };
    getPlayerMatches: {
        parameters: {
            query: {
                last?: components["parameters"]["OptionalLastQuery"];
                season: components["parameters"]["SeasonQuery"];
                teamId: components["parameters"]["TeamIdQuery"];
            };
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getPlayerSeasons: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getPlayerTrophies: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getFixturePlayerStats: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                fixtureId: components["parameters"]["FixtureIdPath"];
                teamId: components["parameters"]["TeamIdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getPlayerTeamFixtures: {
        parameters: {
            query: {
                last?: components["parameters"]["OptionalLastQuery"];
                season: components["parameters"]["SeasonQuery"];
            };
            header?: never;
            path: {
                teamId: components["parameters"]["TeamIdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getTeamById: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getTeamAdvancedStats: {
        parameters: {
            query: {
                leagueId: components["parameters"]["LeagueIdQuery"];
                season: components["parameters"]["SeasonQuery"];
            };
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["OptionalEnvelopeResponse"];
        };
    };
    getTeamFixtures: {
        parameters: {
            query?: {
                leagueId?: components["parameters"]["OptionalLeagueIdQuery"];
                next?: components["parameters"]["OptionalNextQuery"];
                season?: components["parameters"]["OptionalSeasonQuery"];
                timezone?: components["parameters"]["OptionalTimezoneQuery"];
            };
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getTeamLeagues: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getTeamNextFixture: {
        parameters: {
            query: {
                timezone: components["parameters"]["TimezoneQuery"];
            };
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getTeamPlayers: {
        parameters: {
            query: {
                leagueId: components["parameters"]["LeagueIdQuery"];
                page?: components["parameters"]["OptionalPageQuery"];
                season: components["parameters"]["SeasonQuery"];
            };
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["PagedEnvelopeResponse"];
        };
    };
    getTeamSquad: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getTeamStats: {
        parameters: {
            query: {
                leagueId: components["parameters"]["LeagueIdQuery"];
                season: components["parameters"]["SeasonQuery"];
            };
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["OptionalEnvelopeResponse"];
        };
    };
    getTeamTransfers: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getTeamTrophies: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
        };
    };
    getTeamsStandings: {
        parameters: {
            query: {
                leagueId: components["parameters"]["LeagueIdQuery"];
                season: components["parameters"]["SeasonQuery"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
            400: components["responses"]["ProblemResponse"];
        };
    };
    sendTelemetryBreadcrumb: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TelemetryBreadcrumbPayload"];
            };
        };
        responses: {
            200: components["responses"]["AcceptedTelemetryResponse"];
            400: components["responses"]["ProblemResponse"];
            401: components["responses"]["ProblemResponse"];
            403: components["responses"]["ProblemResponse"];
        };
    };
    sendTelemetryError: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TelemetryErrorPayload"];
            };
        };
        responses: {
            200: components["responses"]["AcceptedTelemetryResponse"];
            400: components["responses"]["ProblemResponse"];
            401: components["responses"]["ProblemResponse"];
            403: components["responses"]["ProblemResponse"];
        };
    };
    sendTelemetryEvent: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TelemetryEventPayload"];
            };
        };
        responses: {
            200: components["responses"]["AcceptedTelemetryResponse"];
            400: components["responses"]["ProblemResponse"];
            401: components["responses"]["ProblemResponse"];
            403: components["responses"]["ProblemResponse"];
        };
    };
}

