const API_KEY = process.env.API_FOOTBALL_KEY || "8921a4f04c6439ab0f62d85408ebc517";

async function main() {
    // try to find Benfica (228) and Real Madrid (541) in H2H
    console.log("Fetching a recent UCL match lineup (e.g. Aston Villa vs Juventus fixture 1213768)");
    const lineupsRes = await fetch(`https://v3.football.api-sports.io/fixtures/lineups?fixture=1213768`, {
        headers: { 'x-apisports-key': API_KEY }
    });
    const lineupsData = await lineupsRes.json();
    console.log(`Lineups array length: ${lineupsData.response?.length}`);
    if (lineupsData.response?.length > 0) {
        console.log(`Team 1: ${lineupsData.response[0].team.name}`);
        console.log(`Keys:`, Object.keys(lineupsData.response[0]));
        console.log(`First player in startXI:`, lineupsData.response[0].startXI?.length > 0 ? lineupsData.response[0].startXI[0] : 'empty');
    }
}
main().catch(console.error);
