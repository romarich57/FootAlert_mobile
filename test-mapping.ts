import { mapStandingsToTeamData } from './src/data/mappers/teamsMapper';
import type { TeamApiStandingsDto } from './src/ui/features/teams/types/teams.types';

const payloadJson: TeamApiStandingsDto = {
    "league": {
        "standings": [
            [
                {
                    "rank": 1,
                    "team": {
                        "id": 85,
                        "name": "Paris Saint Germain",
                        "logo": "https://media.api-sports.io/football/teams/85.png"
                    },
                    "points": 76,
                    "goalsDiff": 48,
                    "group": "Ligue 1",
                    "form": "WWLWL"
                }
            ]
        ]
    }
};

try {
    const result = mapStandingsToTeamData(payloadJson, "85");
    console.log("Mapped Standings:", JSON.stringify(result, null, 2));
} catch (e) {
    console.error("Error mapping standings:", e);
}
