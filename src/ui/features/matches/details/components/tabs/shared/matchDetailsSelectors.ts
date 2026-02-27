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
import type {
  EventRow,
  MatchStatsMetricKey,
  MatchStatsSectionKey,
  RawRecord,
  StatRow,
} from './matchDetailsTabTypes';

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

type MatchStatDescriptor = {
  metricKey: MatchStatsMetricKey;
  section: MatchStatsSectionKey;
  labelKey: string;
  fallbackLabel: string;
  aliases: readonly string[];
};

const MATCH_STAT_DESCRIPTORS: readonly MatchStatDescriptor[] = [
  {
    metricKey: 'total_shots',
    section: 'shots',
    labelKey: 'matchDetails.stats.labels.totalShots',
    fallbackLabel: 'Total Shots',
    aliases: ['total shots'],
  },
  {
    metricKey: 'shots_on_goal',
    section: 'shots',
    labelKey: 'matchDetails.stats.labels.shotsOnGoal',
    fallbackLabel: 'Shots on Goal',
    aliases: ['shots on goal', 'shots on target'],
  },
  {
    metricKey: 'shots_off_goal',
    section: 'shots',
    labelKey: 'matchDetails.stats.labels.shotsOffGoal',
    fallbackLabel: 'Shots off Goal',
    aliases: ['shots off goal', 'shots off target'],
  },
  {
    metricKey: 'blocked_shots',
    section: 'shots',
    labelKey: 'matchDetails.stats.labels.blockedShots',
    fallbackLabel: 'Blocked Shots',
    aliases: ['blocked shots'],
  },
  {
    metricKey: 'shots_insidebox',
    section: 'shots',
    labelKey: 'matchDetails.stats.labels.shotsInsidebox',
    fallbackLabel: 'Shots inside box',
    aliases: ['shots insidebox', 'shots inside box'],
  },
  {
    metricKey: 'shots_outsidebox',
    section: 'shots',
    labelKey: 'matchDetails.stats.labels.shotsOutsidebox',
    fallbackLabel: 'Shots outside box',
    aliases: ['shots outsidebox', 'shots outside box'],
  },
  {
    metricKey: 'ball_possession',
    section: 'possessionPasses',
    labelKey: 'matchDetails.stats.labels.ballPossession',
    fallbackLabel: 'Ball Possession',
    aliases: ['ball possession', 'possession'],
  },
  {
    metricKey: 'total_passes',
    section: 'possessionPasses',
    labelKey: 'matchDetails.stats.labels.totalPasses',
    fallbackLabel: 'Total passes',
    aliases: ['total passes'],
  },
  {
    metricKey: 'passes_accurate',
    section: 'possessionPasses',
    labelKey: 'matchDetails.stats.labels.passesAccurate',
    fallbackLabel: 'Passes accurate',
    aliases: ['passes accurate', 'accurate passes'],
  },
  {
    metricKey: 'passes_percent',
    section: 'possessionPasses',
    labelKey: 'matchDetails.stats.labels.passesPercent',
    fallbackLabel: 'Passes %',
    aliases: ['passes %', 'passes percentage', 'passes accuracy', 'pass accuracy'],
  },
  {
    metricKey: 'fouls',
    section: 'discipline',
    labelKey: 'matchDetails.stats.labels.fouls',
    fallbackLabel: 'Fouls',
    aliases: ['fouls', 'fouls committed'],
  },
  {
    metricKey: 'yellow_cards',
    section: 'discipline',
    labelKey: 'matchDetails.stats.labels.yellowCards',
    fallbackLabel: 'Yellow Cards',
    aliases: ['yellow cards'],
  },
  {
    metricKey: 'red_cards',
    section: 'discipline',
    labelKey: 'matchDetails.stats.labels.redCards',
    fallbackLabel: 'Red Cards',
    aliases: ['red cards'],
  },
  {
    metricKey: 'corner_kicks',
    section: 'other',
    labelKey: 'matchDetails.stats.labels.cornerKicks',
    fallbackLabel: 'Corner Kicks',
    aliases: ['corner kicks', 'corners'],
  },
  {
    metricKey: 'offsides',
    section: 'other',
    labelKey: 'matchDetails.stats.labels.offsides',
    fallbackLabel: 'Offsides',
    aliases: ['offsides'],
  },
  {
    metricKey: 'goalkeeper_saves',
    section: 'other',
    labelKey: 'matchDetails.stats.labels.goalkeeperSaves',
    fallbackLabel: 'Goalkeeper Saves',
    aliases: ['goalkeeper saves', 'saves'],
  },
  {
    metricKey: 'expected_goals',
    section: 'advanced',
    labelKey: 'matchDetails.stats.labels.expectedGoals',
    fallbackLabel: 'Expected Goals',
    aliases: ['expected goals', 'expected_goals', 'xg'],
  },
  {
    metricKey: 'goals_prevented',
    section: 'advanced',
    labelKey: 'matchDetails.stats.labels.goalsPrevented',
    fallbackLabel: 'Goals Prevented',
    aliases: ['goals prevented', 'goals_prevented'],
  },
];

const MATCH_STAT_DESCRIPTOR_BY_ALIAS = MATCH_STAT_DESCRIPTORS.reduce<Map<string, MatchStatDescriptor>>((map, descriptor) => {
  descriptor.aliases.forEach(alias => {
    map.set(alias, descriptor);
  });
  return map;
}, new Map<string, MatchStatDescriptor>());

function normalizeStatLabel(value: unknown): string {
  return toText(value)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\(\s*(1st|first|2nd|second)\s*half\s*\)/gi, '')
    .replace(/\b(1st|first|2nd|second)\s*half\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveStatDescriptor(type: unknown): MatchStatDescriptor | null {
  const normalizedType = normalizeStatLabel(type);
  if (!normalizedType) {
    return null;
  }

  return MATCH_STAT_DESCRIPTOR_BY_ALIAS.get(normalizedType) ?? null;
}

function normalizeStatValue(value: unknown): number | null {
  const raw = toText(value, '').replace('%', '').trim();
  if (!raw) {
    return null;
  }

  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasDisplayableValue(value: unknown): boolean {
  if (value === null || typeof value === 'undefined') {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return true;
}

export function formatDisplayStat(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '—';
  }

  const parsed = toNumber(value);
  if (parsed === null) {
    return '—';
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
  lineupTeams: MatchLineupTeam[] = [],
): EventRow[] {
  const photoMap = new Map<string, string>();
  lineupTeams.forEach(team => {
    const allPlayers = [...team.startingXI, ...team.substitutes];
    allPlayers.forEach(p => {
      if (p.photo) {
        if (p.id) photoMap.set(p.id, p.photo);
        if (p.name) photoMap.set(p.name.toLowerCase(), p.photo);
      }
    });
  });

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

      const playerId = toId(player?.id);
      const assistId = toId(assist?.id);

      const playerPhoto = playerId && photoMap.has(playerId) ? photoMap.get(playerId) ?? null : photoMap.get(playerName.toLowerCase()) ?? null;
      const assistPhoto = assistId && photoMap.has(assistId) ? photoMap.get(assistId) ?? null : assistName ? (photoMap.get(assistName.toLowerCase()) ?? null) : null;

      return {
        id: `${teamId}-${minute}-${type}-${index}`,
        minute,
        label: assistName ? `${type} · ${playerName} (${assistName})` : `${type} · ${playerName}`,
        type,
        detail,
        team: side,
        isNew: index < 2,
        playerName,
        playerId,
        playerPhoto,
        assistName: assistName || null,
        assistId,
        assistPhoto,
      } satisfies EventRow;
    })
    .filter(item => item.label.trim().length > 0);
}

export function buildStatRows(statistics: unknown[]): StatRow[] {
  const homeRaw = toRecord(statistics[0]);
  const awayRaw = toRecord(statistics[1]);
  const homeStats = toArray(homeRaw?.statistics);
  const awayStats = toArray(awayRaw?.statistics);

  const mapTeamStats = (rows: unknown[]) => rows.reduce<Map<MatchStatsMetricKey, unknown>>((map, stat) => {
    const statRecord = toRecord(stat);
    const descriptor = resolveStatDescriptor(statRecord?.type);
    if (!descriptor) {
      return map;
    }

    const incomingValue = statRecord?.value;
    const existingValue = map.get(descriptor.metricKey);
    if (!hasDisplayableValue(existingValue) && hasDisplayableValue(incomingValue)) {
      map.set(descriptor.metricKey, incomingValue);
    } else if (!map.has(descriptor.metricKey)) {
      map.set(descriptor.metricKey, incomingValue);
    }

    return map;
  }, new Map<MatchStatsMetricKey, unknown>());

  const homeMap = mapTeamStats(homeStats);
  const awayMap = mapTeamStats(awayStats);

  return MATCH_STAT_DESCRIPTORS
    .map(descriptor => {
      const homeValueRaw = homeMap.get(descriptor.metricKey);
      const awayValueRaw = awayMap.get(descriptor.metricKey);
      if (!hasDisplayableValue(homeValueRaw) && !hasDisplayableValue(awayValueRaw)) {
        return null;
      }

      const homeNumeric = normalizeStatValue(homeValueRaw);
      const awayNumeric = normalizeStatValue(awayValueRaw);
      const homeWeight = homeNumeric ?? 0;
      const awayWeight = awayNumeric ?? 0;
      const total = homeWeight + awayWeight;
      const homePercent = total > 0 ? (homeWeight / total) * 100 : 50;
      const awayPercent = total > 0 ? (awayWeight / total) * 100 : 50;

      return {
        key: descriptor.metricKey,
        metricKey: descriptor.metricKey,
        section: descriptor.section,
        label: descriptor.fallbackLabel,
        labelKey: descriptor.labelKey,
        homeValue: formatDisplayStat(homeValueRaw),
        awayValue: formatDisplayStat(awayValueRaw),
        homePercent,
        awayPercent,
      } satisfies StatRow;
    })
    .filter((row): row is StatRow => row !== null);
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
  events: unknown[] = [],
): MatchLineupTeam[] {
  const homeStatMap = mapPlayerStatById(homePlayersStats);
  const awayStatMap = mapPlayerStatById(awayPlayersStats);

  const subInMap = new Map<string, number>();
  const subOutMap = new Map<string, number>();

  toArray(events).forEach(entry => {
    const raw = toRecord(entry);
    if (toText(raw?.type)?.toLowerCase() === 'subst') {
      const time = toRecord(raw?.time);
      const elapsed = toNumber(time?.elapsed);
      const playerRecord = toRecord(raw?.player);
      const assistRecord = toRecord(raw?.assist);

      const incomingPlayerId = toId(playerRecord?.id);
      const outgoingPlayerId = toId(assistRecord?.id);

      const incomingPlayerName = toText(playerRecord?.name)?.toLowerCase();
      const outgoingPlayerName = toText(assistRecord?.name)?.toLowerCase();

      if (elapsed !== null) {
        if (incomingPlayerId) subInMap.set(incomingPlayerId, elapsed);
        else if (incomingPlayerName) subInMap.set(incomingPlayerName, elapsed);

        if (outgoingPlayerId) subOutMap.set(outgoingPlayerId, elapsed);
        else if (outgoingPlayerName) subOutMap.set(outgoingPlayerName, elapsed);
      }
    }
  });

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

      let inMinute = subInMap.get(player.id) ?? subInMap.get(player.name.toLowerCase()) ?? null;
      let outMinute = subOutMap.get(player.id) ?? subOutMap.get(player.name.toLowerCase()) ?? null;

      if (inMinute === null) {
        inMinute = toNumber(toRecord(stats?.substitutes)?.in);
      }
      if (outMinute === null) {
        outMinute = toNumber(toRecord(stats?.substitutes)?.out);
      }

      if (inMinute === 0) inMinute = null;
      if (outMinute === 0) outMinute = null;

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
