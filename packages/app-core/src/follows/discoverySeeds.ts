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

const ZERO_COUNTS = {
  activeFollowersCount: 0,
  recentNet30d: 0,
  totalFollowAdds: 0,
} as const;

export const FOLLOW_DISCOVERY_SEED_TEAMS: FollowDiscoverySeedTeamItem[] = [
  {
    teamId: '529',
    teamName: 'Barcelona',
    teamLogo: 'https://media.api-sports.io/football/teams/529.png',
    country: 'Spain',
    ...ZERO_COUNTS,
  },
  {
    teamId: '541',
    teamName: 'Real Madrid',
    teamLogo: 'https://media.api-sports.io/football/teams/541.png',
    country: 'Spain',
    ...ZERO_COUNTS,
  },
  {
    teamId: '50',
    teamName: 'Manchester City',
    teamLogo: 'https://media.api-sports.io/football/teams/50.png',
    country: 'England',
    ...ZERO_COUNTS,
  },
  {
    teamId: '42',
    teamName: 'Arsenal',
    teamLogo: 'https://media.api-sports.io/football/teams/42.png',
    country: 'England',
    ...ZERO_COUNTS,
  },
  {
    teamId: '40',
    teamName: 'Liverpool',
    teamLogo: 'https://media.api-sports.io/football/teams/40.png',
    country: 'England',
    ...ZERO_COUNTS,
  },
  {
    teamId: '49',
    teamName: 'Chelsea',
    teamLogo: 'https://media.api-sports.io/football/teams/49.png',
    country: 'England',
    ...ZERO_COUNTS,
  },
  {
    teamId: '85',
    teamName: 'Paris Saint-Germain',
    teamLogo: 'https://media.api-sports.io/football/teams/85.png',
    country: 'France',
    ...ZERO_COUNTS,
  },
  {
    teamId: '157',
    teamName: 'Bayern Munich',
    teamLogo: 'https://media.api-sports.io/football/teams/157.png',
    country: 'Germany',
    ...ZERO_COUNTS,
  },
];

export const FOLLOW_DISCOVERY_SEED_PLAYERS: FollowDiscoverySeedPlayerItem[] = [
  {
    playerId: '278',
    playerName: 'Kylian Mbappe',
    playerPhoto: 'https://media.api-sports.io/football/players/278.png',
    position: 'Attacker',
    teamName: 'Real Madrid',
    teamLogo: 'https://media.api-sports.io/football/teams/541.png',
    leagueName: 'La Liga',
    ...ZERO_COUNTS,
  },
  {
    playerId: '154',
    playerName: 'Cristiano Ronaldo',
    playerPhoto: 'https://media.api-sports.io/football/players/154.png',
    position: 'Attacker',
    teamName: 'Al-Nassr',
    teamLogo: 'https://media.api-sports.io/football/teams/541.png',
    leagueName: 'Saudi Pro League',
    ...ZERO_COUNTS,
  },
  {
    playerId: '10',
    playerName: 'Lionel Messi',
    playerPhoto: 'https://media.api-sports.io/football/players/10.png',
    position: 'Attacker',
    teamName: 'Inter Miami',
    teamLogo: 'https://media.api-sports.io/football/teams/9568.png',
    leagueName: 'MLS',
    ...ZERO_COUNTS,
  },
  {
    playerId: '111',
    playerName: 'Marquinhos',
    playerPhoto: 'https://media.api-sports.io/football/players/111.png',
    position: 'Defender',
    teamName: 'Paris Saint-Germain',
    teamLogo: 'https://media.api-sports.io/football/teams/85.png',
    leagueName: 'Ligue 1',
    ...ZERO_COUNTS,
  },
  {
    playerId: '2032',
    playerName: 'J. Strand Larsen',
    playerPhoto: 'https://media.api-sports.io/football/players/2032.png',
    position: 'Attacker',
    teamName: 'Celta Vigo',
    teamLogo: 'https://media.api-sports.io/football/teams/538.png',
    leagueName: 'La Liga',
    ...ZERO_COUNTS,
  },
  {
    playerId: '7',
    playerName: 'Jules Kounde',
    playerPhoto: 'https://media.api-sports.io/football/players/7.png',
    position: 'Defender',
    teamName: 'Barcelona',
    teamLogo: 'https://media.api-sports.io/football/teams/529.png',
    leagueName: 'La Liga',
    ...ZERO_COUNTS,
  },
  {
    playerId: '874',
    playerName: 'Vinicius Junior',
    playerPhoto: 'https://media.api-sports.io/football/players/874.png',
    position: 'Attacker',
    teamName: 'Real Madrid',
    teamLogo: 'https://media.api-sports.io/football/teams/541.png',
    leagueName: 'La Liga',
    ...ZERO_COUNTS,
  },
  {
    playerId: '1100',
    playerName: 'Jude Bellingham',
    playerPhoto: 'https://media.api-sports.io/football/players/1100.png',
    position: 'Midfielder',
    teamName: 'Real Madrid',
    teamLogo: 'https://media.api-sports.io/football/teams/541.png',
    leagueName: 'La Liga',
    ...ZERO_COUNTS,
  },
];

export function getFollowDiscoverySeeds(
  kind: 'team',
  limit: number,
): FollowDiscoverySeedTeamItem[];
export function getFollowDiscoverySeeds(
  kind: 'player',
  limit: number,
): FollowDiscoverySeedPlayerItem[];
export function getFollowDiscoverySeeds(
  kind: 'team' | 'player',
  limit: number,
): FollowDiscoverySeedTeamItem[] | FollowDiscoverySeedPlayerItem[] {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : 0;
  if (kind === 'team') {
    return FOLLOW_DISCOVERY_SEED_TEAMS.slice(0, safeLimit);
  }

  return FOLLOW_DISCOVERY_SEED_PLAYERS.slice(0, safeLimit);
}
