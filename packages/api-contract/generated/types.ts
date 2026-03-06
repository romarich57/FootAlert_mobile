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
    "/v1/competitions/{id}/bracket": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get competition bracket */
        get: operations["getCompetitionBracket"];
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
    "/v1/follows/players/cards": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get aggregated cards for followed players */
        get: operations["getFollowPlayerCards"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/follows/search/competitions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Search competitions for follows feature */
        get: operations["searchFollowCompetitions"];
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
    "/v1/follows/teams/cards": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get aggregated cards for followed teams */
        get: operations["getFollowTeamCards"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/follows/trends/competitions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get curated list of top competitions for onboarding */
        get: operations["getFollowCompetitionsTrends"];
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
    "/v1/matches/{id}/absences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get absences (injuries/suspensions) for both match teams */
        get: operations["getMatchAbsences"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/matches/{id}/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get fixture events */
        get: operations["getMatchEvents"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/matches/{id}/head-to-head": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get head-to-head fixtures for match teams */
        get: operations["getMatchHeadToHead"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/matches/{id}/lineups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get fixture lineups */
        get: operations["getMatchLineups"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/matches/{id}/players/{teamId}/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get fixture player stats for one team */
        get: operations["getMatchPlayersStatsByTeam"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/matches/{id}/predictions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get fixture predictions */
        get: operations["getMatchPredictions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/matches/{id}/statistics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get fixture statistics */
        get: operations["getMatchStatistics"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/mobile/privacy/erase": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Erase device-bound personal data after fresh attestation proof */
        post: operations["eraseMobilePrivacyData"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/mobile/session/attest": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Verify mobile attestation and issue short-lived session token */
        post: operations["attestMobileSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/mobile/session/challenge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create short-lived mobile attestation challenge */
        post: operations["createMobileSessionChallenge"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/mobile/session/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Rotate refresh token and issue a new short-lived session token */
        post: operations["refreshMobileSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/mobile/session/revoke": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Revoke refresh-token family */
        post: operations["revokeMobileSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notifications/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Ingest notification business event (internal service-to-service) */
        post: operations["ingestNotificationEvent"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notifications/metrics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get in-process notifications metrics snapshot */
        get: operations["getNotificationMetricsSnapshot"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notifications/opened": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Track push notification open (attested mobile session) */
        post: operations["trackNotificationOpened"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notifications/subscriptions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get notification preferences for a scope (attested mobile session) */
        get: operations["getNotificationSubscriptions"];
        put?: never;
        /** Upsert notification preferences for a scope (attested mobile session) */
        post: operations["upsertNotificationSubscriptions"];
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
        /** Register push token (attested mobile session) */
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
        /** Revoke push token (attested mobile session) */
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
    "/v1/search/global": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Global search for teams, competitions, players and matches */
        get: operations["searchGlobal"];
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
    "/v1/teams/{id}/overview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get aggregated team overview for mobile details screens */
        get: operations["getTeamOverview"];
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
        /** Push telemetry breadcrumb (attested mobile session) */
        post: operations["sendTelemetryBreadcrumb"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/telemetry/breadcrumbs/batch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Push telemetry breadcrumb batch (attested mobile session) */
        post: operations["sendTelemetryBreadcrumbBatch"];
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
        /** Push telemetry error (attested mobile session) */
        post: operations["sendTelemetryError"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/telemetry/errors/batch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Push telemetry error batch (attested mobile session) */
        post: operations["sendTelemetryErrorBatch"];
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
        /** Push telemetry event (attested mobile session) */
        post: operations["sendTelemetryEvent"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/telemetry/events/batch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Push telemetry event batch (attested mobile session) */
        post: operations["sendTelemetryEventBatch"];
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
        BracketMatch: {
            awayScore?: number | null;
            awayTeam: components["schemas"]["BracketTeam"];
            /** Format: date-time */
            date: string;
            homeScore?: number | null;
            homeTeam: components["schemas"]["BracketTeam"];
            matchId: number;
            penaltyAway?: number | null;
            penaltyHome?: number | null;
            status: string;
            winnerId?: number | null;
        };
        BracketTeam: {
            id?: number | null;
            logo: string;
            name: string;
        };
        CompetitionBracketResponse: {
            bracket?: components["schemas"]["KnockoutRound"][] | null;
            /** @enum {string} */
            competitionKind: "league" | "cup" | "mixed";
        };
        CursorPageInfo: {
            hasMore: boolean;
            nextCursor: string | null;
            returnedCount: number;
        };
        FlexibleObject: {
            [key: string]: unknown;
        };
        HealthResponse: {
            cache: {
                /** @enum {string} */
                backend: "memory" | "redis";
                degraded: boolean;
                redis: {
                    configured: boolean;
                    lastError: string | null;
                    prefix: string;
                    ready: boolean;
                };
                strictMode: boolean;
            };
            /** @enum {string} */
            status: "ok" | "degraded";
        };
        KnockoutRound: {
            matches: components["schemas"]["BracketMatch"][];
            name: string;
            order: number;
        };
        ListEnvelope: {
            pageInfo?: components["schemas"]["CursorPageInfo"] | null;
            response: components["schemas"]["FlexibleObject"][];
        };
        MobilePrivacyEraseRequest: {
            attestation: components["schemas"]["MobileSessionAttestation"];
            challengeId: string;
            deviceIdHash: string;
            /** @enum {string} */
            platform: "android" | "ios";
        };
        MobilePrivacyEraseResponse: {
            erasedAtMs: number;
            requestId: string;
            /** @enum {string} */
            status: "erased";
        };
        MobileSessionAttestation: {
            token: string;
            /** @enum {string} */
            type: "play_integrity" | "app_attest";
        };
        MobileSessionAttestRequest: {
            attestation: components["schemas"]["MobileSessionAttestation"];
            challengeId: string;
            deviceIdHash: string;
            /** @enum {string} */
            platform: "android" | "ios";
        };
        MobileSessionAttestResponse: {
            accessToken: string;
            expiresAtMs: number;
            /** @enum {string} */
            integrity: "strong" | "device" | "basic" | "unknown";
            refreshExpiresAtMs: number;
            refreshToken: string;
        };
        MobileSessionChallengeRequest: {
            appVersion: string;
            buildNumber: string;
            deviceIdHash: string;
            /** @enum {string} */
            platform: "android" | "ios";
        };
        MobileSessionChallengeResponse: {
            challenge: string;
            challengeId: string;
            expiresAtMs: number;
        };
        MobileSessionRefreshRequest: {
            refreshToken: string;
        };
        MobileSessionRevokeRequest: {
            refreshToken: string;
        };
        /** @enum {string} */
        NotificationAlertType: "match_start" | "halftime" | "match_end" | "goal" | "red_card" | "yellow_card" | "assist" | "missed_penalty" | "transfer" | "lineup" | "starting_lineup" | "substitution" | "match_rating" | "match_reminder";
        NotificationEventIngestRequest: {
            alertType: components["schemas"]["NotificationAlertType"];
            body: string;
            competitionId?: string | null;
            externalEventId: string;
            fixtureId?: string | null;
            /** Format: date-time */
            occurredAt?: string;
            payload?: {
                [key: string]: unknown;
            };
            playerIds?: string[];
            source: string;
            teamIds?: string[];
            title: string;
        };
        NotificationEventIngestResponse: {
            deduplicated: boolean;
            eventId: string;
            /** @enum {string} */
            status: "accepted";
        };
        NotificationMetricsSnapshot: {
            counters: {
                [key: string]: number;
            };
            gauges: {
                [key: string]: number;
            };
        };
        NotificationOpenedRequest: {
            deviceId: string;
            eventId: string;
        };
        NotificationOpenedResponse: {
            openedCount: number;
            /** @enum {string} */
            status: "ok";
        };
        /** @enum {string} */
        NotificationScopeKind: "match" | "team" | "player" | "competition";
        NotificationSubscriptionInput: {
            alertType: components["schemas"]["NotificationAlertType"];
            enabled: boolean;
        };
        NotificationSubscriptionRecord: {
            alertType: components["schemas"]["NotificationAlertType"];
            /** Format: date-time */
            createdAt: string;
            deviceId: string;
            enabled: boolean;
            id: string;
            scopeId: string;
            scopeKind: components["schemas"]["NotificationScopeKind"];
            /** Format: date-time */
            updatedAt: string;
        };
        NotificationSubscriptionsListResponse: {
            subscriptions: components["schemas"]["NotificationSubscriptionRecord"][];
        };
        NotificationSubscriptionUpsertRequest: {
            deviceId: string;
            scopeId: string;
            scopeKind: components["schemas"]["NotificationScopeKind"];
            subscriptions: components["schemas"]["NotificationSubscriptionInput"][];
        };
        NotificationSubscriptionUpsertResponse: {
            /** @enum {string} */
            status: "ok";
            subscriptions: components["schemas"]["NotificationSubscriptionRecord"][];
        };
        OptionalEnvelope: {
            response?: components["schemas"]["FlexibleObject"] | components["schemas"]["FlexibleObject"][] | number | string | boolean | null;
        };
        PagedEnvelope: {
            pageInfo?: components["schemas"]["CursorPageInfo"] | null;
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
        SearchCompetitionResult: {
            country: string;
            id: string;
            logo: string;
            name: string;
            type: string;
        };
        SearchGlobalMeta: {
            degradedSources: string[];
            partial: boolean;
        };
        SearchGlobalResponse: {
            competitions: components["schemas"]["SearchCompetitionResult"][];
            matches: components["schemas"]["SearchMatchResult"][];
            meta: components["schemas"]["SearchGlobalMeta"];
            players: components["schemas"]["SearchPlayerResult"][];
            teams: components["schemas"]["SearchTeamResult"][];
        };
        SearchMatchResult: {
            awayGoals: number | null;
            awayTeamId: string;
            awayTeamLogo: string;
            awayTeamName: string;
            competitionCountry: string;
            competitionId: string;
            competitionLogo: string;
            competitionName: string;
            fixtureId: string;
            homeGoals: number | null;
            homeTeamId: string;
            homeTeamLogo: string;
            homeTeamName: string;
            /** Format: date-time */
            startDate: string;
            statusLong: string;
            statusShort: string;
        };
        SearchPlayerResult: {
            id: string;
            leagueName: string;
            name: string;
            photo: string;
            position: string;
            teamLogo: string;
            teamName: string;
        };
        SearchTeamResult: {
            country: string;
            id: string;
            logo: string;
            name: string;
        };
        TeamFormEntry: {
            fixtureId: string;
            opponentLogo: string | null;
            opponentName: string | null;
            /** @enum {string} */
            result: "W" | "D" | "L" | "";
            score: string | null;
        };
        TeamMatchItem: {
            awayGoals: number | null;
            awayTeamId: string | null;
            awayTeamLogo: string | null;
            awayTeamName: string | null;
            date: string | null;
            fixtureId: string;
            homeGoals: number | null;
            homeTeamId: string | null;
            homeTeamLogo: string | null;
            homeTeamName: string | null;
            leagueId: string | null;
            leagueLogo: string | null;
            leagueName: string | null;
            minute: number | null;
            round: string | null;
            /** @enum {string} */
            status: "upcoming" | "live" | "finished";
            statusLabel: string | null;
            venue: string | null;
        };
        TeamOverviewCoach: {
            age: number | null;
            id: string | null;
            name: string | null;
            photo: string | null;
        };
        TeamOverviewCoachPerformance: {
            coach: components["schemas"]["TeamOverviewCoach"] | null;
            draws: number | null;
            losses: number | null;
            played: number | null;
            pointsPerMatch: number | null;
            winRate: number | null;
            wins: number | null;
        };
        TeamOverviewHistoryPoint: {
            rank: number | null;
            season: number;
        };
        TeamOverviewMiniStanding: {
            leagueId: string | null;
            leagueLogo: string | null;
            leagueName: string | null;
            rows: components["schemas"]["TeamStandingRow"][];
        };
        TeamOverviewPlayerLeaders: {
            assisters: components["schemas"]["TeamTopPlayer"][];
            ratings: components["schemas"]["TeamTopPlayer"][];
            scorers: components["schemas"]["TeamTopPlayer"][];
        };
        TeamOverviewResponse: {
            coachPerformance: components["schemas"]["TeamOverviewCoachPerformance"] | null;
            miniStanding: components["schemas"]["TeamOverviewMiniStanding"] | null;
            nextMatch: components["schemas"]["TeamMatchItem"] | null;
            playerLeaders: components["schemas"]["TeamOverviewPlayerLeaders"];
            recentForm: components["schemas"]["TeamFormEntry"][];
            seasonLineup: components["schemas"]["TeamSeasonLineup"];
            seasonStats: components["schemas"]["TeamOverviewSeasonStats"];
            standingHistory: components["schemas"]["TeamOverviewHistoryPoint"][];
            trophiesCount: number | null;
            trophyWinsCount: number | null;
        };
        TeamOverviewSeasonStats: {
            conceded: number | null;
            draws: number | null;
            goalDiff: number | null;
            losses: number | null;
            played: number | null;
            points: number | null;
            rank: number | null;
            scored: number | null;
            wins: number | null;
        };
        TeamSeasonLineup: {
            attackers: components["schemas"]["TeamTopPlayer"][];
            defenders: components["schemas"]["TeamTopPlayer"][];
            estimated: boolean;
            /** @enum {string} */
            formation: "4-3-3";
            goalkeeper: components["schemas"]["TeamTopPlayer"] | null;
            midfielders: components["schemas"]["TeamTopPlayer"][];
        };
        TeamStandingRow: {
            all: components["schemas"]["TeamStandingStats"];
            away: components["schemas"]["TeamStandingStats"];
            form: string | null;
            goalDiff: number | null;
            home: components["schemas"]["TeamStandingStats"];
            isTargetTeam: boolean;
            played: number | null;
            points: number | null;
            rank: number | null;
            teamId: string | null;
            teamLogo: string | null;
            teamName: string | null;
            update: string | null;
        };
        TeamStandingStats: {
            draw: number | null;
            goalsAgainst: number | null;
            goalsFor: number | null;
            lose: number | null;
            played: number | null;
            win: number | null;
        };
        TeamTopPlayer: {
            assists: number | null;
            goals: number | null;
            name: string | null;
            photo: string | null;
            playerId: string;
            position: string | null;
            rating: number | null;
            teamLogo: string | null;
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
        TrendCompetitionItem: {
            competitionId: string;
            competitionLogo: string;
            competitionName: string;
            country: string;
            type: string;
        };
        TrendCompetitionsResponse: {
            competitions: components["schemas"]["TrendCompetitionItem"][];
        };
    };
    responses: {
        /** @description Telemetry payload accepted */
        AcceptedTelemetryResponse: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    count?: number;
                    /** @enum {string} */
                    status: "accepted";
                    /** @enum {string} */
                    type: "event" | "event_batch" | "error" | "error_batch" | "breadcrumb" | "breadcrumb_batch";
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
        /** @description Normalized global search payload */
        SearchGlobalResponse: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["SearchGlobalResponse"];
            };
        };
        /** @description Aggregated team overview payload */
        TeamOverviewResponse: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["TeamOverviewResponse"];
            };
        };
    };
    parameters: {
        DateQuery: string;
        FixtureIdPath: string;
        HistorySeasonsQuery: string;
        IdPath: string;
        IdsQuery: string;
        LeagueIdQuery: string;
        LeagueIdsQuery: string;
        NotificationDeviceIdQuery: string;
        NotificationScopeIdQuery: string;
        NotificationScopeKindQuery: components["schemas"]["NotificationScopeKind"];
        OptionalCursorQuery: string;
        OptionalLastQuery: number;
        OptionalLeagueIdQuery: string;
        OptionalLimitQuery: number;
        OptionalNextQuery: number;
        OptionalPageQuery: number;
        OptionalSeasonQuery: number;
        OptionalStatisticsPeriodQuery: "all" | "first" | "second";
        OptionalTimezoneQuery: string;
        PlayerIdPath: string;
        PlayerStatsTypeQuery: "topscorers" | "topassists" | "topyellowcards" | "topredcards";
        QQuery: string;
        SearchLimitQuery: number;
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
            /** @description Service is degraded (strict cache backend not ready) */
            503: {
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
    getCompetitionBracket: {
        parameters: {
            query: {
                season: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Competition bracket data */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CompetitionBracketResponse"];
                };
            };
            400: components["responses"]["ProblemResponse"];
        };
    };
    getCompetitionMatches: {
        parameters: {
            query: {
                cursor?: components["parameters"]["OptionalCursorQuery"];
                limit?: components["parameters"]["OptionalLimitQuery"];
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
    getFollowPlayerCards: {
        parameters: {
            query: {
                ids: components["parameters"]["IdsQuery"];
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
    searchFollowCompetitions: {
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
    getFollowTeamCards: {
        parameters: {
            query: {
                ids: components["parameters"]["IdsQuery"];
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
    getFollowCompetitionsTrends: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Top competitions list */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrendCompetitionsResponse"];
                };
            };
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
                cursor?: components["parameters"]["OptionalCursorQuery"];
                date: components["parameters"]["DateQuery"];
                limit?: components["parameters"]["OptionalLimitQuery"];
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
    getMatchAbsences: {
        parameters: {
            query?: {
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
            400: components["responses"]["ProblemResponse"];
        };
    };
    getMatchEvents: {
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
    getMatchHeadToHead: {
        parameters: {
            query?: {
                last?: components["parameters"]["OptionalLastQuery"];
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
            400: components["responses"]["ProblemResponse"];
        };
    };
    getMatchLineups: {
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
    getMatchPlayersStatsByTeam: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["IdPath"];
                teamId: components["parameters"]["TeamIdPath"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ListEnvelopeResponse"];
            400: components["responses"]["ProblemResponse"];
        };
    };
    getMatchPredictions: {
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
    getMatchStatistics: {
        parameters: {
            query?: {
                period?: components["parameters"]["OptionalStatisticsPeriodQuery"];
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
    eraseMobilePrivacyData: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MobilePrivacyEraseRequest"];
            };
        };
        responses: {
            /** @description Device-bound data erased */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MobilePrivacyEraseResponse"];
                };
            };
            400: components["responses"]["ProblemResponse"];
            401: components["responses"]["ProblemResponse"];
            403: components["responses"]["ProblemResponse"];
        };
    };
    attestMobileSession: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MobileSessionAttestRequest"];
            };
        };
        responses: {
            /** @description Session token issued */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MobileSessionAttestResponse"];
                };
            };
            400: components["responses"]["ProblemResponse"];
            401: components["responses"]["ProblemResponse"];
        };
    };
    createMobileSessionChallenge: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MobileSessionChallengeRequest"];
            };
        };
        responses: {
            /** @description Challenge created */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MobileSessionChallengeResponse"];
                };
            };
            400: components["responses"]["ProblemResponse"];
        };
    };
    refreshMobileSession: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MobileSessionRefreshRequest"];
            };
        };
        responses: {
            /** @description Session token refreshed */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MobileSessionAttestResponse"];
                };
            };
            400: components["responses"]["ProblemResponse"];
            401: components["responses"]["ProblemResponse"];
        };
    };
    revokeMobileSession: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MobileSessionRevokeRequest"];
            };
        };
        responses: {
            /** @description Session family revoked */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["ProblemResponse"];
        };
    };
    ingestNotificationEvent: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NotificationEventIngestRequest"];
            };
        };
        responses: {
            /** @description Event accepted and queued */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationEventIngestResponse"];
                };
            };
            400: components["responses"]["ProblemResponse"];
            401: components["responses"]["ProblemResponse"];
            404: components["responses"]["ProblemResponse"];
        };
    };
    getNotificationMetricsSnapshot: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Notifications metrics snapshot */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationMetricsSnapshot"];
                };
            };
        };
    };
    trackNotificationOpened: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NotificationOpenedRequest"];
            };
        };
        responses: {
            /** @description Open tracking accepted */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationOpenedResponse"];
                };
            };
            400: components["responses"]["ProblemResponse"];
            401: components["responses"]["ProblemResponse"];
            403: components["responses"]["ProblemResponse"];
        };
    };
    getNotificationSubscriptions: {
        parameters: {
            query: {
                deviceId: components["parameters"]["NotificationDeviceIdQuery"];
                scopeId: components["parameters"]["NotificationScopeIdQuery"];
                scopeKind: components["parameters"]["NotificationScopeKindQuery"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Scope subscriptions */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationSubscriptionsListResponse"];
                };
            };
            400: components["responses"]["ProblemResponse"];
            401: components["responses"]["ProblemResponse"];
            403: components["responses"]["ProblemResponse"];
        };
    };
    upsertNotificationSubscriptions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NotificationSubscriptionUpsertRequest"];
            };
        };
        responses: {
            /** @description Scope subscriptions upserted */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationSubscriptionUpsertResponse"];
                };
            };
            400: components["responses"]["ProblemResponse"];
            401: components["responses"]["ProblemResponse"];
            403: components["responses"]["ProblemResponse"];
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
    searchGlobal: {
        parameters: {
            query: {
                limit?: components["parameters"]["SearchLimitQuery"];
                q: components["parameters"]["QQuery"];
                season?: components["parameters"]["OptionalSeasonQuery"];
                timezone: components["parameters"]["TimezoneQuery"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["SearchGlobalResponse"];
            400: components["responses"]["ProblemResponse"];
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
    getTeamOverview: {
        parameters: {
            query: {
                historySeasons?: components["parameters"]["HistorySeasonsQuery"];
                leagueId: components["parameters"]["LeagueIdQuery"];
                season: components["parameters"]["SeasonQuery"];
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
            200: components["responses"]["TeamOverviewResponse"];
            400: components["responses"]["ProblemResponse"];
        };
    };
    getTeamPlayers: {
        parameters: {
            query: {
                cursor?: components["parameters"]["OptionalCursorQuery"];
                leagueId: components["parameters"]["LeagueIdQuery"];
                limit?: components["parameters"]["OptionalLimitQuery"];
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
    sendTelemetryBreadcrumbBatch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TelemetryBreadcrumbPayload"][];
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
    sendTelemetryErrorBatch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TelemetryErrorPayload"][];
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
    sendTelemetryEventBatch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TelemetryEventPayload"][];
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

