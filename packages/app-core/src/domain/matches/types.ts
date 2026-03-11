export type MatchStatus = 'live' | 'upcoming' | 'finished';

export type MatchStatusFilter = 'all' | MatchStatus;

export type MatchFeedMatch = {
  fixtureId: string;
  competitionId: string;
  competitionName: string;
  competitionLogo: string;
  competitionCountry: string;
  startDate: string;
  minute: number | null;
  venue: string;
  status: MatchStatus;
  statusLabel: string;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamLogo: string;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamLogo: string;
  homeGoals: number | null;
  awayGoals: number | null;
  hasBroadcast: boolean;
};

export type MatchCompetitionSection = {
  id: string;
  name: string;
  logo: string;
  country: string;
  isFollowSection?: boolean;
  isTopCompetition?: boolean;
  matches: MatchFeedMatch[];
  weight?: number;
};

export type CompetitionCatalogLeague = {
  league?: {
    id?: number | null;
    name?: string | null;
    logo?: string | null;
  } | null;
  country?: {
    name?: string | null;
  } | null;
};

export type CompetitionCatalogEntry = {
  name: string;
  country: string;
  logo: string;
};

export type MatchesFeedItem =
  | {
    type: 'section';
    key: string;
    section: MatchCompetitionSection;
  }
  | {
    type: 'ad';
    key: string;
  };

export type ComposeMatchesFeedInput = {
  baseSections: MatchCompetitionSection[];
  catalog: Array<CompetitionCatalogLeague | null | undefined>;
  statusFilter: MatchStatusFilter;
  followedTeamIds: string[];
  followedMatchIds: string[];
  followsSectionLabel: string;
  hiddenCompetitionIds: string[];
  followedOnly: boolean;
};

export type ComposeMatchesFeedResult = {
  competitionCatalogMap: Map<string, CompetitionCatalogEntry>;
  normalizedSections: MatchCompetitionSection[];
  filteredSections: MatchCompetitionSection[];
  followsSection: MatchCompetitionSection;
  sectionsForFeed: MatchCompetitionSection[];
  feedItems: MatchesFeedItem[];
};
