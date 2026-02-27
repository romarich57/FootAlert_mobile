import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_API_FOOTBALL_KEY || process.env.API_FOOTBALL_KEY;
console.log('API Key available:', !!API_KEY);

async function testApi() {
    const headers = {
        'x-apisports-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
    };

    try {
        const trophiesTeamRes = await fetch('https://v3.football.api-sports.io/trophies?team=85', { headers });
        const trophiesTeamData = await trophiesTeamRes.json();
        console.log('Trophies team 85:', JSON.stringify(trophiesTeamData, null, 2).slice(0, 500));

        // For standings, let's check PSG (team 85) in Ligue 1 (league 61) season 2023
        const standingsRes = await fetch('https://v3.football.api-sports.io/standings?league=61&season=2023', { headers });
        const standingsData = await standingsRes.json();
        console.log('Standings:', JSON.stringify(standingsData, null, 2).slice(0, 1000));

    } catch (err) {
        console.error(err);
    }
}

testApi();
