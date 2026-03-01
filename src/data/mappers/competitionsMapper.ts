import { normalizeNumber, normalizeRating, normalizeString } from '@data/mappers/playersMapper';
import { rewriteAssetUrl } from '@data/mappers/shared/assetCdn';
import type {
    Competition,
    CompetitionTotwData,
    CompetitionTotwPlayer,
    CompetitionTotwRole,
    CompetitionPlayerStat,
    CompetitionsApiFixtureDto,
    CompetitionsApiLeagueDto,
    CompetitionsApiPlayerStatDto,
    CompetitionsApiStandingDto,
    CompetitionsApiTransferDto,
    Fixture,
    StandingVenueStats,
    StandingGroup,
    StandingRow,
    Transfer,
    TransferDirection,
} from '@domain/contracts/competitions.types';

type CompetitionPlayerStatistic = CompetitionsApiPlayerStatDto['statistics'][number];

function mapStandingVenueStats(
    split: CompetitionsApiStandingDto['league']['standings'][number][number]['home'],
): StandingVenueStats {
    return {
        played: normalizeNumber(split?.played) ?? 0,
        win: normalizeNumber(split?.win) ?? 0,
        draw: normalizeNumber(split?.draw) ?? 0,
        lose: normalizeNumber(split?.lose) ?? 0,
        goalsFor: normalizeNumber(split?.goals?.for) ?? 0,
        goalsAgainst: normalizeNumber(split?.goals?.against) ?? 0,
    };
}

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
                home: mapStandingVenueStats(teamStanding.home),
                away: mapStandingVenueStats(teamStanding.away),
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

type TotwSlot = {
    x: number;
    y: number;
};

type TotwCandidate = CompetitionPlayerStat & {
    role: CompetitionTotwRole;
    ratingValue: number;
};

const TOTW_SLOTS: Record<CompetitionTotwRole, TotwSlot[]> = {
    ATT: [
        { x: 22, y: 18 },
        { x: 50, y: 14 },
        { x: 78, y: 18 },
    ],
    MID: [
        { x: 26, y: 44 },
        { x: 50, y: 40 },
        { x: 74, y: 44 },
    ],
    DEF: [
        { x: 16, y: 68 },
        { x: 38, y: 72 },
        { x: 62, y: 72 },
        { x: 84, y: 68 },
    ],
    GK: [{ x: 50, y: 88 }],
};

const TOTW_ROLE_COUNTS: Record<CompetitionTotwRole, number> = {
    GK: 1,
    DEF: 4,
    MID: 3,
    ATT: 3,
};

function normalizePositionToken(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .trim();
}

function resolveTotwRole(position: string): CompetitionTotwRole | null {
    const normalized = normalizePositionToken(position);
    if (!normalized) {
        return null;
    }

    if (
        normalized === 'gk' ||
        normalized === 'goalkeeper' ||
        normalized.includes('keeper')
    ) {
        return 'GK';
    }

    if (
        normalized === 'cb' ||
        normalized === 'lb' ||
        normalized === 'rb' ||
        normalized === 'lwb' ||
        normalized === 'rwb' ||
        normalized.includes('defender') ||
        normalized.includes('centerback') ||
        normalized.includes('centreback') ||
        normalized.includes('fullback') ||
        normalized.includes('wingback') ||
        normalized.includes('leftback') ||
        normalized.includes('rightback') ||
        normalized.includes('back')
    ) {
        return 'DEF';
    }

    if (
        normalized === 'dm' ||
        normalized === 'cm' ||
        normalized === 'am' ||
        normalized === 'lm' ||
        normalized === 'rm' ||
        normalized === 'cdm' ||
        normalized === 'cam' ||
        normalized.includes('midfield')
    ) {
        return 'MID';
    }

    if (
        normalized === 'st' ||
        normalized === 'cf' ||
        normalized === 'ss' ||
        normalized === 'lw' ||
        normalized === 'rw' ||
        normalized.includes('attacker') ||
        normalized.includes('forward') ||
        normalized.includes('striker') ||
        normalized.includes('winger') ||
        normalized.includes('leftwing') ||
        normalized.includes('rightwing') ||
        normalized.includes('avantcentre')
    ) {
        return 'ATT';
    }

    return null;
}

function compareTotwCandidates(first: TotwCandidate, second: TotwCandidate): number {
    if (second.ratingValue !== first.ratingValue) {
        return second.ratingValue - first.ratingValue;
    }

    const firstMatches = toComparableNumber(first.matchesPlayed);
    const secondMatches = toComparableNumber(second.matchesPlayed);
    if (secondMatches !== firstMatches) {
        return secondMatches - firstMatches;
    }

    const firstContributions = toComparableNumber(first.goals) + toComparableNumber(first.assists);
    const secondContributions = toComparableNumber(second.goals) + toComparableNumber(second.assists);
    if (secondContributions !== firstContributions) {
        return secondContributions - firstContributions;
    }

    return first.playerId - second.playerId;
}

function selectTotwLineByRole(
    candidates: TotwCandidate[],
    role: CompetitionTotwRole,
    selectedIds: Set<number>,
): TotwCandidate[] | null {
    const selected = candidates
        .filter(candidate => candidate.role === role && !selectedIds.has(candidate.playerId))
        .sort(compareTotwCandidates)
        .slice(0, TOTW_ROLE_COUNTS[role]);

    if (selected.length < TOTW_ROLE_COUNTS[role]) {
        return null;
    }

    selected.forEach(candidate => {
        selectedIds.add(candidate.playerId);
    });

    return selected;
}

function mapTotwPlayers(role: CompetitionTotwRole, line: TotwCandidate[]): CompetitionTotwPlayer[] {
    const slots = TOTW_SLOTS[role];

    return line.map((candidate, index) => {
        const slot = slots[index] ?? slots[slots.length - 1];

        return {
            playerId: candidate.playerId,
            playerName: candidate.playerName,
            playerPhoto: candidate.playerPhoto,
            teamId: candidate.teamId,
            teamName: candidate.teamName,
            teamLogo: candidate.teamLogo,
            position: candidate.position,
            role,
            rating: Number(candidate.ratingValue.toFixed(1)),
            gridX: slot?.x ?? 50,
            gridY: slot?.y ?? 50,
        };
    });
}

function toTotwCandidate(stat: CompetitionPlayerStat): TotwCandidate | null {
    if (!stat.playerId || !stat.position) {
        return null;
    }

    const role = resolveTotwRole(stat.position);
    if (!role) {
        return null;
    }

    const ratingValue = toComparableRating(stat.rating);
    if (ratingValue <= 0) {
        return null;
    }

    return {
        ...stat,
        role,
        ratingValue,
    };
}

export function mapCompetitionPlayerStatsToTotw(
    playerStats: CompetitionPlayerStat[],
    season: number,
): CompetitionTotwData | null {
    if (!Array.isArray(playerStats) || playerStats.length === 0 || !Number.isFinite(season)) {
        return null;
    }

    const dedupedCandidatesByPlayer = new Map<number, TotwCandidate>();
    playerStats.forEach(stat => {
        const candidate = toTotwCandidate(stat);
        if (!candidate) {
            return;
        }

        const existing = dedupedCandidatesByPlayer.get(candidate.playerId);
        if (!existing || compareTotwCandidates(candidate, existing) < 0) {
            dedupedCandidatesByPlayer.set(candidate.playerId, candidate);
        }
    });

    const dedupedCandidates = Array.from(dedupedCandidatesByPlayer.values());
    if (dedupedCandidates.length < 11) {
        return null;
    }

    const selectedIds = new Set<number>();
    const goalkeepers = selectTotwLineByRole(dedupedCandidates, 'GK', selectedIds);
    const defenders = selectTotwLineByRole(dedupedCandidates, 'DEF', selectedIds);
    const midfielders = selectTotwLineByRole(dedupedCandidates, 'MID', selectedIds);
    const attackers = selectTotwLineByRole(dedupedCandidates, 'ATT', selectedIds);

    if (!goalkeepers || !defenders || !midfielders || !attackers) {
        return null;
    }

    const players = [
        ...mapTotwPlayers('ATT', attackers),
        ...mapTotwPlayers('MID', midfielders),
        ...mapTotwPlayers('DEF', defenders),
        ...mapTotwPlayers('GK', goalkeepers),
    ];

    if (players.length !== 11) {
        return null;
    }

    const averageRating = Number(
        (players.reduce((sum, player) => sum + player.rating, 0) / players.length).toFixed(1),
    );

    return {
        formation: '4-3-3',
        season,
        averageRating,
        players,
    };
}

function toTransferTimestamp(value: string | null): number {
    if (!value) {
        return Number.MIN_SAFE_INTEGER;
    }

    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : Number.MIN_SAFE_INTEGER;
}

function normalizeTransferKeyText(value: string | null): string {
    return (value ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function normalizeTransferDate(value: string | null): string | null {
    if (!value) {
        return null;
    }

    const normalized = value.trim();
    const explicitDate = normalized.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (explicitDate) {
        return explicitDate;
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toISOString().slice(0, 10);
}

function toTransferTeamDedupPart(teamId: number, teamName: string): string {
    if (teamId > 0) {
        return `id:${teamId}`;
    }

    const normalizedName = normalizeTransferKeyText(teamName);
    return normalizedName ? `name:${normalizedName}` : '';
}

function buildCompetitionTransferDedupKey(params: {
    playerId: number;
    playerName: string;
    type: string;
    teamInId: number;
    teamInName: string;
    teamOutId: number;
    teamOutName: string;
    isArrival: boolean;
    isDeparture: boolean;
}): string {
    return [
        params.playerId,
        normalizeTransferKeyText(params.playerName),
        normalizeTransferKeyText(params.type),
        toTransferTeamDedupPart(params.teamOutId, params.teamOutName),
        toTransferTeamDedupPart(params.teamInId, params.teamInName),
        params.isArrival ? '1' : '0',
        params.isDeparture ? '1' : '0',
    ].join('|');
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
        if (!playerName) {
            return;
        }

        const playerPhoto =
            rewriteAssetUrl(`https://media.api-sports.io/football/players/${playerId}.png`) ?? '';
        const dtoTransfers = Array.isArray(dto.transfers) ? dto.transfers : [];

        dtoTransfers.forEach(transfer => {
            const date = normalizeTransferDate(normalizeString(transfer.date));
            if (!date) {
                return;
            }

            if (typeof season === 'number' && !isDateInSeason(date, season)) {
                return;
            }

            const type = normalizeString(transfer.type) ?? '';
            if (!type) {
                return;
            }

            const teamInId = normalizeNumber(transfer.teams?.in?.id) ?? 0;
            const teamOutId = normalizeNumber(transfer.teams?.out?.id) ?? 0;
            const teamInName = normalizeString(transfer.teams?.in?.name) ?? '';
            const teamOutName = normalizeString(transfer.teams?.out?.name) ?? '';

            if (teamInId <= 0 || teamOutId <= 0 || !teamInName || !teamOutName) {
                return;
            }

            const isArrival = dto.context?.teamInInLeague ?? teamInId > 0;
            const isDeparture = dto.context?.teamOutInLeague ?? teamOutId > 0;

            if (!isArrival && !isDeparture) {
                return;
            }

            const timestamp = toTransferTimestamp(date);
            const id = buildCompetitionTransferDedupKey({
                playerId,
                playerName,
                type,
                teamInId,
                teamInName,
                teamOutId,
                teamOutName,
                isArrival,
                isDeparture,
            });
            const existingTransfer = transferMap.get(id);
            if (existingTransfer && existingTransfer.timestamp >= timestamp) {
                return;
            }

            transferMap.set(id, {
                id,
                playerId,
                playerName,
                playerPhoto,
                date,
                timestamp,
                type,
                direction: resolveTransferDirection(isArrival, isDeparture),
                isArrival,
                isDeparture,
                teamIn: {
                    id: teamInId,
                    name: teamInName,
                    logo: normalizeString(transfer.teams?.in?.logo) ?? '',
                },
                teamOut: {
                    id: teamOutId,
                    name: teamOutName,
                    logo: normalizeString(transfer.teams?.out?.logo) ?? '',
                },
            });
        });
    });

    return Array.from(transferMap.values()).sort((a, b) => b.timestamp - a.timestamp);
}
