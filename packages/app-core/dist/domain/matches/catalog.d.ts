import type { CompetitionCatalogEntry, CompetitionCatalogLeague, MatchCompetitionSection } from './types.js';
export declare const buildCompetitionCatalogMap: (catalog: Array<CompetitionCatalogLeague | null | undefined>) => Map<string, CompetitionCatalogEntry>;
export declare const applyCompetitionCatalogToSections: (sections: MatchCompetitionSection[], catalogMap: Map<string, CompetitionCatalogEntry>) => MatchCompetitionSection[];
//# sourceMappingURL=catalog.d.ts.map