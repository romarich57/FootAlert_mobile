const ZERO_COUNTS = {
    activeFollowersCount: 0,
    recentNet30d: 0,
    totalFollowAdds: 0,
};
export const FOLLOW_DISCOVERY_PLAYER_ID_CORRECTIONS = Object.freeze({
    '154': '50048', // Cristiano Ronaldo -> V. Muriqi
    '10': '386828', // Lionel Messi -> Lamine Yamal
    '111': '931', // Marquinhos -> Ferran Torres
    '7': '46746', // Jules Kounde -> A. Budimir
    '874': '521', // Vinicius Junior -> R. Lewandowski
    '1100': '47348', // Jude Bellingham -> Borja Iglesias
});
export function normalizeFollowDiscoveryPlayerId(playerId) {
    const initialPlayerId = String(playerId).trim();
    if (!initialPlayerId) {
        return '';
    }
    let currentPlayerId = initialPlayerId;
    const seen = new Set();
    while (!seen.has(currentPlayerId)) {
        seen.add(currentPlayerId);
        const nextPlayerId = FOLLOW_DISCOVERY_PLAYER_ID_CORRECTIONS[currentPlayerId];
        if (!nextPlayerId || nextPlayerId === currentPlayerId) {
            break;
        }
        currentPlayerId = String(nextPlayerId).trim();
        if (!currentPlayerId) {
            return '';
        }
    }
    return currentPlayerId;
}
export function buildApiSportsPlayerPhoto(playerId) {
    const normalizedPlayerId = normalizeFollowDiscoveryPlayerId(playerId);
    return normalizedPlayerId
        ? `https://media.api-sports.io/football/players/${normalizedPlayerId}.png`
        : '';
}
export const FOLLOW_DISCOVERY_SEED_TEAMS = [
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
const RAW_FOLLOW_DISCOVERY_SEED_PLAYERS = [
    {
        playerId: '278',
        playerName: 'Kylian Mbappe',
        position: 'Attacker',
        teamName: 'Real Madrid',
        teamLogo: 'https://media.api-sports.io/football/teams/541.png',
        leagueName: 'La Liga',
        ...ZERO_COUNTS,
    },
    {
        playerId: '50048',
        playerName: 'V. Muriqi',
        position: 'Attacker',
        teamName: 'Mallorca',
        teamLogo: 'https://media.api-sports.io/football/teams/798.png',
        leagueName: 'La Liga',
        ...ZERO_COUNTS,
    },
    {
        playerId: '386828',
        playerName: 'Lamine Yamal',
        position: 'Midfielder',
        teamName: 'Barcelona',
        teamLogo: 'https://media.api-sports.io/football/teams/529.png',
        leagueName: 'La Liga',
        ...ZERO_COUNTS,
    },
    {
        playerId: '931',
        playerName: 'Ferran Torres',
        position: 'Attacker',
        teamName: 'Barcelona',
        teamLogo: 'https://media.api-sports.io/football/teams/529.png',
        leagueName: 'La Liga',
        ...ZERO_COUNTS,
    },
    {
        playerId: '2032',
        playerName: 'J. Strand Larsen',
        position: 'Attacker',
        teamName: 'Celta Vigo',
        teamLogo: 'https://media.api-sports.io/football/teams/538.png',
        leagueName: 'La Liga',
        ...ZERO_COUNTS,
    },
    {
        playerId: '46746',
        playerName: 'A. Budimir',
        position: 'Attacker',
        teamName: 'Osasuna',
        teamLogo: 'https://media.api-sports.io/football/teams/727.png',
        leagueName: 'La Liga',
        ...ZERO_COUNTS,
    },
    {
        playerId: '521',
        playerName: 'R. Lewandowski',
        position: 'Attacker',
        teamName: 'Barcelona',
        teamLogo: 'https://media.api-sports.io/football/teams/529.png',
        leagueName: 'La Liga',
        ...ZERO_COUNTS,
    },
    {
        playerId: '1100',
        playerName: 'E. Haaland',
        position: 'Attacker',
        teamName: 'Manchester City',
        teamLogo: 'https://media.api-sports.io/football/teams/33.png',
        leagueName: 'Premier League',
        ...ZERO_COUNTS,
    },
];
export const FOLLOW_DISCOVERY_SEED_PLAYERS = RAW_FOLLOW_DISCOVERY_SEED_PLAYERS.map(item => {
    const normalizedPlayerId = normalizeFollowDiscoveryPlayerId(item.playerId);
    return {
        ...item,
        playerId: normalizedPlayerId,
        playerPhoto: buildApiSportsPlayerPhoto(normalizedPlayerId),
    };
});
export function getFollowDiscoverySeeds(kind, limit) {
    const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : 0;
    if (kind === 'team') {
        return FOLLOW_DISCOVERY_SEED_TEAMS.slice(0, safeLimit);
    }
    return FOLLOW_DISCOVERY_SEED_PLAYERS.slice(0, safeLimit);
}
