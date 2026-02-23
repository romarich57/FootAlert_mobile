import { normalizeNumber, normalizeRating, normalizeString } from '@data/mappers/playersMapper';
import type {
    Competition,
    CompetitionPlayerStat,
    CompetitionsApiFixtureDto,
    CompetitionsApiLeagueDto,
    CompetitionsApiPlayerStatDto,
    CompetitionsApiStandingDto,
    CompetitionsApiTransferDto,
    Fixture,
    StandingGroup,
    StandingRow,
    Transfer,
    TransferDirection,
} from '@ui/features/competitions/types/competitions.types';

type CompetitionPlayerStatistic = CompetitionsApiPlayerStatDto['statistics'][number];

export function mapLeagueDtoToCompetition(dto: CompetitionsApiLeagueDto | null): Competition | null {
    if (!dto) {
        return null;
    }

    return {
        id: String(dto.league.id),
        name: dto.league.name,
        logo: dto.league.logo,
        type: dto.league.type,
        countryName: dto.country.name,
    };
}

export function mapStandingDtoToGroups(dto: CompetitionsApiStandingDto | null): StandingGroup[] {
    if (!dto || !dto.league || !dto.league.standings || !Array.isArray(dto.league.standings)) {
        return [];
    }

    const groupsMap = new Map<string, StandingRow[]>();

    dto.league.standings.forEach((standingsArray) => {
        standingsArray.forEach((teamStanding) => {
            const groupName = normalizeString(teamStanding.group) || '';
            if (!groupsMap.has(groupName)) {
                groupsMap.set(groupName, []);
            }

            const row: StandingRow = {
                rank: normalizeNumber(teamStanding.rank) ?? 0,
                teamId: normalizeNumber(teamStanding.team?.id) ?? 0,
                teamName: normalizeString(teamStanding.team?.name) || '',
                teamLogo: normalizeString(teamStanding.team?.logo) || '',
                points: normalizeNumber(teamStanding.points) ?? 0,
                goalsDiff: normalizeNumber(teamStanding.goalsDiff) ?? 0,
                played: normalizeNumber(teamStanding.all?.played) ?? 0,
                win: normalizeNumber(teamStanding.all?.win) ?? 0,
                draw: normalizeNumber(teamStanding.all?.draw) ?? 0,
                lose: normalizeNumber(teamStanding.all?.lose) ?? 0,
                goalsFor: normalizeNumber(teamStanding.all?.goals?.for) ?? 0,
                goalsAgainst: normalizeNumber(teamStanding.all?.goals?.against) ?? 0,
                group: groupName,
                form: normalizeString(teamStanding.form) || '',
                description: normalizeString(teamStanding.description),
            };

            groupsMap.get(groupName)?.push(row);
        });
    });

    const result: StandingGroup[] = [];
    groupsMap.forEach((rows, groupName) => {
        result.push({ groupName, rows: rows.sort((a, b) => a.rank - b.rank) });
    });

    return result;
}

export function mapFixturesDtoToFixtures(dtos: CompetitionsApiFixtureDto[]): Fixture[] {
    if (!Array.isArray(dtos)) return [];

    return dtos.map(dto => ({
        id: normalizeNumber(dto.fixture?.id) ?? 0,
        date: normalizeString(dto.fixture?.date) || '',
        timestamp: normalizeNumber(dto.fixture?.timestamp) ?? 0,
        status: normalizeString(dto.fixture?.status?.short) || '',
        elapsed: normalizeNumber(dto.fixture?.status?.elapsed),
        round: normalizeString(dto.league?.round) || '',
        homeTeam: {
            id: normalizeNumber(dto.teams?.home?.id) ?? 0,
            name: normalizeString(dto.teams?.home?.name) || '',
            logo: normalizeString(dto.teams?.home?.logo) || '',
            winner: dto.teams?.home?.winner ?? null,
        },
        awayTeam: {
            id: normalizeNumber(dto.teams?.away?.id) ?? 0,
            name: normalizeString(dto.teams?.away?.name) || '',
            logo: normalizeString(dto.teams?.away?.logo) || '',
            winner: dto.teams?.away?.winner ?? null,
        },
        goalsHome: normalizeNumber(dto.goals?.home),
        goalsAway: normalizeNumber(dto.goals?.away),
        penaltyHome: normalizeNumber(dto.score?.penalty?.home),
        penaltyAway: normalizeNumber(dto.score?.penalty?.away),
    })).sort((a, b) => a.timestamp - b.timestamp);
}

function toComparableNumber(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toComparableRating(value: string | null | undefined): number {
    if (typeof value !== 'string') {
        return 0;
    }

    const parsed = Number.parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
}

function resolvePrimaryCompetitionStatistic(
    statistics: CompetitionsApiPlayerStatDto['statistics'],
    season?: number,
): CompetitionPlayerStatistic | null {
    if (!statistics || statistics.length === 0) {
        return null;
    }

    const seasonScoped = typeof season === 'number'
        ? statistics.filter(item => item.league?.season === season)
        : statistics;
    const candidates = seasonScoped.length > 0 ? seasonScoped : statistics;

    return [...candidates].sort((a, b) => {
        const aMinutes = toComparableNumber(a.games?.minutes);
        const bMinutes = toComparableNumber(b.games?.minutes);
        if (bMinutes !== aMinutes) {
            return bMinutes - aMinutes;
        }

        const aAppearances = toComparableNumber(a.games?.appearences);
        const bAppearances = toComparableNumber(b.games?.appearences);
        if (bAppearances !== aAppearances) {
            return bAppearances - aAppearances;
        }

        const aGoals = toComparableNumber(a.goals?.total);
        const bGoals = toComparableNumber(b.goals?.total);
        if (bGoals !== aGoals) {
            return bGoals - aGoals;
        }

        const aAssists = toComparableNumber(a.goals?.assists);
        const bAssists = toComparableNumber(b.goals?.assists);
        if (bAssists !== aAssists) {
            return bAssists - aAssists;
        }

        const aRating = toComparableRating(a.games?.rating);
        const bRating = toComparableRating(b.games?.rating);
        return bRating - aRating;
    })[0] ?? null;
}

export function mapPlayerStatsDtoToPlayerStats(
    dtos: CompetitionsApiPlayerStatDto[],
    season?: number,
): CompetitionPlayerStat[] {
    if (!Array.isArray(dtos)) return [];

    return dtos.map(dto => {
        const stats = resolvePrimaryCompetitionStatistic(dto.statistics, season);

        return {
            playerId: normalizeNumber(dto.player?.id) ?? 0,
            playerName: normalizeString(dto.player?.name) || '',
            playerPhoto: normalizeString(dto.player?.photo) || '',
            teamId: normalizeNumber(stats?.team?.id) ?? 0,
            teamName: normalizeString(stats?.team?.name) || '',
            teamLogo: normalizeString(stats?.team?.logo) || '',
            position: normalizeString(stats?.games?.position) || '',
            rating: normalizeRating(stats?.games?.rating),
            matchesPlayed: normalizeNumber(stats?.games?.appearences),
            goals: normalizeNumber(stats?.goals?.total),
            assists: normalizeNumber(stats?.goals?.assists),
            yellowCards: normalizeNumber(stats?.cards?.yellow),
            redCards: normalizeNumber(stats?.cards?.red),
        };
    });
}

function toTransferTimestamp(value: string | null): number {
    if (!value) {
        return Number.MIN_SAFE_INTEGER;
    }

    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : Number.MIN_SAFE_INTEGER;
}

function isDateInSeason(dateIso: string | null, season: number): boolean {
    if (!dateIso) {
        return false;
    }

    const parsed = new Date(dateIso);
    if (Number.isNaN(parsed.getTime())) {
        return false;
    }

    const seasonStart = new Date(Date.UTC(season, 6, 1, 0, 0, 0));
    const seasonEnd = new Date(Date.UTC(season + 1, 5, 30, 23, 59, 59));

    return parsed >= seasonStart && parsed <= seasonEnd;
}

function resolveTransferDirection(isArrival: boolean, isDeparture: boolean): TransferDirection {
    if (isArrival && isDeparture) {
        return 'internal';
    }

    return isArrival ? 'arrival' : 'departure';
}

export function mapTransfersDtoToCompetitionTransfers(
    dtos: CompetitionsApiTransferDto[],
    season?: number,
): Transfer[] {
    if (!Array.isArray(dtos)) {
        return [];
    }

    const transferMap = new Map<string, Transfer>();

    dtos.forEach(dto => {
        const playerId = normalizeNumber(dto.player?.id);
        if (playerId === null) {
            return;
        }

        const playerName = normalizeString(dto.player?.name) ?? '';
        const playerPhoto = `https://media.api-sports.io/football/players/${playerId}.png`;
        const dtoTransfers = Array.isArray(dto.transfers) ? dto.transfers : [];

        dtoTransfers.forEach(transfer => {
            const date = normalizeString(transfer.date);
            if (!date) {
                return;
            }

            if (typeof season === 'number' && !isDateInSeason(date, season)) {
                return;
            }

            const type = normalizeString(transfer.type) ?? '';
            const teamInId = normalizeNumber(transfer.teams?.in?.id) ?? 0;
            const teamOutId = normalizeNumber(transfer.teams?.out?.id) ?? 0;

            const isArrival = dto.context?.teamInInLeague ?? teamInId > 0;
            const isDeparture = dto.context?.teamOutInLeague ?? teamOutId > 0;

            if (!isArrival && !isDeparture) {
                return;
            }

            const id = `${playerId}:${date}:${type}:${teamOutId}:${teamInId}`;

            transferMap.set(id, {
                id,
                playerId,
                playerName,
                playerPhoto,
                date,
                timestamp: toTransferTimestamp(date),
                type,
                direction: resolveTransferDirection(isArrival, isDeparture),
                isArrival,
                isDeparture,
                teamIn: {
                    id: teamInId,
                    name: normalizeString(transfer.teams?.in?.name) ?? '',
                    logo: normalizeString(transfer.teams?.in?.logo) ?? '',
                },
                teamOut: {
                    id: teamOutId,
                    name: normalizeString(transfer.teams?.out?.name) ?? '',
                    logo: normalizeString(transfer.teams?.out?.logo) ?? '',
                },
            });
        });
    });

    return Array.from(transferMap.values()).sort((a, b) => b.timestamp - a.timestamp);
}
