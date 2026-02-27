const API_KEY = process.env.API_FOOTBALL_KEY || "8921a4f04c6439ab0f62d85408ebc517";

async function main() {
    // Fetch recent match (e.g. from 2 days ago)
    const d = new Date();
    d.setDate(d.getDate() - 3);
    const dateStr = d.toISOString().split('T')[0];

    const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${dateStr}`, {
        headers: { 'x-apisports-key': API_KEY }
    });
    const data = await res.json();
    const match = data.response.find(f => f.fixture.status.short === 'FT' && f.teams.home.name);

    if (!match) { console.log("No finished match found"); return; }

    const lineupsRes = await fetch(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${match.fixture.id}`, {
        headers: { 'x-apisports-key': API_KEY }
    });
    const lineupsData = await lineupsRes.json();
    console.log(JSON.stringify(lineupsData.response, null, 2));
}

main().catch(console.error);
