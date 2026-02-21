import { normalizeNumber, normalizeRating, normalizeString } from '@data/mappers/playersMapper';
import type {
    Competition,
    CompetitionPlayerStat,
    CompetitionsApiFixtureDto,
    CompetitionsApiLeagueDto,
    CompetitionsApiPlayerStatDto,
    CompetitionsApiStandingDto,
    Fixture,
    StandingGroup,
    StandingRow,
} from '@ui/features/competitions/types/competitions.types';

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
            const groupName = normalizeString(teamStanding.group) || 'Classement';
            if (!groupsMap.has(groupName)) {
                groupsMap.set(groupName, []);
            }

            const row: StandingRow = {
                rank: normalizeNumber(teamStanding.rank) ?? 0,
                teamId: normalizeNumber(teamStanding.team?.id) ?? 0,
                teamName: normalizeString(teamStanding.team?.name) || '?',
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
                form: normalizeString(teamStanding.form) || '?',
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
        date: normalizeString(dto.fixture?.date) || '?',
        timestamp: normalizeNumber(dto.fixture?.timestamp) ?? 0,
        status: normalizeString(dto.fixture?.status?.short) || '?',
        elapsed: normalizeNumber(dto.fixture?.status?.elapsed),
        round: normalizeString(dto.league?.round) || '?',
        homeTeam: {
            id: normalizeNumber(dto.teams?.home?.id) ?? 0,
            name: normalizeString(dto.teams?.home?.name) || '?',
            logo: normalizeString(dto.teams?.home?.logo) || '',
            winner: dto.teams?.home?.winner ?? null,
        },
        awayTeam: {
            id: normalizeNumber(dto.teams?.away?.id) ?? 0,
            name: normalizeString(dto.teams?.away?.name) || '?',
            logo: normalizeString(dto.teams?.away?.logo) || '',
            winner: dto.teams?.away?.winner ?? null,
        },
        goalsHome: normalizeNumber(dto.goals?.home),
        goalsAway: normalizeNumber(dto.goals?.away),
        penaltyHome: normalizeNumber(dto.score?.penalty?.home),
        penaltyAway: normalizeNumber(dto.score?.penalty?.away),
    })).sort((a, b) => a.timestamp - b.timestamp);
}

export function mapPlayerStatsDtoToPlayerStats(dtos: CompetitionsApiPlayerStatDto[]): CompetitionPlayerStat[] {
    if (!Array.isArray(dtos)) return [];

    return dtos.map(dto => {
        // Find main stats if available, typically [0]
        const stats = dto.statistics?.[0] || {};

        return {
            playerId: normalizeNumber(dto.player?.id) ?? 0,
            playerName: normalizeString(dto.player?.name) || '?',
            playerPhoto: normalizeString(dto.player?.photo) || '',
            teamId: normalizeNumber(stats.team?.id) ?? 0,
            teamName: normalizeString(stats.team?.name) || '?',
            teamLogo: normalizeString(stats.team?.logo) || '',
            position: normalizeString(stats.games?.position) || '?',
            rating: normalizeRating(stats.games?.rating),
            matchesPlayed: normalizeNumber(stats.games?.appearences),
            goals: normalizeNumber(stats.goals?.total),
            assists: normalizeNumber(stats.goals?.assists),
            yellowCards: normalizeNumber(stats.cards?.yellow),
            redCards: normalizeNumber(stats.cards?.red),
        };
    });
}
