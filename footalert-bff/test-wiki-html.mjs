async function getTrophies(teamName) {
    try {
        const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(teamName + " football club")}&utf8=&format=json`);
        const searchData = await searchRes.json();
        if (!searchData.query?.search?.length) return { response: [] };

        const pageTitle = searchData.query.search[0].title;

        // 1. Get sections
        const parseRes = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=sections&format=json`);
        const parseData = await parseRes.json();

        const honourSection = parseData.parse?.sections?.find(s =>
            s.line.toLowerCase().includes('honour') || s.line.toLowerCase().includes('trophies')
        );
        if (!honourSection) return { response: [] };

        // 2. Get section HTML or wikitext
        const contentRes = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&section=${honourSection.index}&prop=text&format=json`);
        const contentData = await contentRes.json();
        const html = contentData.parse?.text?.['*'];
        if (!html) return { response: [] };

        // Extremely basic regex scraping of the HTML tables
        // In a real robust scenario, we would use a DOM parser like cheerio or jsdom, 
        // but we can try to find simple patterns like <li>...</li> or <th>...</th><td>...</td>

        console.log(`--- HTML FOR ${pageTitle} ---`);
        console.log(html.substring(0, 1000));

    } catch (e) {
        console.error(e);
    }
}

getTrophies('Arsenal');
