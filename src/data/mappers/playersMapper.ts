import type {
    PlayerApiDetailsDto,
    PlayerApiFixtureDto,
    PlayerApiMatchPerformanceDto,
    PlayerApiTrophyDto,
    PlayerCareerSeason,
    PlayerCareerTeam,
    PlayerCharacteristics,
    PlayerMatchPerformance,
    PlayerProfile,
    PlayerSeasonStats,
    PlayerTrophy,
} from '@ui/features/players/types/players.types';

export function mapPlayerDetailsToProfile(dto: PlayerApiDetailsDto): PlayerProfile | null {
    if (!dto.player || !dto.statistics || dto.statistics.length === 0) {
        return null;
    }

    const p = dto.player;
    const s = dto.statistics[0]; // First stat entry usually is the primary current season/league

    return {
        id: String(p.id ?? ''),
        name: p.name ?? '',
        photo: p.photo ?? '',
        position: s.games?.position ?? 'Inconnu',
        age: p.age ?? 0,
        height: p.height ?? '-',
        weight: p.weight ?? '-',
        nationality: p.nationality ?? '-',
        dateOfBirth: p.birth?.date ?? '-',
        number: s.games?.number ?? null,
        foot: 'Droit', // Not explicitly in API-Football v3 player profile by default, mocking
        team: {
            id: String(s.team?.id ?? ''),
            name: s.team?.name ?? '',
            logo: s.team?.logo ?? '',
        },
        league: {
            id: String(s.league?.id ?? ''),
            name: s.league?.name ?? '',
            logo: s.league?.logo ?? '',
            season: s.league?.season ?? 0,
        },
    };
}

export function mapPlayerDetailsToCharacteristics(dto: PlayerApiDetailsDto): PlayerCharacteristics {
    if (!dto.statistics || dto.statistics.length === 0) {
        return { touches: 0, dribbles: 0, chances: 0, defense: 0, duels: 0, attack: 0 };
    }
    const s = dto.statistics[0];

    const touches = (s.passes?.total ?? 0) + (s.dribbles?.attempts ?? 0);
    const dribbles = s.dribbles?.success ?? 0;
    const chances = s.passes?.key ?? 0;
    const defense = (s.tackles?.total ?? 0) + (s.tackles?.interceptions ?? 0);
    const duels = s.duels?.won ?? 0;
    const attack = (s.goals?.total ?? 0) + (s.shots?.on ?? 0);

    return { touches, dribbles, chances, defense, duels, attack };
}

export function mapPlayerDetailsToSeasonStats(dto: PlayerApiDetailsDto): PlayerSeasonStats {
    if (!dto.statistics || dto.statistics.length === 0) {
        return {
            matches: 0, starts: 0, minutes: 0, goals: 0, assists: 0, rating: '-',
            shots: 0, shotsOnTarget: 0, passes: 0, passesAccuracy: 0,
            tackles: 0, interceptions: 0, yellowCards: 0, redCards: 0,
        };
    }
    const s = dto.statistics[0];

    return {
        matches: s.games?.appearences ?? 0,
        starts: s.games?.lineups ?? 0,
        minutes: s.games?.minutes ?? 0,
        goals: s.goals?.total ?? 0,
        assists: s.goals?.assists ?? 0,
        rating: s.games?.rating ? Number(s.games.rating).toFixed(2) : '-',
        shots: s.shots?.total ?? 0,
        shotsOnTarget: s.shots?.on ?? 0,
        passes: s.passes?.total ?? 0,
        passesAccuracy: s.passes?.accuracy ?? 0,
        tackles: s.tackles?.total ?? 0,
        interceptions: s.tackles?.interceptions ?? 0,
        yellowCards: s.cards?.yellow ?? 0,
        redCards: s.cards?.red ?? 0,
    };
}

export function mapPlayerTrophies(dtos: PlayerApiTrophyDto[]): PlayerTrophy[] {
    const trophyCounts = new Map<string, number>();

    dtos.forEach(dto => {
        // Only count winners
        if (dto.place === 'Winner' && dto.league) {
            trophyCounts.set(dto.league, (trophyCounts.get(dto.league) || 0) + 1);
        }
    });

    return Array.from(trophyCounts.entries()).map(([name, count]) => ({
        name,
        count,
    })).sort((a, b) => b.count - a.count);
}

export function mapPlayerMatchPerformance(
    playerId: string,
    fixtureDto: PlayerApiFixtureDto,
    performanceDto: PlayerApiMatchPerformanceDto | null,
): PlayerMatchPerformance | null {
    if (!fixtureDto.fixture || !fixtureDto.teams) return null;

    let playerStats: PlayerMatchPerformance['playerStats'] = {
        minutes: 0, rating: '-', goals: 0, assists: 0, yellowCards: 0, redCards: 0, isStarter: false,
    };

    if (performanceDto?.players) {
        for (const teamTeam of performanceDto.players) {
            const matchPlayer = teamTeam.players?.find(p => String(p.player?.id) === playerId);
            if (matchPlayer && matchPlayer.statistics && matchPlayer.statistics.length > 0) {
                const s = matchPlayer.statistics[0];
                playerStats = {
                    minutes: s.games?.minutes ?? 0,
                    rating: s.games?.rating ? Number(s.games.rating).toFixed(1) : '-',
                    goals: s.goals?.total ?? 0,
                    assists: s.goals?.assists ?? 0,
                    yellowCards: s.cards?.yellow ?? 0,
                    redCards: s.cards?.red ?? 0,
                    isStarter: s.games?.substitute === false,
                };
                break;
            }
        }
    }

    return {
        fixtureId: String(fixtureDto.fixture.id),
        date: fixtureDto.fixture.date ?? '',
        competition: {
            id: String(fixtureDto.league?.id ?? ''),
            name: fixtureDto.league?.name ?? 'Unknown',
            logo: fixtureDto.league?.logo ?? '',
        },
        homeTeam: {
            id: String(fixtureDto.teams.home?.id ?? ''),
            name: fixtureDto.teams.home?.name ?? '',
            logo: fixtureDto.teams.home?.logo ?? '',
        },
        awayTeam: {
            id: String(fixtureDto.teams.away?.id ?? ''),
            name: fixtureDto.teams.away?.name ?? '',
            logo: fixtureDto.teams.away?.logo ?? '',
        },
        goalsHome: fixtureDto.goals?.home ?? null,
        goalsAway: fixtureDto.goals?.away ?? null,
        playerStats,
    };
}

export function mapPlayerCareerSeasons(dto: PlayerApiDetailsDto): PlayerCareerSeason[] {
    if (!dto.statistics) return [];

    return dto.statistics.map(s => ({
        season: s.league?.season ? String(s.league.season) : 'Unknown',
        team: {
            id: String(s.team?.id ?? ''),
            name: s.team?.name ?? '',
            logo: s.team?.logo ?? '',
        },
        matches: s.games?.appearences ?? 0,
        goals: s.goals?.total ?? 0,
        assists: s.goals?.assists ?? 0,
        rating: s.games?.rating ? Number(s.games.rating).toFixed(2) : '-',
    })).sort((a, b) => b.season.localeCompare(a.season));
}

export function mapPlayerCareerTeams(dto: PlayerApiDetailsDto): PlayerCareerTeam[] {
    if (!dto.statistics) return [];

    const teamMap = new Map<string, PlayerCareerTeam>();

    dto.statistics.forEach(s => {
        const teamId = String(s.team?.id ?? '');
        const seasonStr = s.league?.season ? String(s.league.season) : '';

        if (!teamMap.has(teamId)) {
            teamMap.set(teamId, {
                team: {
                    id: teamId,
                    name: s.team?.name ?? '',
                    logo: s.team?.logo ?? '',
                },
                period: seasonStr, // Will be updated
                matches: 0,
                goals: 0,
                assists: 0,
            });
        }

        const t = teamMap.get(teamId)!;
        t.matches += (s.games?.appearences ?? 0);
        t.goals += (s.goals?.total ?? 0);
        t.assists += (s.goals?.assists ?? 0);

        // Update period heuristically
        if (seasonStr && !t.period.includes(seasonStr)) {
            if (t.period === '') {
                t.period = seasonStr;
            } else {
                const years = t.period.split(' - ').map(Number).filter(n => !isNaN(n));
                const newYear = Number(seasonStr);
                if (!isNaN(newYear)) {
                    years.push(newYear);
                    const min = Math.min(...years);
                    const max = Math.max(...years);
                    t.period = min === max ? `${min}` : `${min} - ${max}`;
                }
            }
        }
    });

    return Array.from(teamMap.values());
}
