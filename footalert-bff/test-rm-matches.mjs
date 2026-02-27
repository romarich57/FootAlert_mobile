const API_KEY = process.env.API_FOOTBALL_KEY || "8921a4f04c6439ab0f62d85408ebc517";

async function main() {
    const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=2026-02-25`, {
        headers: { 'x-apisports-key': API_KEY }
    });
    const data = await res.json();
    const match = data.response?.find(f => f.fixture.status.short === 'FT');

    if (!match) { console.log("No match found"); return; }

    console.log("Match:", match.fixture.id, match.teams.home.name);

    const lineupsRes = await fetch(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${match.fixture.id}`, {
        headers: { 'x-apisports-key': API_KEY }
    });
    const lineupsData = await lineupsRes.json();
    console.log(JSON.stringify(lineupsData.response?.[0], null, 2));
}

main().catch(console.error);
