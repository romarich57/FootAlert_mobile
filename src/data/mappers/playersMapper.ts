import type {
    PlayerApiCareerSeasonAggregateDto,
    PlayerApiCareerTeamAggregateDto,
    PlayerApiDetailsDto,
    PlayerApiFixtureDto,
    PlayerApiMatchPerformanceAggregateDto,
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

type PlayerApiStat = NonNullable<PlayerApiDetailsDto['statistics']>[number];
type PlayerApiMatchStat = NonNullable<
    NonNullable<
        NonNullable<PlayerApiMatchPerformanceDto['players']>[number]['players']
    >[number]['statistics']
>[number];

export function normalizeString(value: string | undefined | null): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function normalizeNumber(value: number | undefined | null): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function normalizeRating(
    value: string | number | undefined | null,
    precision = 1,
): string | null {
    if (value === undefined || value === null) {
        return null;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) {
        return null;
    }

    return parsed.toFixed(precision);
}

function toId(value: number | string | null | undefined): string | null {
    if (value === undefined || value === null) {
        return null;
    }

    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}

export function mapPlayerCareerSeasonAggregate(
    dto: PlayerApiCareerSeasonAggregateDto,
): PlayerCareerSeason {
    return {
        season: normalizeString(dto.season),
        team: {
            id: toId(dto.team?.id),
            name: normalizeString(dto.team?.name),
            logo: normalizeString(dto.team?.logo),
        },
        matches: normalizeNumber(dto.matches),
        goals: normalizeNumber(dto.goals),
        assists: normalizeNumber(dto.assists),
        rating: normalizeRating(dto.rating, 2),
    };
}

export function mapPlayerCareerTeamAggregate(dto: PlayerApiCareerTeamAggregateDto): PlayerCareerTeam {
    return {
        team: {
            id: toId(dto.team?.id),
            name: normalizeString(dto.team?.name),
            logo: normalizeString(dto.team?.logo),
        },
        period: normalizeString(dto.period),
        matches: normalizeNumber(dto.matches),
        goals: normalizeNumber(dto.goals),
        assists: normalizeNumber(dto.assists),
    };
}

export function mapPlayerMatchPerformanceAggregate(
    dto: PlayerApiMatchPerformanceAggregateDto,
): PlayerMatchPerformance | null {
    const fixtureId = toId(dto.fixtureId);
    if (!fixtureId) {
        return null;
    }

    return {
        fixtureId,
        date: normalizeString(dto.date),
        competition: {
            id: toId(dto.competition?.id),
            name: normalizeString(dto.competition?.name),
            logo: normalizeString(dto.competition?.logo),
        },
        homeTeam: {
            id: toId(dto.homeTeam?.id),
            name: normalizeString(dto.homeTeam?.name),
            logo: normalizeString(dto.homeTeam?.logo),
        },
        awayTeam: {
            id: toId(dto.awayTeam?.id),
            name: normalizeString(dto.awayTeam?.name),
            logo: normalizeString(dto.awayTeam?.logo),
        },
        goalsHome: normalizeNumber(dto.goalsHome),
        goalsAway: normalizeNumber(dto.goalsAway),
        playerStats: {
            minutes: normalizeNumber(dto.playerStats?.minutes),
            rating: normalizeRating(dto.playerStats?.rating, 1),
            goals: normalizeNumber(dto.playerStats?.goals),
            assists: normalizeNumber(dto.playerStats?.assists),
            yellowCards: normalizeNumber(dto.playerStats?.yellowCards),
            redCards: normalizeNumber(dto.playerStats?.redCards),
            isStarter:
                typeof dto.playerStats?.isStarter === 'boolean'
                    ? dto.playerStats.isStarter
                    : null,
        },
    };
}

function resolvePrimaryStatistic(
    statistics: PlayerApiDetailsDto['statistics'],
    season?: number,
): PlayerApiStat | null {
    if (!statistics || statistics.length === 0) {
        return null;
    }

    const seasonScoped = typeof season === 'number'
        ? statistics.filter(item => item.league?.season === season)
        : statistics;
    const candidates = seasonScoped.length > 0 ? seasonScoped : statistics;

    return [...candidates].sort((a, b) => {
        const aMinutes = a.games?.minutes ?? 0;
        const bMinutes = b.games?.minutes ?? 0;
        if (bMinutes !== aMinutes) {
            return bMinutes - aMinutes;
        }

        const aAppearances = a.games?.appearences ?? 0;
        const bAppearances = b.games?.appearences ?? 0;
        if (bAppearances !== aAppearances) {
            return bAppearances - aAppearances;
        }

        return (b.goals?.total ?? 0) - (a.goals?.total ?? 0);
    })[0] ?? null;
}

function resolveSeasonStatistics(
    statistics: PlayerApiDetailsDto['statistics'],
    season?: number,
): PlayerApiStat[] {
    if (!statistics || statistics.length === 0) {
        return [];
    }

    const seasonScoped = typeof season === 'number'
        ? statistics.filter(item => item.league?.season === season)
        : statistics;

    return seasonScoped.length > 0 ? seasonScoped : statistics;
}

function toFiniteNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function sumOrNull(a: number | null, b: number | null): number | null {
    if (a === null && b === null) {
        return null;
    }

    return (a ?? 0) + (b ?? 0);
}

export function mapPlayerDetailsToProfile(
    dto: PlayerApiDetailsDto,
    season?: number,
): PlayerProfile | null {
    if (!dto.player) {
        return null;
    }

    const p = dto.player;
    const s = resolvePrimaryStatistic(dto.statistics, season);

    return {
        id: toId(p.id),
        name: normalizeString(p.name),
        photo: normalizeString(p.photo),
        position: normalizeString(s?.games?.position),
        age: normalizeNumber(p.age),
        height: normalizeString(p.height),
        weight: normalizeString(p.weight),
        nationality: normalizeString(p.nationality),
        dateOfBirth: normalizeString(p.birth?.date),
        number: s?.games?.number ?? null,
        foot: null,
        transferValue: null,
        team: {
            id: toId(s?.team?.id),
            name: normalizeString(s?.team?.name),
            logo: normalizeString(s?.team?.logo),
        },
        league: {
            id: toId(s?.league?.id),
            name: normalizeString(s?.league?.name),
            logo: normalizeString(s?.league?.logo),
            season: normalizeNumber(s?.league?.season),
        },
    };
}

export function mapPlayerDetailsToCharacteristics(
    dto: PlayerApiDetailsDto,
    season?: number,
): PlayerCharacteristics {
    const s = resolvePrimaryStatistic(dto.statistics, season);
    if (!s) {
        return {
            touches: null,
            dribbles: null,
            chances: null,
            defense: null,
            duels: null,
            attack: null,
        };
    }

    const touches = sumOrNull(
        normalizeNumber(s.passes?.total),
        normalizeNumber(s.dribbles?.attempts),
    );
    const dribbles = normalizeNumber(s.dribbles?.success);
    const chances = normalizeNumber(s.passes?.key);
    const defense = sumOrNull(
        normalizeNumber(s.tackles?.total),
        normalizeNumber(s.tackles?.interceptions),
    );
    const duels = normalizeNumber(s.duels?.won);
    const attack = sumOrNull(
        normalizeNumber(s.goals?.total),
        normalizeNumber(s.shots?.on),
    );

    return { touches, dribbles, chances, defense, duels, attack };
}

export function mapPlayerDetailsToSeasonStats(
    dto: PlayerApiDetailsDto,
    season?: number,
): PlayerSeasonStats {
    const stats = resolveSeasonStatistics(dto.statistics, season);
    if (stats.length === 0) {
        return {
            matches: null, starts: null, minutes: null, goals: null, assists: null, rating: null,
            shots: null, shotsOnTarget: null, passes: null, passesAccuracy: null,
            tackles: null, interceptions: null, yellowCards: null, redCards: null,
        };
    }

    let matches: number | null = null;
    let starts: number | null = null;
    let minutes: number | null = null;
    let goals: number | null = null;
    let assists: number | null = null;
    let shots: number | null = null;
    let shotsOnTarget: number | null = null;
    let passes: number | null = null;
    let tackles: number | null = null;
    let interceptions: number | null = null;
    let yellowCards: number | null = null;
    let redCards: number | null = null;

    let ratingWeightedSum = 0;
    let ratingWeight = 0;

    let passesAccuracyWeightedSum = 0;
    let passesAccuracyWeight = 0;

    stats.forEach(stat => {
        const appearances = normalizeNumber(stat.games?.appearences);
        const lineups = normalizeNumber(stat.games?.lineups);
        const playedMinutes = normalizeNumber(stat.games?.minutes);
        const goalsValue = normalizeNumber(stat.goals?.total);
        const assistsValue = normalizeNumber(stat.goals?.assists);
        const shotsValue = normalizeNumber(stat.shots?.total);
        const shotsOnTargetValue = normalizeNumber(stat.shots?.on);
        const passesValue = normalizeNumber(stat.passes?.total);
        const tacklesValue = normalizeNumber(stat.tackles?.total);
        const interceptionsValue = normalizeNumber(stat.tackles?.interceptions);
        const yellowCardsValue = normalizeNumber(stat.cards?.yellow);
        const redCardsValue = normalizeNumber(stat.cards?.red);

        matches = sumOrNull(matches, appearances);
        starts = sumOrNull(starts, lineups);
        minutes = sumOrNull(minutes, playedMinutes);
        goals = sumOrNull(goals, goalsValue);
        assists = sumOrNull(assists, assistsValue);
        shots = sumOrNull(shots, shotsValue);
        shotsOnTarget = sumOrNull(shotsOnTarget, shotsOnTargetValue);
        passes = sumOrNull(passes, passesValue);
        tackles = sumOrNull(tackles, tacklesValue);
        interceptions = sumOrNull(interceptions, interceptionsValue);
        yellowCards = sumOrNull(yellowCards, yellowCardsValue);
        redCards = sumOrNull(redCards, redCardsValue);

        const ratingValue = toFiniteNumber(stat.games?.rating);
        if (ratingValue !== null) {
            const weight = playedMinutes ?? appearances ?? 1;
            if (weight > 0) {
                ratingWeightedSum += ratingValue * weight;
                ratingWeight += weight;
            }
        }

        const passesAccuracyValue = toFiniteNumber(stat.passes?.accuracy);
        if (passesAccuracyValue !== null) {
            const weight = passesValue ?? playedMinutes ?? appearances ?? 1;
            if (weight > 0) {
                passesAccuracyWeightedSum += passesAccuracyValue * weight;
                passesAccuracyWeight += weight;
            }
        }
    });

    return {
        matches,
        starts,
        minutes,
        goals,
        assists,
        rating: ratingWeight > 0 ? normalizeRating(ratingWeightedSum / ratingWeight, 2) : null,
        shots,
        shotsOnTarget,
        passes,
        passesAccuracy:
            passesAccuracyWeight > 0
                ? Number((passesAccuracyWeightedSum / passesAccuracyWeight).toFixed(2))
                : null,
        tackles,
        interceptions,
        yellowCards,
        redCards,
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
        minutes: null,
        rating: null,
        goals: null,
        assists: null,
        yellowCards: null,
        redCards: null,
        isStarter: null,
    };

    const resolvePrimaryMatchStatistic = (
        statistics: PlayerApiMatchStat[] | undefined,
    ): PlayerApiMatchStat | null => {
        if (!statistics || statistics.length === 0) {
            return null;
        }

        return [...statistics].sort((a, b) => {
            const aMinutes = normalizeNumber(a.games?.minutes) ?? 0;
            const bMinutes = normalizeNumber(b.games?.minutes) ?? 0;
            if (bMinutes !== aMinutes) {
                return bMinutes - aMinutes;
            }

            const aGoals = normalizeNumber(a.goals?.total) ?? 0;
            const bGoals = normalizeNumber(b.goals?.total) ?? 0;
            if (bGoals !== aGoals) {
                return bGoals - aGoals;
            }

            const aRating = toFiniteNumber(a.games?.rating) ?? 0;
            const bRating = toFiniteNumber(b.games?.rating) ?? 0;
            return bRating - aRating;
        })[0] ?? null;
    };

    if (performanceDto?.players) {
        for (const teamTeam of performanceDto.players) {
            const matchPlayer = teamTeam.players?.find(p => String(p.player?.id) === playerId);
            if (matchPlayer && matchPlayer.statistics && matchPlayer.statistics.length > 0) {
                const s = resolvePrimaryMatchStatistic(matchPlayer.statistics);
                if (!s) {
                    continue;
                }
                playerStats = {
                    minutes: normalizeNumber(s.games?.minutes),
                    rating: normalizeRating(s.games?.rating, 1),
                    goals: normalizeNumber(s.goals?.total),
                    assists: normalizeNumber(s.goals?.assists),
                    yellowCards: normalizeNumber(s.cards?.yellow),
                    redCards: normalizeNumber(s.cards?.red),
                    isStarter:
                        typeof s.games?.substitute === 'boolean'
                            ? s.games.substitute === false
                            : null,
                };
                break;
            }
        }
    }

    const fixtureId = toId(fixtureDto.fixture.id);
    if (!fixtureId) {
        return null;
    }

    return {
        fixtureId,
        date: normalizeString(fixtureDto.fixture.date),
        competition: {
            id: toId(fixtureDto.league?.id),
            name: normalizeString(fixtureDto.league?.name),
            logo: normalizeString(fixtureDto.league?.logo),
        },
        homeTeam: {
            id: toId(fixtureDto.teams.home?.id),
            name: normalizeString(fixtureDto.teams.home?.name),
            logo: normalizeString(fixtureDto.teams.home?.logo),
        },
        awayTeam: {
            id: toId(fixtureDto.teams.away?.id),
            name: normalizeString(fixtureDto.teams.away?.name),
            logo: normalizeString(fixtureDto.teams.away?.logo),
        },
        goalsHome: fixtureDto.goals?.home ?? null,
        goalsAway: fixtureDto.goals?.away ?? null,
        playerStats,
    };
}

export function mapPlayerCareerSeasons(dto: PlayerApiDetailsDto): PlayerCareerSeason[] {
    if (!dto.statistics) return [];

    return dto.statistics.map(s => ({
        season: s.league?.season ? String(s.league.season) : null,
        team: {
            id: toId(s.team?.id),
            name: normalizeString(s.team?.name),
            logo: normalizeString(s.team?.logo),
        },
        matches: normalizeNumber(s.games?.appearences),
        goals: normalizeNumber(s.goals?.total),
        assists: normalizeNumber(s.goals?.assists),
        rating: normalizeRating(s.games?.rating, 2),
    })).sort((a, b) => {
        const aYear = a.season ? Number.parseInt(a.season, 10) : Number.NEGATIVE_INFINITY;
        const bYear = b.season ? Number.parseInt(b.season, 10) : Number.NEGATIVE_INFINITY;
        return bYear - aYear;
    });
}

export function mapPlayerCareerTeams(dto: PlayerApiDetailsDto): PlayerCareerTeam[] {
    if (!dto.statistics) return [];

    const teamMap = new Map<string, PlayerCareerTeam>();

    dto.statistics.forEach(s => {
        const teamId = toId(s.team?.id);
        const seasonStr = s.league?.season ? String(s.league.season) : '';
        if (!teamId) {
            return;
        }

        if (!teamMap.has(teamId)) {
            teamMap.set(teamId, {
                team: {
                    id: teamId,
                    name: normalizeString(s.team?.name),
                    logo: normalizeString(s.team?.logo),
                },
                period: seasonStr || null, // Will be updated
                matches: null,
                goals: null,
                assists: null,
            });
        }

        const t = teamMap.get(teamId)!;
        t.matches = sumOrNull(t.matches, normalizeNumber(s.games?.appearences));
        t.goals = sumOrNull(t.goals, normalizeNumber(s.goals?.total));
        t.assists = sumOrNull(t.assists, normalizeNumber(s.goals?.assists));

        // Update period heuristically
        if (seasonStr && !(t.period ?? '').includes(seasonStr)) {
            if (!t.period) {
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
