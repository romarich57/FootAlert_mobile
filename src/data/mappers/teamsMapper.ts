import type {
  TeamApiFixtureDto,
  TeamApiLeagueDto,
  TeamApiPlayerDto,
  TeamApiSquadDto,
  TeamApiStandingsDto,
  TeamApiStatisticsDto,
  TeamApiTeamDetailsDto,
  TeamApiTrophyDto,
  TeamApiTransferDto,
  TeamCompetitionOption,
  TeamFormEntry,
  TeamIdentity,
  TeamMatchItem,
  TeamMatchesData,
  TeamMatchStatus,
  TeamSelection,
  TeamSquadData,
  TeamSquadPlayer,
  TeamSquadRole,
  TeamStandingsData,
  TeamStandingRow,
  TeamStatsData,
  TeamTopPlayer,
  TeamTrophiesData,
  TeamTrophyGroup,
  TeamTransferDirection,
  TeamTransferItem,
  TeamTransfersData,
} from '@ui/features/teams/types/teams.types';

const LIVE_STATUSES = new Set(['1H', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);
const UPCOMING_STATUSES = new Set(['TBD', 'NS']);
type TeamPlayerStatistic = NonNullable<TeamApiPlayerDto['statistics']>[number];
type TeamPlayerStatContext = {
  season?: number | null;
  teamId?: string | null;
  leagueId?: string | null;
};

function toText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toId(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function toParsedFloat(value: string | null | undefined): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function resolvePrimaryTeamPlayerStatistic(
  statistics: TeamApiPlayerDto['statistics'],
  context: TeamPlayerStatContext,
): TeamPlayerStatistic | undefined {
  if (!statistics || statistics.length === 0) {
    return undefined;
  }

  const normalizedTeamId = toId(context.teamId);
  const normalizedLeagueId = toId(context.leagueId);
  const season = typeof context.season === 'number' ? context.season : null;

  const hasSeason = season !== null;
  const hasTeam = Boolean(normalizedTeamId);
  const hasLeague = Boolean(normalizedLeagueId);

  const filterBy = (
    matcher: (stat: TeamPlayerStatistic) => boolean,
  ): TeamPlayerStatistic[] => statistics.filter(matcher);

  const getCandidates = (): TeamPlayerStatistic[] => {
    if (hasSeason && hasTeam && hasLeague) {
      const strict = filterBy(
        stat =>
          stat.league?.season === season &&
          toId(stat.team?.id) === normalizedTeamId &&
          toId(stat.league?.id) === normalizedLeagueId,
      );
      if (strict.length > 0) return strict;
    }

    if (hasSeason && hasTeam) {
      const bySeasonAndTeam = filterBy(
        stat =>
          stat.league?.season === season &&
          toId(stat.team?.id) === normalizedTeamId,
      );
      if (bySeasonAndTeam.length > 0) return bySeasonAndTeam;
    }

    if (hasSeason && hasLeague) {
      const bySeasonAndLeague = filterBy(
        stat =>
          stat.league?.season === season &&
          toId(stat.league?.id) === normalizedLeagueId,
      );
      if (bySeasonAndLeague.length > 0) return bySeasonAndLeague;
    }

    if (hasTeam && hasLeague) {
      const byTeamAndLeague = filterBy(
        stat =>
          toId(stat.team?.id) === normalizedTeamId &&
          toId(stat.league?.id) === normalizedLeagueId,
      );
      if (byTeamAndLeague.length > 0) return byTeamAndLeague;
    }

    if (hasSeason) {
      const bySeason = filterBy(stat => stat.league?.season === season);
      if (bySeason.length > 0) return bySeason;
    }

    if (hasTeam) {
      const byTeam = filterBy(stat => toId(stat.team?.id) === normalizedTeamId);
      if (byTeam.length > 0) return byTeam;
    }

    if (hasLeague) {
      const byLeague = filterBy(stat => toId(stat.league?.id) === normalizedLeagueId);
      if (byLeague.length > 0) return byLeague;
    }

    return statistics;
  };

  const candidates = getCandidates();

  return [...candidates].sort((a, b) => {
    const aMinutes = toNumber(a.games?.minutes) ?? 0;
    const bMinutes = toNumber(b.games?.minutes) ?? 0;
    if (bMinutes !== aMinutes) {
      return bMinutes - aMinutes;
    }

    const aAppearances = toNumber(a.games?.appearences) ?? 0;
    const bAppearances = toNumber(b.games?.appearences) ?? 0;
    if (bAppearances !== aAppearances) {
      return bAppearances - aAppearances;
    }

    const aGoals = toNumber(a.goals?.total) ?? 0;
    const bGoals = toNumber(b.goals?.total) ?? 0;
    if (bGoals !== aGoals) {
      return bGoals - aGoals;
    }

    const aAssists = toNumber(a.goals?.assists) ?? 0;
    const bAssists = toNumber(b.goals?.assists) ?? 0;
    if (bAssists !== aAssists) {
      return bAssists - aAssists;
    }

    const aRating = toParsedFloat(a.games?.rating) ?? 0;
    const bRating = toParsedFloat(b.games?.rating) ?? 0;
    return bRating - aRating;
  })[0];
}

export function classifyTeamMatchStatus(shortStatus: string | null | undefined): TeamMatchStatus {
  const normalizedStatus = toText(shortStatus)?.toUpperCase() ?? '';

  if (LIVE_STATUSES.has(normalizedStatus)) {
    return 'live';
  }

  if (UPCOMING_STATUSES.has(normalizedStatus)) {
    return 'upcoming';
  }

  return 'finished';
}

export function mapTeamDetails(dto: TeamApiTeamDetailsDto | null, teamId: string): TeamIdentity {
  return {
    id: teamId,
    name: toText(dto?.team?.name),
    logo: toText(dto?.team?.logo),
    country: toText(dto?.team?.country),
    founded: toNumber(dto?.team?.founded),
    venueName: toText(dto?.venue?.name),
    venueCity: toText(dto?.venue?.city),
    venueCapacity: toNumber(dto?.venue?.capacity),
    venueImage: toText(dto?.venue?.image),
  };
}

function sortSeasonsDesc(seasons: number[]): number[] {
  return [...seasons].sort((first, second) => second - first);
}

export function mapTeamLeaguesToCompetitionOptions(
  payload: TeamApiLeagueDto[],
): TeamCompetitionOption[] {
  const mapped = payload
    .map<TeamCompetitionOption | null>(item => {
      const leagueId = toId(item.league?.id);
      if (!leagueId) {
        return null;
      }

      const seasons = (item.seasons ?? [])
        .map(season => toNumber(season.year))
        .filter((year): year is number => typeof year === 'number');

      const currentSeason =
        item.seasons?.find(season => season.current === true)?.year ?? null;

      return {
        leagueId,
        leagueName: toText(item.league?.name),
        leagueLogo: toText(item.league?.logo),
        type: toText(item.league?.type),
        country: toText(item.country?.name),
        seasons: sortSeasonsDesc(Array.from(new Set(seasons))),
        currentSeason: toNumber(currentSeason),
      };
    })
    .filter((item): item is TeamCompetitionOption => item !== null)
    .sort((first, second) => {
      const firstName = first.leagueName ?? '';
      const secondName = second.leagueName ?? '';
      return firstName.localeCompare(secondName);
    });

  return mapped;
}

export function resolveDefaultTeamSelection(
  options: TeamCompetitionOption[],
): TeamSelection {
  const withCurrentSeason = options.find(
    option => typeof option.currentSeason === 'number',
  );

  if (withCurrentSeason) {
    return {
      leagueId: withCurrentSeason.leagueId,
      season: withCurrentSeason.currentSeason,
    };
  }

  const withRecentSeason = options.find(option => option.seasons.length > 0);

  if (withRecentSeason) {
    return {
      leagueId: withRecentSeason.leagueId,
      season: withRecentSeason.seasons[0] ?? null,
    };
  }

  return {
    leagueId: null,
    season: null,
  };
}

function toStatusLabel(dto: TeamApiFixtureDto): string | null {
  return toText(dto.fixture?.status?.long) ?? toText(dto.fixture?.status?.short);
}

export function mapFixtureToTeamMatch(dto: TeamApiFixtureDto): TeamMatchItem {
  return {
    fixtureId: toId(dto.fixture?.id) ?? '',
    leagueId: toId(dto.league?.id),
    leagueName: toText(dto.league?.name),
    leagueLogo: toText(dto.league?.logo),
    date: toText(dto.fixture?.date),
    round: toText(dto.league?.round),
    venue: toText(dto.fixture?.venue?.name),
    status: classifyTeamMatchStatus(dto.fixture?.status?.short),
    statusLabel: toStatusLabel(dto),
    minute: toNumber(dto.fixture?.status?.elapsed),
    homeTeamId: toId(dto.teams?.home?.id),
    homeTeamName: toText(dto.teams?.home?.name),
    homeTeamLogo: toText(dto.teams?.home?.logo),
    awayTeamId: toId(dto.teams?.away?.id),
    awayTeamName: toText(dto.teams?.away?.name),
    awayTeamLogo: toText(dto.teams?.away?.logo),
    homeGoals: toNumber(dto.goals?.home),
    awayGoals: toNumber(dto.goals?.away),
  };
}

function toSortableTimestamp(value: string | null): number {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function sortMatchesByDate(items: TeamMatchItem[]): TeamMatchItem[] {
  return [...items].sort((first, second) => {
    return toSortableTimestamp(first.date) - toSortableTimestamp(second.date);
  });
}

export function mapFixturesToTeamMatches(payload: TeamApiFixtureDto[]): TeamMatchesData {
  const all = sortMatchesByDate(
    payload
      .map(mapFixtureToTeamMatch)
      .filter(match => match.fixtureId.length > 0),
  );

  return {
    all,
    upcoming: all.filter(match => match.status === 'upcoming'),
    live: all.filter(match => match.status === 'live'),
    past: all
      .filter(match => match.status === 'finished')
      .sort((first, second) => toSortableTimestamp(second.date) - toSortableTimestamp(first.date)),
  };
}

function resolveFormResult(
  match: TeamMatchItem,
  teamId: string,
): TeamFormEntry['result'] {
  const homeTeamId = match.homeTeamId;
  const awayTeamId = match.awayTeamId;

  if (!homeTeamId || !awayTeamId || (homeTeamId !== teamId && awayTeamId !== teamId)) {
    return '';
  }

  if (match.homeGoals === null || match.awayGoals === null) {
    return '';
  }

  const goalDelta = match.homeGoals - match.awayGoals;
  if (goalDelta === 0) {
    return 'D';
  }

  const isHome = homeTeamId === teamId;
  const hasWon = isHome ? goalDelta > 0 : goalDelta < 0;
  return hasWon ? 'W' : 'L';
}

export function mapRecentTeamForm(
  matches: TeamMatchItem[],
  teamId: string,
  limit = 5,
): TeamFormEntry[] {
  return matches
    .filter(match => match.status === 'finished')
    .sort((first, second) => toSortableTimestamp(second.date) - toSortableTimestamp(first.date))
    .slice(0, limit)
    .map(match => {
      const isHome = match.homeTeamId === teamId;

      return {
        fixtureId: match.fixtureId,
        result: resolveFormResult(match, teamId),
        score:
          match.homeGoals === null || match.awayGoals === null
            ? null
            : `${match.homeGoals}-${match.awayGoals}`,
        opponentName: isHome ? match.awayTeamName : match.homeTeamName,
        opponentLogo: isHome ? match.awayTeamLogo : match.homeTeamLogo,
      };
    });
}

export function mapStandingsToTeamData(
  payload: TeamApiStandingsDto | null,
  teamId: string,
): TeamStandingsData {
  const groups = (payload?.league?.standings ?? []).map(standingGroup => {
    const firstRowGroupName = toText(standingGroup[0]?.group);

    const rows = standingGroup.map<TeamStandingRow>(row => {
      const rowTeamId = toId(row.team?.id);

      return {
        rank: toNumber(row.rank),
        teamId: rowTeamId,
        teamName: toText(row.team?.name),
        teamLogo: toText(row.team?.logo),
        played: toNumber(row.all?.played),
        goalDiff: toNumber(row.goalsDiff),
        points: toNumber(row.points),
        isTargetTeam: rowTeamId === teamId,
        form: toText(row.form),
        all: {
          played: toNumber(row.all?.played),
          win: toNumber(row.all?.win),
          draw: toNumber(row.all?.draw),
          lose: toNumber(row.all?.lose),
          goalsFor: toNumber(row.all?.goals?.for),
          goalsAgainst: toNumber(row.all?.goals?.against),
        },
        home: {
          played: toNumber(row.home?.played),
          win: toNumber(row.home?.win),
          draw: toNumber(row.home?.draw),
          lose: toNumber(row.home?.lose),
          goalsFor: toNumber(row.home?.goals?.for),
          goalsAgainst: toNumber(row.home?.goals?.against),
        },
        away: {
          played: toNumber(row.away?.played),
          win: toNumber(row.away?.win),
          draw: toNumber(row.away?.draw),
          lose: toNumber(row.away?.lose),
          goalsFor: toNumber(row.away?.goals?.for),
          goalsAgainst: toNumber(row.away?.goals?.against),
        },
      };
    });

    return {
      groupName: firstRowGroupName,
      rows,
    };
  });

  return {
    groups,
  };
}

export function findTeamStandingRow(
  standings: TeamStandingsData,
): TeamStandingRow | null {
  for (const group of standings.groups) {
    const row = group.rows.find(item => item.isTargetTeam);
    if (row) {
      return row;
    }
  }

  return null;
}

function mapGoalMinuteBreakdown(payload: TeamApiStatisticsDto): TeamStatsData['goalBreakdown'] {
  const goalMinutes = payload.goals?.for?.minute;
  const slots = ['0-15', '16-30', '31-45', '46-60', '61-75', '76-90', '91-105', '106-120'];

  return slots.map(slot => ({
    key: slot,
    label: slot,
    value: toNumber(goalMinutes?.[slot]?.total),
  }));
}

export function mapPlayersToTopPlayers(
  payload: TeamApiPlayerDto[],
  limit = 8,
  context: TeamPlayerStatContext = {},
): TeamTopPlayer[] {
  const mapped = payload
    .map<TeamTopPlayer | null>(item => {
      const playerId = toId(item.player?.id);
      if (!playerId) {
        return null;
      }

      const stat = resolvePrimaryTeamPlayerStatistic(item.statistics, context);
      return {
        playerId,
        name: toText(item.player?.name),
        photo: toText(item.player?.photo),
        position: toText(stat?.games?.position),
        goals: toNumber(stat?.goals?.total),
        assists: toNumber(stat?.goals?.assists),
        rating: toParsedFloat(stat?.games?.rating),
      };
    })
    .filter((item): item is TeamTopPlayer => item !== null)
    .sort((first, second) => {
      const firstScore = (first.goals ?? 0) * 3 + (first.assists ?? 0) * 2 + (first.rating ?? 0);
      const secondScore = (second.goals ?? 0) * 3 + (second.assists ?? 0) * 2 + (second.rating ?? 0);
      return secondScore - firstScore;
    });

  return mapped.slice(0, limit);
}

export function mapTeamStatisticsToStats(
  payload: TeamApiStatisticsDto | null,
  standings: TeamStandingsData,
  topPlayers: TeamTopPlayer[],
): TeamStatsData {
  const standingRow = findTeamStandingRow(standings);

  return {
    rank: standingRow?.rank ?? null,
    points: standingRow?.points ?? null,
    played: toNumber(payload?.fixtures?.played?.total),
    wins: toNumber(payload?.fixtures?.wins?.total),
    draws: toNumber(payload?.fixtures?.draws?.total),
    losses: toNumber(payload?.fixtures?.loses?.total),
    goalsFor: toNumber(payload?.goals?.for?.total?.total),
    goalsAgainst: toNumber(payload?.goals?.against?.total?.total),
    homePlayed: toNumber(payload?.fixtures?.played?.home),
    homeWins: toNumber(payload?.fixtures?.wins?.home),
    homeDraws: toNumber(payload?.fixtures?.draws?.home),
    homeLosses: toNumber(payload?.fixtures?.loses?.home),
    awayPlayed: toNumber(payload?.fixtures?.played?.away),
    awayWins: toNumber(payload?.fixtures?.wins?.away),
    awayDraws: toNumber(payload?.fixtures?.draws?.away),
    awayLosses: toNumber(payload?.fixtures?.loses?.away),
    expectedGoalsFor: toParsedFloat(payload?.goals?.for?.average?.total),
    goalBreakdown: payload ? mapGoalMinuteBreakdown(payload) : [],
    topPlayers,
  };
}

function isDateInSeason(dateIso: string | null, season: number | null): boolean {
  if (!dateIso || season === null) {
    return true;
  }

  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) {
    return true;
  }

  const seasonStart = new Date(Date.UTC(season, 6, 1, 0, 0, 0));
  const seasonEnd = new Date(Date.UTC(season + 1, 5, 30, 23, 59, 59));

  return parsed >= seasonStart && parsed <= seasonEnd;
}

function mapTransferRole(position: string | null): TeamSquadRole {
  const normalized = (position ?? '').toLowerCase();
  if (normalized.includes('goal')) {
    return 'goalkeepers';
  }

  if (normalized.includes('def')) {
    return 'defenders';
  }

  if (normalized.includes('mid')) {
    return 'midfielders';
  }

  if (normalized.includes('att') || normalized.includes('forw') || normalized.includes('strik')) {
    return 'attackers';
  }

  return 'other';
}

export function mapTransfersToTeamTransfers(
  payload: TeamApiTransferDto[],
  teamId: string,
  season: number | null,
): TeamTransfersData {
  const arrivals: TeamTransferItem[] = [];
  const departures: TeamTransferItem[] = [];
  const arrivalKeys = new Set<string>();
  const departureKeys = new Set<string>();

  const normalizeKeyPart = (value: string | null): string => {
    return (value ?? '').trim().toLowerCase();
  };

  const buildTransferDedupKey = (direction: TeamTransferDirection, item: Omit<TeamTransferItem, 'id'>): string => {
    return [
      direction,
      normalizeKeyPart(item.playerId),
      normalizeKeyPart(item.playerName),
      normalizeKeyPart(item.date),
      normalizeKeyPart(item.type),
      normalizeKeyPart(item.fromTeamId),
      normalizeKeyPart(item.fromTeamName),
      normalizeKeyPart(item.toTeamId),
      normalizeKeyPart(item.toTeamName),
    ].join('|');
  };

  payload.forEach(transferBlock => {
    const playerId = toId(transferBlock.player?.id);
    const playerName = toText(transferBlock.player?.name);

    (transferBlock.transfers ?? []).forEach(transfer => {
      const transferDate = toText(transfer.date);
      if (!isDateInSeason(transferDate, season)) {
        return;
      }

      const teamInId = toId(transfer.teams?.in?.id);
      const teamOutId = toId(transfer.teams?.out?.id);
      const commonPayload = {
        playerId,
        playerName,
        playerPhoto: playerId ? `https://media.api-sports.io/football/players/${playerId}.png` : null,
        position: null,
        date: transferDate,
        type: toText(transfer.type),
        amount: null,
        fromTeamId: teamOutId,
        fromTeamName: toText(transfer.teams?.out?.name),
        fromTeamLogo: toText(transfer.teams?.out?.logo),
        toTeamId: teamInId,
        toTeamName: toText(transfer.teams?.in?.name),
        toTeamLogo: toText(transfer.teams?.in?.logo),
      };

      if (teamInId === teamId) {
        const arrivalItem: Omit<TeamTransferItem, 'id'> = {
          direction: 'arrival',
          ...commonPayload,
        };
        const dedupKey = buildTransferDedupKey('arrival', arrivalItem);
        if (!arrivalKeys.has(dedupKey)) {
          arrivalKeys.add(dedupKey);
          arrivals.push({
            id: dedupKey,
            ...arrivalItem,
          });
        }
      }

      if (teamOutId === teamId) {
        const departureItem: Omit<TeamTransferItem, 'id'> = {
          direction: 'departure',
          ...commonPayload,
        };
        const dedupKey = buildTransferDedupKey('departure', departureItem);
        if (!departureKeys.has(dedupKey)) {
          departureKeys.add(dedupKey);
          departures.push({
            id: dedupKey,
            ...departureItem,
          });
        }
      }
    });
  });

  const sortByDateDesc = (first: TeamTransferItem, second: TeamTransferItem) => {
    const firstDate = toSortableTimestamp(first.date);
    const secondDate = toSortableTimestamp(second.date);
    return secondDate - firstDate;
  };

  return {
    arrivals: arrivals.sort(sortByDateDesc),
    departures: departures.sort(sortByDateDesc),
  };
}

function mapSquadRole(position: string | null): TeamSquadRole {
  return mapTransferRole(position);
}

function mapSquadPlayer(player: NonNullable<TeamApiSquadDto['players']>[number]): TeamSquadPlayer | null {
  const playerId = toId(player.id);
  if (!playerId) {
    return null;
  }

  const position = toText(player.position);

  return {
    playerId,
    name: toText(player.name),
    photo: toText(player.photo),
    age: toNumber(player.age),
    number: toNumber(player.number),
    position,
    role: mapSquadRole(position),
  };
}

export function mapSquadToTeamSquad(payload: TeamApiSquadDto | null): TeamSquadData {
  const players = (payload?.players ?? [])
    .map(mapSquadPlayer)
    .filter((item): item is TeamSquadPlayer => item !== null)
    .sort((first, second) => {
      const firstNumber = first.number ?? Number.MAX_SAFE_INTEGER;
      const secondNumber = second.number ?? Number.MAX_SAFE_INTEGER;
      return firstNumber - secondNumber;
    });

  const coach = payload?.coach ? {
    id: payload.coach.id?.toString() ?? null,
    name: payload.coach.name ?? null,
    photo: payload.coach.photo ?? null,
    age: payload.coach.age ?? null,
  } : null;

  return {
    coach,
    players,
  };
}

function isWinnerTrophy(place: string | null): boolean {
  return (place ?? '').toLowerCase().includes('winner');
}

function normalizeTrophyPlace(place: string | null): string {
  const norm = (place ?? '').toLowerCase();
  if (norm.includes('winner') || norm.includes('champion')) return 'champion';
  if (norm.includes('runner') || norm.includes('vice')) return 'runnerUp';
  if (norm.includes('semi')) return 'semifinalist';
  return 'title';
}

const PLACE_SCORE: Record<string, number> = {
  champion: 3,
  runnerUp: 2,
  semifinalist: 1,
  title: 0,
};

export function mapTrophiesToTeamTrophies(payload: TeamApiTrophyDto[]): TeamTrophiesData {
  const groupsByCompetition = new Map<string, TeamTrophyGroup>();
  let totalWins = 0;

  payload.forEach(item => {
    const competition = toText(item.league);
    const country = toText(item.country);
    const groupKey = `${competition ?? '__unknown_competition__'}::${country ?? '__unknown_country__'}`;
    const existingGroup = groupsByCompetition.get(groupKey);
    const place = toText(item.place);
    const season = toText(item.season);

    const isWin = isWinnerTrophy(place);
    if (isWin) totalWins++;

    const normPlaceKey = normalizeTrophyPlace(place);

    if (!existingGroup) {
      groupsByCompetition.set(groupKey, {
        id: groupKey,
        competition,
        country,
        placements: [{ place: normPlaceKey, count: 1, seasons: season ? [season] : [] }],
      });
      return;
    }

    const existingPlacement = existingGroup.placements.find(p => p.place === normPlaceKey);
    if (existingPlacement) {
      existingPlacement.count++;
      if (season) {
        existingPlacement.seasons.push(season);
      }
    } else {
      existingGroup.placements.push({ place: normPlaceKey, count: 1, seasons: season ? [season] : [] });
    }
  });

  const groups = Array.from(groupsByCompetition.values())
    .map(group => {
      group.placements.forEach(p => p.seasons.sort((a, b) => b.localeCompare(a)));
      group.placements.sort((a, b) => (PLACE_SCORE[b.place] ?? 0) - (PLACE_SCORE[a.place] ?? 0));
      return group;
    })
    .sort((first, second) => {
      const firstWins = first.placements.find(p => p.place === 'champion')?.count ?? 0;
      const secondWins = second.placements.find(p => p.place === 'champion')?.count ?? 0;
      if (secondWins !== firstWins) {
        return secondWins - firstWins;
      }
      return (first.competition ?? '').localeCompare(second.competition ?? '');
    });

  return {
    groups,
    total: payload.length,
    totalWins,
  };
}
