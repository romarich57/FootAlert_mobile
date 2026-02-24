// This script simulates the EXACT logic in the BFF teams.ts trophies route
// to verify the Wikipedia fallback works correctly.

async function simulateTrophiesEndpoint(teamId) {
    console.log(`\n--- Simulating /v1/teams/${teamId}/trophies ---`);

    // Step 1: Try API-Football /trophies?team={id}
    console.log(`1. API-Football /trophies?team=${teamId}...`);
    const apiRes = await fetch(`https://v3.football.api-sports.io/trophies?team=${teamId}`, {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY || 'c4cf6a1f7b8c1f4f012c9b091fb964ee' }
    });
    const apiData = await apiRes.json();
    console.log(`   response.length = ${apiData.response?.length ?? 0}`);
    console.log(`   errors = ${JSON.stringify(apiData.errors)}`);

    if ((apiData.response?.length ?? 0) > 0) {
        console.log('   → Would return API data');
        return;
    }

    // Step 2: Look up team name
    console.log(`2. Looking up team name for id=${teamId}...`);
    const teamRes = await fetch(`https://v3.football.api-sports.io/teams?id=${teamId}`, {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY || 'c4cf6a1f7b8c1f4f012c9b091fb964ee' }
    });
    const teamData = await teamRes.json();
    const teamName = teamData.response?.[0]?.team?.name?.trim();
    const teamCountry = teamData.response?.[0]?.team?.country;
    console.log(`   teamName = "${teamName}", country = "${teamCountry}"`);

    if (!teamName) {
        console.log('   → No team name found, would return empty');
        return;
    }

    // Step 3: Try API-Football /trophies?team={name}
    console.log(`3. API-Football /trophies?team=${teamName}...`);
    const nameRes = await fetch(`https://v3.football.api-sports.io/trophies?team=${encodeURIComponent(teamName)}`, {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY || 'c4cf6a1f7b8c1f4f012c9b091fb964ee' }
    });
    const nameData = await nameRes.json();
    console.log(`   response.length = ${nameData.response?.length ?? 0}`);

    if ((nameData.response?.length ?? 0) > 0) {
        console.log('   → Would return name-based API data');
        return;
    }

    // Step 4: Wikipedia fallback
    console.log(`4. Wikipedia fallback for "${teamName}"...`);
    try {
        const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(teamName + " football club")}&utf8=&format=json`);
        const searchData = await searchRes.json();

        if (!searchData.query?.search?.length) {
            console.log('   → No Wikipedia search results');
            return;
        }

        const pageTitle = searchData.query.search[0].title;
        console.log(`   Found page: "${pageTitle}"`);

        const parseRes = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=sections&format=json`);
        const parseData = await parseRes.json();

        const honourSection = parseData.parse?.sections?.find(s =>
            s.line.toLowerCase().includes('honour') || s.line.toLowerCase().includes('trophies') || s.line.toLowerCase().includes('palmares')
        );

        if (!honourSection) {
            console.log('   → No Honours section found');
            return;
        }

        console.log(`   Found Honours section: index=${honourSection.index}`);

        const contentRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvsection=${honourSection.index}&titles=${encodeURIComponent(pageTitle)}&format=json`);
        const contentData = await contentRes.json();

        const pages = contentData.query?.pages;
        const pageId = pages && Object.keys(pages)[0];
        const wikitext = pageId ? pages[pageId]?.revisions?.[0]?.['*'] : null;

        if (!wikitext) {
            console.log('   → No wikitext content found');
            return;
        }

        const trophies = [];
        const lines = wikitext.split('\n');
        let currentComp = null;
        let currentCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('! scope="row"')) {
                const linkMatch = line.match(/\[\[([^\]]+)\]\]/);
                if (linkMatch) {
                    currentComp = linkMatch[1].split('|').pop();
                    currentCount = 0;
                    continue;
                }
            }

            if (currentComp && line.startsWith('|')) {
                const countMatch = line.match(/\|\s*(?:.*\|)?\s*'*\s*(\d+)\s*'*/);
                if (countMatch && !currentCount) {
                    currentCount = parseInt(countMatch[1], 10);
                    continue;
                }

                if (currentCount > 0 && line.length > 20) {
                    let cleanSeasons = line.replace(/\[\[([^\]]+)\]\]/g, (m, p1) => p1.split('|').pop() || '')
                        .replace(/\{\{[^}]+\}\}/g, '')
                        .replace(/\|\s*align="left"\s*\|/g, '')
                        .replace(/<[^>]+>/g, '')
                        .replace(/\|style="[^"]+"|/g, '')
                        .replace(/\|/g, '')
                        .trim();

                    if (cleanSeasons) {
                        const seasonsArr = cleanSeasons.split(/[,•]/).map(s => s.trim()).filter(Boolean);

                        seasonsArr.forEach(season => {
                            trophies.push({
                                league: currentComp,
                                country: teamCountry ?? 'Unknown',
                                season: season,
                                place: 'Winner'
                            });
                        });
                        currentComp = null;
                        currentCount = 0;
                    }
                }
            }
        }

        console.log(`   ✅ Extracted ${trophies.length} trophies from Wikipedia!`);

        if (trophies.length > 0) {
            console.log(`   First 3: ${JSON.stringify(trophies.slice(0, 3), null, 2)}`);
            console.log(`\n   → BFF would return { response: [...${trophies.length} items...] }`);
        }
    } catch (err) {
        console.log(`   ❌ Wikipedia fallback failed: ${err.message}`);
    }
}

simulateTrophiesEndpoint('42');  // Arsenal
