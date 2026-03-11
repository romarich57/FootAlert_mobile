import type { ComposeMatchesFeedInput, ComposeMatchesFeedResult, MatchCompetitionSection, MatchFeedMatch, MatchStatusFilter, MatchesFeedItem } from './types.js';
export declare const filterSectionsByStatus: (sections: MatchCompetitionSection[], filter: MatchStatusFilter) => MatchCompetitionSection[];
export declare const sortMatchesByKickoff: (matches: MatchFeedMatch[]) => MatchFeedMatch[];
export declare const buildFollowsSection: (sections: MatchCompetitionSection[], followedTeamIds: string[], followedMatchIds: string[], label: string) => MatchCompetitionSection;
export declare const buildFeedItems: (sections: MatchCompetitionSection[]) => MatchesFeedItem[];
export declare const composeMatchesFeed: (input: ComposeMatchesFeedInput) => ComposeMatchesFeedResult;
//# sourceMappingURL=feed.d.ts.map