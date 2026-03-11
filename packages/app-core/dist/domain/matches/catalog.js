const hasCompetitionCatalogPayload = (item) => {
    return (typeof item?.league?.id === 'number' &&
        typeof item.league.name === 'string' &&
        typeof item.country?.name === 'string');
};
export const buildCompetitionCatalogMap = (catalog) => {
    const map = new Map();
    catalog.forEach(item => {
        if (!hasCompetitionCatalogPayload(item)) {
            return;
        }
        map.set(String(item.league.id), {
            name: item.league.name,
            country: item.country.name,
            logo: typeof item.league.logo === 'string' ? item.league.logo : '',
        });
    });
    return map;
};
export const applyCompetitionCatalogToSections = (sections, catalogMap) => {
    return sections.map(section => {
        if (section.isFollowSection) {
            return section;
        }
        const catalogEntry = catalogMap.get(section.id);
        if (!catalogEntry) {
            return section;
        }
        return {
            ...section,
            name: catalogEntry.name,
            country: catalogEntry.country,
            logo: catalogEntry.logo || section.logo,
            matches: section.matches.map(match => ({
                ...match,
                competitionName: catalogEntry.name,
                competitionCountry: catalogEntry.country,
                competitionLogo: catalogEntry.logo || match.competitionLogo,
            })),
        };
    });
};
