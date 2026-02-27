import type {
  ApiFootballFixtureDto,
  MatchLifecycleState,
  MatchLineupPlayer,
  MatchLineupTeam,
} from '@ui/features/matches/types/matches.types';
import type { CompetitionsApiStandingDto } from '@ui/features/competitions/types/competitions.types';
import type { TeamStandingsData } from '@ui/features/teams/types/teams.types';
import { applyLiveStandingsProjection } from '@ui/features/matches/details/utils/matchStandingsProjection';

import { toArray, toId, toNumber, toRecord, toText } from './matchDetailsParsing';
import type { EventRow, RawRecord, StatRow } from './matchDetailsTabTypes';

function getTeamSide(
  teamId: string,
  homeTeamId: string | null,
  awayTeamId: string | null,
): 'home' | 'away' | 'neutral' {
  if (teamId && homeTeamId && teamId === homeTeamId) {
    return 'home';
  }
  if (teamId && awayTeamId && teamId === awayTeamId) {
    return 'away';
  }

  return 'neutral';
}

function formatEventMinute(elapsed: unknown, extra: unknown): string {
  const elapsedValue = toNumber(elapsed);
  const extraValue = toNumber(extra);

  if (elapsedValue === null) {
    return '--';
  }

  if (extraValue !== null && extraValue > 0) {
    return `${elapsedValue}+${extraValue}'`;
  }

  return `${elapsedValue}'`;
}

function normalizeStatValue(value: unknown): number {
  const raw = toText(value, '').replace('%', '').trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatDisplayStat(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  const parsed = toNumber(value);
  if (parsed === null) {
    return '0';
  }

  if (Number.isInteger(parsed)) {
    return String(parsed);
  }

  return parsed.toFixed(2);
}

export function buildEvents(
  events: unknown[],
  homeTeamId: string | null,
  awayTeamId: string | null,
): EventRow[] {
  return events
    .map((entry, index) => {
      const raw = toRecord(entry);
      const team = toRecord(raw?.team);
      const time = toRecord(raw?.time);
      const player = toRecord(raw?.player);
      const assist = toRecord(raw?.assist);
      const minute = formatEventMinute(time?.elapsed, time?.extra);
      const type = toText(raw?.type, 'Event');
      const detail = toText(raw?.detail, toText(raw?.comments, ''));
      const playerName = toText(player?.name, 'N/A');
      const assistName = toText(assist?.name, '');
      const teamId = toId(team?.id);
      const side = getTeamSide(teamId, homeTeamId, awayTeamId);

      return {
        id: `${teamId}-${minute}-${type}-${index}`,
        minute,
        label: assistName ? `${type} · ${playerName} (${assistName})` : `${type} · ${playerName}`,
        detail,
        team: side,
        isNew: index < 2,
      } satisfies EventRow;
    })
    .filter(item => item.label.trim().length > 0);
}

export function buildStatRows(statistics: unknown[]): StatRow[] {
  const homeRaw = toRecord(statistics[0]);
  const awayRaw = toRecord(statistics[1]);
  const homeStats = toArray(homeRaw?.statistics);
  const awayStats = toArray(awayRaw?.statistics);

  const awayMap = new Map<string, unknown>();
  awayStats.forEach(stat => {
    const statRecord = toRecord(stat);
    const label = toText(statRecord?.type);
    if (label) {
      awayMap.set(label, statRecord?.value);
    }
  });

  return homeStats
    .map(stat => {
      const statRecord = toRecord(stat);
      const typeLabel = toText(statRecord?.type);
      if (!typeLabel) {
        return null;
      }

      const homeValueRaw = statRecord?.value;
      const awayValueRaw = awayMap.get(typeLabel);
      const homeValue = normalizeStatValue(homeValueRaw);
      const awayValue = normalizeStatValue(awayValueRaw);
      const total = homeValue + awayValue;
      const homePercent = total > 0 ? (homeValue / total) * 100 : 50;
      const awayPercent = total > 0 ? (awayValue / total) * 100 : 50;

      return {
        key: typeLabel,
        label: typeLabel,
        homeValue: formatDisplayStat(homeValueRaw),
        awayValue: formatDisplayStat(awayValueRaw),
        homePercent,
        awayPercent,
      } satisfies StatRow;
    })
    .filter((row): row is StatRow => row !== null)
    .slice(0, 12);
}

function mapPlayerStatById(playerStats: unknown[]): Map<string, RawRecord> {
  const map = new Map<string, RawRecord>();

  toArray(playerStats).forEach(teamEntry => {
    const entryRecord = toRecord(teamEntry);
    const players = toArray(entryRecord?.players);

    players.forEach(playerEntry => {
      const playerWrapper = toRecord(playerEntry);
      const player = toRecord(playerWrapper?.player);
      const playerId = toId(player?.id);
      if (!playerId) {
        return;
      }
      map.set(playerId, playerWrapper ?? {});
    });
  });

  return map;
}

export function mergeLineupStats(
  lineupTeams: MatchLineupTeam[],
  homePlayersStats: unknown[],
  awayPlayersStats: unknown[],
): MatchLineupTeam[] {
  const homeStatMap = mapPlayerStatById(homePlayersStats);
  const awayStatMap = mapPlayerStatById(awayPlayersStats);

  return lineupTeams.map(teamLineup => {
    const firstStarterId = teamLineup.startingXI[0]?.id;
    const currentStatsMap =
      firstStarterId && homeStatMap.has(firstStarterId)
        ? homeStatMap
        : awayStatMap;

    const mapPlayerWithStats = (player: MatchLineupPlayer): MatchLineupPlayer => {
      const performance = currentStatsMap.get(player.id);
      if (!performance) return player;

      const performancePlayer = toRecord(performance?.player);
      const statsList = toArray(performance?.statistics);
      const stats = toRecord(statsList[0]);
      const games = toRecord(stats?.games);
      const goals = toRecord(stats?.goals);
      const cards = toRecord(stats?.cards);
      const penalties = toRecord(stats?.penalty);

      const inMinute = toNumber(toRecord(stats?.substitutes)?.in);
      const outMinute = toNumber(toRecord(stats?.substitutes)?.out);

      return {
        ...player,
        photo: toText(performancePlayer?.photo, player.photo ?? undefined),
        isCaptain: typeof games?.captain === 'boolean' ? games.captain : player.isCaptain ?? null,
        rating: toNumber(games?.rating),
        goals: toNumber(goals?.total),
        assists: toNumber(goals?.assists),
        yellowCards: toNumber(cards?.yellow),
        redCards: toNumber(cards?.red),
        penaltyScored: toNumber(penalties?.scored),
        penaltyMissed: toNumber(penalties?.missed),
        inMinute,
        outMinute,
      };
    };

    return {
      ...teamLineup,
      startingXI: teamLineup.startingXI.map(mapPlayerWithStats),
      substitutes: teamLineup.substitutes.map(mapPlayerWithStats),
    };
  });
}

export function groupPlayersByPitchRows(players: MatchLineupTeam['startingXI']) {
  const grouped = new Map<string, MatchLineupTeam['startingXI']>();

  players.forEach(player => {
    const grid = (player.grid || '').includes(':') ? (player.grid || '').split(':')[0] : '0';
    const row = grid || '0';
    const current = grouped.get(row) ?? [];
    current.push(player);
    grouped.set(row, current);
  });

  return [...grouped.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([, rowPlayers]) => rowPlayers);
}

export function buildStandingsData(
  standings: CompetitionsApiStandingDto | null | undefined,
  homeTeamId: string | null,
  awayTeamId: string | null,
  lifecycleState: MatchLifecycleState,
  fixture: ApiFootballFixtureDto | null,
): TeamStandingsData {
  const groups = standings?.league?.standings ?? [];

  return {
    groups: groups.map(groupRows => {
      const mappedRows = groupRows.map(row => {
        const teamId = String(row.team.id);

        return {
          rank: row.rank,
          teamId,
          teamName: row.team.name,
          teamLogo: row.team.logo,
          played: row.all.played,
          goalDiff: row.goalsDiff,
          points: row.points,
          isTargetTeam: teamId === homeTeamId || teamId === awayTeamId,
          form: row.form,
          update: row.update,
          all: {
            played: row.all.played,
            win: row.all.win,
            draw: row.all.draw,
            lose: row.all.lose,
            goalsFor: row.all.goals.for,
            goalsAgainst: row.all.goals.against,
          },
          home: {
            played: row.home.played ?? null,
            win: row.home.win ?? null,
            draw: row.home.draw ?? null,
            lose: row.home.lose ?? null,
            goalsFor: row.home.goals?.for ?? null,
            goalsAgainst: row.home.goals?.against ?? null,
          },
          away: {
            played: row.away.played ?? null,
            win: row.away.win ?? null,
            draw: row.away.draw ?? null,
            lose: row.away.lose ?? null,
            goalsFor: row.away.goals?.for ?? null,
            goalsAgainst: row.away.goals?.against ?? null,
          },
        };
      });

      const sortedRows = applyLiveStandingsProjection({
        rows: mappedRows,
        lifecycleState,
        fixture,
        homeTeamId,
        awayTeamId,
      });

      return {
        groupName: toText(groupRows[0]?.group, ''),
        rows: sortedRows,
      };
    }),
  };
}
