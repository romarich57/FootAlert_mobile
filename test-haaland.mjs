import 'dotenv/config';

async function main() {
  const url = 'https://v3.football.api-sports.io/players?search=Haaland';
  const res = await fetch(url, {
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY }
  });
  const data = await res.json();
  const haaland = data.response.find(r => r.player.name.includes("Haaland"));
  console.log(JSON.stringify(haaland, null, 2));
}
main();
