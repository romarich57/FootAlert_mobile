export type FollowDiscoverySeedTeamItem = {
    teamId: string;
    teamName: string;
    teamLogo: string;
    country: string;
    activeFollowersCount: number;
    recentNet30d: number;
    totalFollowAdds: number;
};
export type FollowDiscoverySeedPlayerItem = {
    playerId: string;
    playerName: string;
    playerPhoto: string;
    position: string;
    teamName: string;
    teamLogo: string;
    leagueName: string;
    activeFollowersCount: number;
    recentNet30d: number;
    totalFollowAdds: number;
};
export declare const FOLLOW_DISCOVERY_SEED_TEAMS: FollowDiscoverySeedTeamItem[];
export declare const FOLLOW_DISCOVERY_SEED_PLAYERS: FollowDiscoverySeedPlayerItem[];
export declare function getFollowDiscoverySeeds(kind: 'team', limit: number): FollowDiscoverySeedTeamItem[];
export declare function getFollowDiscoverySeeds(kind: 'player', limit: number): FollowDiscoverySeedPlayerItem[];
//# sourceMappingURL=discoverySeeds.d.ts.map