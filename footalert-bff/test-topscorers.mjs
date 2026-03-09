import process from 'process';

async function main() {
  const url = `${process.env.API_FOOTBALL_BASE_URL}/players/topscorers?league=140&season=2024`;
  console.log('Fetching', url);
  const res = await fetch(url, {
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY }
  });
  console.log(res.status);
  const data = await res.json();
  console.log(JSON.stringify(data).substring(0, 500));
}

main();
