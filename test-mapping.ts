import fs from 'fs';
import { mapStandingsToTeamData } from './src/data/mappers/teamsMapper.ts';

const payloadJson = {
    "league": {
        "id": 61,
        "name": "Ligue 1",
        "country": "France",
        "logo": "https://media.api-sports.io/football/leagues/61.png",
        "flag": "https://media.api-sports.io/flags/fr.svg",
        "season": 2023,
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
                    "form": "WWLWL",
                    "status": "same"
                }
            ]
        ]
    }
};

try {
    const result = mapStandingsToTeamData(payloadJson as any, "85");
    console.log("Mapped Standings:", JSON.stringify(result, null, 2));
} catch (e) {
    console.error("Error mapping standings:", e);
}
