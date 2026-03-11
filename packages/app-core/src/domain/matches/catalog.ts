import type {
  CompetitionCatalogEntry,
  CompetitionCatalogLeague,
  MatchCompetitionSection,
} from './types.js';

type CompetitionCatalogPayload = {
  league: {
    id: number;
    name: string;
    logo?: string | null;
  };
  country: {
    name: string;
  };
};

const hasCompetitionCatalogPayload = (
  item: CompetitionCatalogLeague | null | undefined,
): item is CompetitionCatalogPayload => {
  return (
    typeof item?.league?.id === 'number' &&
    typeof item.league.name === 'string' &&
    typeof item.country?.name === 'string'
  );
};

export const buildCompetitionCatalogMap = (
  catalog: Array<CompetitionCatalogLeague | null | undefined>,
): Map<string, CompetitionCatalogEntry> => {
  const map = new Map<string, CompetitionCatalogEntry>();

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

export const applyCompetitionCatalogToSections = (
  sections: MatchCompetitionSection[],
  catalogMap: Map<string, CompetitionCatalogEntry>,
): MatchCompetitionSection[] => {
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
