import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppImage } from '@ui/shared/media/AppImage';
import type {
  ApiFootballFixtureDto,
  MatchDetailsTabKey,
  MatchLifecycleState,
} from '@ui/features/matches/types/matches.types';
import type {
  CompetitionsApiStandingDto,
} from '@ui/features/competitions/types/competitions.types';
import { TeamStandingsTab } from '@ui/features/teams/components/TeamStandingsTab';
import type { TeamStandingsData } from '@ui/features/teams/types/teams.types';
import { applyLiveStandingsProjection } from '@ui/features/matches/details/utils/matchStandingsProjection';
import type { ThemeColors } from '@ui/shared/theme/theme';

type MatchDetailsTabContentProps = {
  activeTab: MatchDetailsTabKey;
  lifecycleState: MatchLifecycleState;
  fixture: ApiFootballFixtureDto | null;
  events: unknown[];
  statistics: unknown[];
  lineups: unknown[];
  h2h: unknown[];
  predictions: Record<string, unknown> | null;
  winPercent: {
    home: string;
    draw: string;
    away: string;
  };
  absences: unknown[];
  homePlayersStats: unknown[];
  awayPlayersStats: unknown[];
  standings: CompetitionsApiStandingDto | null | undefined;
  homeTeamId: string | null;
  awayTeamId: string | null;
  isLiveRefreshing: boolean;
};

type RawRecord = Record<string, unknown>;

type EventRow = {
  id: string;
  minute: string;
  label: string;
  detail: string;
  team: 'home' | 'away' | 'neutral';
  isNew: boolean;
};

type StatRow = {
  key: string;
  label: string;
  homeValue: string;
  awayValue: string;
  homePercent: number;
  awayPercent: number;
};

type TeamLineupData = {
  teamId: string;
  teamName: string;
  teamLogo: string;
  formation: string;
  coach: string;
  starters: Array<{
    id: string;
    name: string;
    number: string;
    pos: string;
    grid: string;
    rating: string;
    goals: string;
    assists: string;
    cards: string;
    change: string;
  }>;
  substitutes: Array<{
    id: string;
    name: string;
    number: string;
    rating: string;
    goals: string;
    assists: string;
    cards: string;
    change: string;
  }>;
  reserves: Array<{
    id: string;
    name: string;
    number: string;
    rating: string;
    goals: string;
    assists: string;
    cards: string;
    change: string;
  }>;
  absences: string[];
};

function toRecord(value: unknown): RawRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as RawRecord;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toId(value: unknown): string {
  const numericValue = toNumber(value);
  if (numericValue !== null) {
    return String(Math.trunc(numericValue));
  }

  return toText(value, '');
}

function getTeamSide(teamId: string, homeTeamId: string | null, awayTeamId: string | null): 'home' | 'away' | 'neutral' {
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

function formatDisplayStat(value: unknown): string {
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 26,
      gap: 12,
    },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 10,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    cardSubtitle: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    splitCol: {
      flex: 1,
      gap: 6,
    },
    metricLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    metricValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    badge: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}1C`,
      paddingHorizontal: 9,
      paddingVertical: 3,
      alignSelf: 'flex-start',
    },
    badgeText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    chipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.chipBorder,
      backgroundColor: colors.chipBackground,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}1F`,
    },
    chipText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    chipTextActive: {
      color: colors.primary,
    },
    probBarWrap: {
      gap: 6,
    },
    probBarRail: {
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.surfaceElevated,
      overflow: 'hidden',
    },
    probBarFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    eventRow: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 2,
    },
    eventRowNew: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}16`,
    },
    eventMinute: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    eventLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    eventDetail: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    statRow: {
      gap: 6,
    },
    statHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      flex: 1,
      textAlign: 'center',
    },
    statValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      minWidth: 44,
      textAlign: 'center',
    },
    statBarRail: {
      flexDirection: 'row',
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.surfaceElevated,
      overflow: 'hidden',
    },
    statBarHome: {
      backgroundColor: colors.primary,
      height: '100%',
    },
    statBarAway: {
      backgroundColor: `${colors.textMuted}A3`,
      height: '100%',
    },
    pitchCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#163423',
      padding: 10,
      gap: 8,
    },
    pitchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
    },
    playerChip: {
      minHeight: 30,
      flex: 1,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
      backgroundColor: 'rgba(0,0,0,0.28)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    playerChipText: {
      color: '#F3FFF8',
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
    },
    rosterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingVertical: 5,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rosterName: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
      flex: 1,
    },
    rosterMeta: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    splitDivider: {
      width: 1,
      alignSelf: 'stretch',
      backgroundColor: colors.border,
    },
    standingsWrap: {
      minHeight: 240,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    h2hItem: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 3,
    },
    h2hTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    h2hMeta: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    livePulse: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginRight: 8,
    },
    inlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    newsCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 6,
    },
    newsTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    newsText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
    },
    teamHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    teamLogo: {
      width: 22,
      height: 22,
    },
  });
}

function buildEvents(
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

function buildStatRows(statistics: unknown[]): StatRow[] {
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

function buildLineups(
  lineups: unknown[],
  absences: unknown[],
  homePlayersStats: unknown[],
  awayPlayersStats: unknown[],
): TeamLineupData[] {
  const absencesMap = new Map<string, string[]>();
  toArray(absences).forEach(item => {
    const rawItem = toRecord(item);
    const teamId = toId(rawItem?.teamId);
    const entries = toArray(rawItem?.response);

    const names = entries
      .map(entry => {
        const entryRecord = toRecord(entry);
        const player = toRecord(entryRecord?.player);
        return toText(player?.name);
      })
      .filter(Boolean);

    if (teamId) {
      absencesMap.set(teamId, names);
    }
  });

  const homeStatMap = mapPlayerStatById(homePlayersStats);
  const awayStatMap = mapPlayerStatById(awayPlayersStats);

  return toArray(lineups).map(teamLineup => {
    const lineup = toRecord(teamLineup);
    const team = toRecord(lineup?.team);
    const coach = toRecord(lineup?.coach);
    const teamId = toId(team?.id);
    const firstStarter = toRecord(toArray(lineup?.startXI)[0]);
    const firstStarterPlayer = toRecord(firstStarter?.player);
    const firstStarterId = toId(firstStarterPlayer?.id);
    const currentStatsMap =
      firstStarterId && homeStatMap.has(firstStarterId)
        ? homeStatMap
        : awayStatMap;

    const mapPlayer = (entry: unknown, index: number) => {
      const wrapper = toRecord(entry);
      const player = toRecord(wrapper?.player);
      const id = toId(player?.id) || `${teamId}-player-${index}`;
      const performance = currentStatsMap.get(id);
      const statsList = toArray(performance?.statistics);
      const stats = toRecord(statsList[0]);
      const games = toRecord(stats?.games);
      const goals = toRecord(stats?.goals);
      const cards = toRecord(stats?.cards);

      const inMinute = toNumber(toRecord(stats?.substitutes)?.in);
      const outMinute = toNumber(toRecord(stats?.substitutes)?.out);
      const changeLabel =
        inMinute !== null || outMinute !== null
          ? `${inMinute !== null ? `↗ ${inMinute}'` : ''}${outMinute !== null ? ` ↘ ${outMinute}'` : ''}`.trim()
          : '';

      return {
        id,
        name: toText(player?.name, 'Joueur'),
        number: toText(player?.number, '--'),
        pos: toText(player?.pos, ''),
        grid: toText(player?.grid, ''),
        rating: toText(games?.rating, '--'),
        goals: toText(goals?.total, '0'),
        assists: toText(goals?.assists, '0'),
        cards:
          toText(cards?.red, '0') !== '0'
            ? `R${toText(cards?.red, '0')}`
            : `J${toText(cards?.yellow, '0')}`,
        change: changeLabel,
      };
    };

    return {
      teamId,
      teamName: toText(team?.name, 'Équipe'),
      teamLogo: toText(team?.logo),
      formation: toText(lineup?.formation, 'N/A'),
      coach: toText(coach?.name, 'N/A'),
      starters: toArray(lineup?.startXI).map(mapPlayer),
      substitutes: toArray(lineup?.substitutes).map(mapPlayer),
      reserves: [],
      absences: absencesMap.get(teamId) ?? [],
    } satisfies TeamLineupData;
  });
}

function groupPlayersByPitchRows(players: TeamLineupData['starters']) {
  const grouped = new Map<string, TeamLineupData['starters']>();

  players.forEach(player => {
    const grid = player.grid.includes(':') ? player.grid.split(':')[0] : '0';
    const row = grid || '0';
    const current = grouped.get(row) ?? [];
    current.push(player);
    grouped.set(row, current);
  });

  return [...grouped.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([, rowPlayers]) => rowPlayers);
}

function buildH2HSummary(fixtures: unknown[], homeTeamId: string | null, awayTeamId: string | null) {
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;

  fixtures.forEach(item => {
    const fixture = toRecord(item);
    const teams = toRecord(fixture?.teams);
    const home = toRecord(teams?.home);
    const away = toRecord(teams?.away);
    const goals = toRecord(fixture?.goals);
    const homeGoals = toNumber(goals?.home);
    const awayGoals = toNumber(goals?.away);

    if (homeGoals === null || awayGoals === null) {
      return;
    }

    const homeId = toId(home?.id);
    const awayId = toId(away?.id);

    if (homeGoals === awayGoals) {
      draws += 1;
      return;
    }

    const winnerId = homeGoals > awayGoals ? homeId : awayId;
    if (winnerId && winnerId === homeTeamId) {
      homeWins += 1;
    } else if (winnerId && winnerId === awayTeamId) {
      awayWins += 1;
    }
  });

  return {
    homeWins,
    draws,
    awayWins,
  };
}

function buildStandingsData(
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

function ProbabilityCard({
  title,
  value,
  percent,
  styles,
}: {
  title: string;
  value: string;
  percent: number;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.probBarWrap}>
      <View style={styles.row}>
        <Text style={styles.metricLabel}>{title}</Text>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
      <View style={styles.probBarRail}>
        <View style={[styles.probBarFill, { width: `${Math.max(0, Math.min(100, percent))}%` }]} />
      </View>
    </View>
  );
}

export function MatchDetailsTabContent({
  activeTab,
  lifecycleState,
  fixture,
  events,
  statistics,
  lineups,
  h2h,
  predictions,
  winPercent,
  absences,
  homePlayersStats,
  awayPlayersStats,
  standings,
  homeTeamId,
  awayTeamId,
  isLiveRefreshing,
}: MatchDetailsTabContentProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [h2hCompetitionFilter, setH2hCompetitionFilter] = useState<string>('all');
  const [statsPeriodFilter, setStatsPeriodFilter] = useState<'all' | 'first' | 'second'>('all');

  const eventRows = useMemo(
    () => buildEvents(events, homeTeamId, awayTeamId),
    [awayTeamId, events, homeTeamId],
  );
  const statRows = useMemo(() => buildStatRows(statistics), [statistics]);
  const lineupTeams = useMemo(
    () => buildLineups(lineups, absences, homePlayersStats, awayPlayersStats),
    [absences, awayPlayersStats, homePlayersStats, lineups],
  );
  const h2hSummary = useMemo(
    () => buildH2HSummary(h2h, homeTeamId, awayTeamId),
    [awayTeamId, h2h, homeTeamId],
  );

  const standingsData = useMemo(
    () => buildStandingsData(standings, homeTeamId, awayTeamId, lifecycleState, fixture),
    [awayTeamId, fixture, homeTeamId, lifecycleState, standings],
  );
  const insightText = useMemo(() => {
    const predictionsBlock = toRecord(predictions?.predictions);
    const advice = toText(predictionsBlock?.advice);
    if (advice) {
      return advice;
    }

    return t('matchDetails.primary.insightFallback');
  }, [predictions, t]);

  const h2hCompetitions = useMemo(() => {
    const set = new Set<string>();
    toArray(h2h).forEach(item => {
      const league = toRecord(toRecord(item)?.league);
      const name = toText(league?.name);
      if (name) {
        set.add(name);
      }
    });
    return ['all', ...Array.from(set)];
  }, [h2h]);

  const filteredH2hRows = useMemo(() => {
    return toArray(h2h).filter(item => {
      if (h2hCompetitionFilter === 'all') {
        return true;
      }
      const league = toRecord(toRecord(item)?.league);
      const name = toText(league?.name);
      return name === h2hCompetitionFilter;
    });
  }, [h2h, h2hCompetitionFilter]);

  if (!fixture) {
    return (
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.emptyText}>{t('matchDetails.states.error')}</Text>
        </View>
      </View>
    );
  }

  const venueName = toText(fixture.fixture.venue.name, t('matchDetails.values.unavailable'));
  const venueCity = toText(fixture.fixture.venue.city, t('matchDetails.values.unavailable'));
  const competitionName = fixture.league.name;
  const matchScore =
    typeof fixture.goals.home === 'number' && typeof fixture.goals.away === 'number'
      ? `${fixture.goals.home}-${fixture.goals.away}`
      : '--';

  const homeTeamName = fixture.teams.home.name;
  const awayTeamName = fixture.teams.away.name;

  const homePct = Number.parseFloat(winPercent.home.replace('%', '')) || 0;
  const drawPct = Number.parseFloat(winPercent.draw.replace('%', '')) || 0;
  const awayPct = Number.parseFloat(winPercent.away.replace('%', '')) || 0;

  if (activeTab === 'primary') {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {lifecycleState === 'pre_match' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('matchDetails.primary.probabilityTitle')}</Text>
              <ProbabilityCard title={homeTeamName} value={winPercent.home} percent={homePct} styles={styles} />
              <ProbabilityCard title={t('matchDetails.primary.draw')} value={winPercent.draw} percent={drawPct} styles={styles} />
              <ProbabilityCard title={awayTeamName} value={winPercent.away} percent={awayPct} styles={styles} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('matchDetails.primary.conditionsTitle')}</Text>
              <View style={styles.row}>
                <View style={styles.splitCol}>
                  <Text style={styles.metricLabel}>{t('matchDetails.labels.venue')}</Text>
                  <Text style={styles.metricValue}>{venueName}</Text>
                </View>
                <View style={styles.splitCol}>
                  <Text style={styles.metricLabel}>{t('matchDetails.labels.city')}</Text>
                  <Text style={styles.metricValue}>{venueCity}</Text>
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.splitCol}>
                  <Text style={styles.metricLabel}>{t('matchDetails.labels.capacity')}</Text>
                  <Text style={styles.metricValue}>{t('matchDetails.values.unavailable')}</Text>
                </View>
                <View style={styles.splitCol}>
                  <Text style={styles.metricLabel}>{t('matchDetails.labels.surface')}</Text>
                  <Text style={styles.metricValue}>{t('matchDetails.values.unavailable')}</Text>
                </View>
              </View>
              <View style={styles.newsCard}>
                <Text style={styles.newsTitle}>{t('matchDetails.labels.weather')}</Text>
                <Text style={styles.newsText}>{t('matchDetails.values.weatherPlaceholder')}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('matchDetails.primary.competitionStatsTitle')}</Text>
              <Text style={styles.cardSubtitle}>{competitionName}</Text>
              <View style={styles.row}>
                <View style={styles.splitCol}>
                  <Text style={styles.metricLabel}>{homeTeamName}</Text>
                  <Text style={styles.metricValue}>{t('matchDetails.values.rankUnknown')}</Text>
                </View>
                <View style={styles.splitCol}>
                  <Text style={styles.metricLabel}>{awayTeamName}</Text>
                  <Text style={styles.metricValue}>{t('matchDetails.values.rankUnknown')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('matchDetails.primary.insightTitle')}</Text>
              <Text style={styles.newsText}>{insightText}</Text>
            </View>

            <View style={styles.newsCard}>
              <Text style={styles.newsTitle}>{t('matchDetails.primary.newsTitle')}</Text>
              <Text style={styles.newsText}>{t('matchDetails.primary.newsFallback')}</Text>
            </View>
          </>
        ) : null}

        {lifecycleState === 'live' ? (
          <>
            <View style={styles.card}>
              <View style={styles.inlineRow}>
                <View style={styles.livePulse} />
                <Text style={styles.cardTitle}>{t('matchDetails.primary.liveSummaryTitle')}</Text>
              </View>
              <Text style={styles.cardSubtitle}>{t('matchDetails.primary.liveAutoUpdate')}</Text>
              {isLiveRefreshing ? (
                <View style={styles.badge}><Text style={styles.badgeText}>{t('matchDetails.live.updating')}</Text></View>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('matchDetails.tabs.stats')}</Text>
              {statRows.length === 0 ? <Text style={styles.emptyText}>{t('matchDetails.values.unavailable')}</Text> : null}
              {statRows.slice(0, 6).map(row => (
                <View key={row.key} style={styles.statRow}>
                  <View style={styles.statHeaderRow}>
                    <Text style={styles.statValue}>{row.homeValue}</Text>
                    <Text style={styles.statLabel}>{row.label}</Text>
                    <Text style={styles.statValue}>{row.awayValue}</Text>
                  </View>
                  <View style={styles.statBarRail}>
                    <View style={[styles.statBarHome, { width: `${row.homePercent}%` }]} />
                    <View style={[styles.statBarAway, { width: `${row.awayPercent}%` }]} />
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('matchDetails.primary.keyMomentsTitle')}</Text>
              {eventRows.length === 0 ? <Text style={styles.emptyText}>{t('matchDetails.values.unavailable')}</Text> : null}
              {eventRows.slice(0, 6).map(event => (
                <View key={event.id} style={[styles.eventRow, event.isNew ? styles.eventRowNew : null]}>
                  <Text style={styles.eventMinute}>{event.minute}</Text>
                  <Text style={styles.eventLabel}>{event.label}</Text>
                  {event.detail ? <Text style={styles.eventDetail}>{event.detail}</Text> : null}
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('matchDetails.primary.conditionsTitle')}</Text>
              <Text style={styles.newsText}>{venueName} · {venueCity}</Text>
              <Text style={styles.newsText}>{t('matchDetails.values.weatherPlaceholder')}</Text>
            </View>
          </>
        ) : null}

        {lifecycleState === 'finished' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('matchDetails.primary.finalSummaryTitle')}</Text>
              <Text style={styles.metricValue}>{homeTeamName} {matchScore} {awayTeamName}</Text>
              <Text style={styles.newsText}>{t('matchDetails.primary.playerOfMatchFallback')}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('matchDetails.tabs.stats')}</Text>
              {statRows.slice(0, 8).map(row => (
                <View key={row.key} style={styles.statRow}>
                  <View style={styles.statHeaderRow}>
                    <Text style={styles.statValue}>{row.homeValue}</Text>
                    <Text style={styles.statLabel}>{row.label}</Text>
                    <Text style={styles.statValue}>{row.awayValue}</Text>
                  </View>
                  <View style={styles.statBarRail}>
                    <View style={[styles.statBarHome, { width: `${row.homePercent}%` }]} />
                    <View style={[styles.statBarAway, { width: `${row.awayPercent}%` }]} />
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('matchDetails.primary.keyMomentsTitle')}</Text>
              {eventRows.map(event => (
                <View key={event.id} style={styles.eventRow}>
                  <Text style={styles.eventMinute}>{event.minute}</Text>
                  <Text style={styles.eventLabel}>{event.label}</Text>
                  {event.detail ? <Text style={styles.eventDetail}>{event.detail}</Text> : null}
                </View>
              ))}
            </View>

            <View style={styles.newsCard}>
              <Text style={styles.newsTitle}>{t('matchDetails.primary.newsTitle')}</Text>
              <Text style={styles.newsText}>{t('matchDetails.primary.postNewsFallback')}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    );
  }

  if (activeTab === 'timeline') {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('matchDetails.tabs.timeline')}</Text>
          {eventRows.length === 0 ? (
            <Text style={styles.emptyText}>{t('matchDetails.values.unavailable')}</Text>
          ) : null}
          {eventRows.map(event => (
            <Pressable key={event.id} style={[styles.eventRow, lifecycleState === 'live' && event.isNew ? styles.eventRowNew : null]}>
              <Text style={styles.eventMinute}>{event.minute}</Text>
              <Text style={styles.eventLabel}>{event.label}</Text>
              {event.detail ? <Text style={styles.eventDetail}>{event.detail}</Text> : null}
              <Text style={styles.eventDetail}>{t('matchDetails.timeline.tapHint')}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (activeTab === 'lineups') {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {lineupTeams.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('matchDetails.tabs.lineups')}</Text>
            <Text style={styles.emptyText}>{t('matchDetails.values.unavailable')}</Text>
          </View>
        ) : null}

        {lineupTeams.map(team => {
          const pitchRows = groupPlayersByPitchRows(team.starters);

          return (
            <View key={team.teamId || team.teamName} style={styles.card}>
              <View style={styles.teamHeaderRow}>
                {team.teamLogo ? (
                  <AppImage source={{ uri: team.teamLogo }} style={styles.teamLogo} resizeMode="contain" />
                ) : null}
                <Text style={styles.cardTitle}>{team.teamName}</Text>
              </View>
              <Text style={styles.cardSubtitle}>{t('matchDetails.lineups.formation')}: {team.formation}</Text>
              <Text style={styles.cardSubtitle}>{t('matchDetails.lineups.coach')}: {team.coach}</Text>

              <View style={styles.pitchCard}>
                {pitchRows.map((row, index) => (
                  <View key={`${team.teamId}-pitch-row-${index}`} style={styles.pitchRow}>
                    {row.map(player => (
                      <View key={player.id} style={styles.playerChip}>
                        <Text style={styles.playerChipText} numberOfLines={1}>{player.number} {player.name}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>

              <Text style={styles.metricLabel}>{t('matchDetails.lineups.substitutes')}</Text>
              {team.substitutes.map(player => (
                <View key={`${team.teamId}-sub-${player.id}`} style={styles.rosterRow}>
                  <Text style={styles.rosterName} numberOfLines={1}>{player.number} {player.name}</Text>
                  <Text style={styles.rosterMeta}>★ {player.rating} · G {player.goals} · A {player.assists} · {player.cards}</Text>
                </View>
              ))}

              <Text style={styles.metricLabel}>{t('matchDetails.lineups.reserves')}</Text>
              {team.reserves.length > 0 ? (
                team.reserves.map(player => (
                  <View key={`${team.teamId}-reserve-${player.id}`} style={styles.rosterRow}>
                    <Text style={styles.rosterName} numberOfLines={1}>{player.number} {player.name}</Text>
                    <Text style={styles.rosterMeta}>★ {player.rating} · G {player.goals} · A {player.assists} · {player.cards}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.newsText}>{t('matchDetails.values.unavailable')}</Text>
              )}

              <Text style={styles.metricLabel}>{t('matchDetails.lineups.absences')}</Text>
              {team.absences.length > 0 ? (
                team.absences.map(name => (
                  <Text key={`${team.teamId}-absence-${name}`} style={styles.newsText}>• {name}</Text>
                ))
              ) : (
                <Text style={styles.newsText}>{t('matchDetails.values.unavailable')}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  }

  if (activeTab === 'standings') {
    return (
      <View style={styles.standingsWrap}>
        <TeamStandingsTab
          data={standingsData}
          isLoading={false}
          isError={false}
          hasFetched
          onRetry={() => undefined}
        />
      </View>
    );
  }

  if (activeTab === 'stats') {
    const visibleStats =
      statsPeriodFilter === 'all'
        ? statRows
        : statRows.filter(row => {
            const normalized = row.label.toLowerCase();
            if (statsPeriodFilter === 'first') {
              return !normalized.includes('2nd');
            }
            return !normalized.includes('1st');
          });

    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('matchDetails.tabs.stats')}</Text>
          <View style={styles.chipRow}>
            {(['all', 'first', 'second'] as const).map(period => {
              const isActive = period === statsPeriodFilter;
              const label =
                period === 'all'
                  ? t('matchDetails.stats.period.all')
                  : period === 'first'
                    ? t('matchDetails.stats.period.firstHalf')
                    : t('matchDetails.stats.period.secondHalf');

              return (
                <Pressable
                  key={period}
                  style={[styles.chip, isActive ? styles.chipActive : null]}
                  onPress={() => setStatsPeriodFilter(period)}
                >
                  <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {visibleStats.length === 0 ? <Text style={styles.emptyText}>{t('matchDetails.values.unavailable')}</Text> : null}
          {visibleStats.map(row => (
            <View key={row.key} style={styles.statRow}>
              <View style={styles.statHeaderRow}>
                <Text style={styles.statValue}>{row.homeValue}</Text>
                <Text style={styles.statLabel}>{row.label}</Text>
                <Text style={styles.statValue}>{row.awayValue}</Text>
              </View>
              <View style={styles.statBarRail}>
                <View style={[styles.statBarHome, { width: `${row.homePercent}%` }]} />
                <View style={[styles.statBarAway, { width: `${row.awayPercent}%` }]} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('matchDetails.stats.shotMapTitle')}</Text>
          <Text style={styles.newsText}>{t('matchDetails.stats.shotMapPlaceholder')}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.tabs.h2h')}</Text>
        <View style={styles.row}>
          <View style={styles.splitCol}>
            <Text style={styles.metricLabel}>{homeTeamName}</Text>
            <Text style={styles.metricValue}>{h2hSummary.homeWins}</Text>
          </View>
          <View style={styles.splitCol}>
            <Text style={styles.metricLabel}>{t('matchDetails.h2h.draws')}</Text>
            <Text style={styles.metricValue}>{h2hSummary.draws}</Text>
          </View>
          <View style={styles.splitCol}>
            <Text style={styles.metricLabel}>{awayTeamName}</Text>
            <Text style={styles.metricValue}>{h2hSummary.awayWins}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.h2h.filtersTitle')}</Text>
        <View style={styles.chipRow}>
          {h2hCompetitions.map(filter => (
            <Pressable
              key={filter}
              style={[styles.chip, h2hCompetitionFilter === filter ? styles.chipActive : null]}
              onPress={() => setH2hCompetitionFilter(filter)}
            >
              <Text
                style={[
                  styles.chipText,
                  h2hCompetitionFilter === filter ? styles.chipTextActive : null,
                ]}
              >
                {filter === 'all' ? t('matchDetails.h2h.allCompetitions') : filter}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.h2h.historyTitle')}</Text>
        {filteredH2hRows.length === 0 ? <Text style={styles.emptyText}>{t('matchDetails.values.unavailable')}</Text> : null}
        {filteredH2hRows.map((item, index) => {
          const row = toRecord(item);
          const league = toRecord(row?.league);
          const teams = toRecord(row?.teams);
          const home = toRecord(teams?.home);
          const away = toRecord(teams?.away);
          const goals = toRecord(row?.goals);
          const fixtureRow = toRecord(row?.fixture);

          const score = `${formatDisplayStat(goals?.home)}-${formatDisplayStat(goals?.away)}`;
          return (
            <View key={`h2h-${index}`} style={styles.h2hItem}>
              <Text style={styles.h2hTitle}>
                {toText(home?.name, 'Home')} {score} {toText(away?.name, 'Away')}
              </Text>
              <Text style={styles.h2hMeta}>{toText(league?.name, t('matchDetails.values.unavailable'))}</Text>
              <Text style={styles.h2hMeta}>{toText(fixtureRow?.date, t('matchDetails.values.unavailable'))}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.h2h.comparisonTitle')}</Text>
        <View style={styles.row}>
          <View style={styles.splitCol}>
            <Text style={styles.metricLabel}>{homeTeamName}</Text>
            <Text style={styles.metricValue}>{t('matchDetails.values.unavailable')}</Text>
          </View>
          <View style={styles.splitDivider} />
          <View style={styles.splitCol}>
            <Text style={styles.metricLabel}>{awayTeamName}</Text>
            <Text style={styles.metricValue}>{t('matchDetails.values.unavailable')}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
