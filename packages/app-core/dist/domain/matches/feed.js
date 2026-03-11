import { applyCompetitionCatalogToSections, buildCompetitionCatalogMap, } from './catalog.js';
export const filterSectionsByStatus = (sections, filter) => {
    if (filter === 'all') {
        return sections;
    }
    return sections
        .map(section => ({
        ...section,
        matches: section.matches.filter(match => match.status === filter),
    }))
        .filter(section => section.matches.length > 0);
};
export const sortMatchesByKickoff = (matches) => {
    return [...matches].sort((firstMatch, secondMatch) => new Date(firstMatch.startDate).getTime() - new Date(secondMatch.startDate).getTime());
};
export const buildFollowsSection = (sections, followedTeamIds, followedMatchIds, label) => {
    if (followedTeamIds.length === 0 && followedMatchIds.length === 0) {
        return {
            id: 'follows',
            name: label,
            logo: '',
            country: '',
            isFollowSection: true,
            matches: [],
        };
    }
    const followedTeamIdSet = new Set(followedTeamIds);
    const followedMatchIdSet = new Set(followedMatchIds);
    const allMatches = sections.flatMap(section => section.matches);
    const starredMatches = sortMatchesByKickoff(allMatches.filter(match => followedMatchIdSet.has(match.fixtureId)));
    const teamMatches = sortMatchesByKickoff(allMatches.filter(match => !followedMatchIdSet.has(match.fixtureId) &&
        (followedTeamIdSet.has(match.homeTeamId) || followedTeamIdSet.has(match.awayTeamId))));
    return {
        id: 'follows',
        name: label,
        logo: '',
        country: '',
        isFollowSection: true,
        matches: [...starredMatches, ...teamMatches],
    };
};
export const buildFeedItems = (sections) => {
    const nonFollowSectionsCount = sections.filter(section => !section.isFollowSection).length;
    let hasInsertedAd = false;
    const sectionOccurrences = new Map();
    return sections.flatMap(section => {
        const baseKey = `section-${section.id}-${section.name}`;
        const occurrence = (sectionOccurrences.get(baseKey) ?? 0) + 1;
        sectionOccurrences.set(baseKey, occurrence);
        const sectionItem = {
            type: 'section',
            key: occurrence === 1 ? baseKey : `${baseKey}-${occurrence}`,
            section,
        };
        const shouldInsertAd = !hasInsertedAd && !section.isFollowSection && nonFollowSectionsCount > 1;
        if (!shouldInsertAd) {
            return [sectionItem];
        }
        hasInsertedAd = true;
        return [sectionItem, { type: 'ad', key: 'partner-ad-slot' }];
    });
};
export const composeMatchesFeed = (input) => {
    const competitionCatalogMap = buildCompetitionCatalogMap(input.catalog);
    const normalizedSections = applyCompetitionCatalogToSections(input.baseSections, competitionCatalogMap);
    const filteredSections = filterSectionsByStatus(normalizedSections, input.statusFilter);
    const followsSection = buildFollowsSection(filteredSections, input.followedTeamIds, input.followedMatchIds, input.followsSectionLabel);
    const visibleCompetitionSections = filteredSections.filter(section => !input.hiddenCompetitionIds.includes(section.id));
    const sectionsForFeed = input.followedOnly
        ? [followsSection]
        : [followsSection, ...visibleCompetitionSections];
    return {
        competitionCatalogMap,
        normalizedSections,
        filteredSections,
        followsSection,
        sectionsForFeed,
        feedItems: buildFeedItems(sectionsForFeed),
    };
};
