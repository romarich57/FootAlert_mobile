export type PlayerFixtureDto = {
  fixture?: {
    id?: number;
    date?: string;
  };
  league?: {
    id?: number;
    name?: string;
    logo?: string;
  };
  teams?: {
    home?: {
      id?: number;
      name?: string;
      logo?: string;
    };
    away?: {
      id?: number;
      name?: string;
      logo?: string;
    };
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
};

export type PlayerFixtureStatsDto = {
  team?: {
    id?: number;
    name?: string;
    logo?: string;
  };
  players?: Array<PlayerFixturePlayerEntry | PlayerFixturePlayersWrapper>;
};

export type PlayerFixturePlayerEntry = {
  player?: {
    id?: number;
  };
  statistics?: Array<{
    games?: {
      minutes?: number;
      rating?: string | null;
      substitute?: boolean;
    };
    goals?: {
      total?: number | null;
      assists?: number | null;
      saves?: number | null;
    };
    cards?: {
      yellow?: number | null;
      yellowred?: number | null;
      red?: number | null;
    };
    penalty?: {
      won?: number | null;
      commited?: number | null;
      scored?: number | null;
      missed?: number | null;
      saved?: number | null;
    };
  }>;
};

type PlayerFixturePlayersWrapper = {
  players?: PlayerFixturePlayerEntry[];
};

type PlayerFixtureStat = NonNullable<PlayerFixturePlayerEntry['statistics']>[number];

export type PlayerMatchPerformanceAggregate = {
  fixtureId: string;
  date: string | null;
  playerTeamId: string | null;
  competition: {
    id: string | null;
    name: string | null;
    logo: string | null;
  };
  homeTeam: {
    id: string | null;
    name: string | null;
    logo: string | null;
  };
  awayTeam: {
    id: string | null;
    name: string | null;
    logo: string | null;
  };
  goalsHome: number | null;
  goalsAway: number | null;
  playerStats: {
    minutes: number | null;
    rating: string | null;
    goals: number | null;
    assists: number | null;
    yellowCards: number | null;
    secondYellowCards: number | null;
    redCards: number | null;
    saves: number | null;
    penaltiesSaved: number | null;
    penaltiesMissed: number | null;
    isStarter: boolean | null;
  };
};

function normalizeString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeRating(value: string | number | null | undefined, precision = 1): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed.toFixed(precision);
}

function toId(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function extractPlayerStatisticsCandidates(
  performanceDto: PlayerFixtureStatsDto | null,
): PlayerFixturePlayerEntry[] {
  if (!Array.isArray(performanceDto?.players)) {
    return [];
  }

  const candidates: PlayerFixturePlayerEntry[] = [];

  performanceDto.players.forEach(group => {
    const directEntry = group as PlayerFixturePlayerEntry;
    if (directEntry.player || Array.isArray(directEntry.statistics)) {
      candidates.push(directEntry);
    }

    const nestedEntries = (group as PlayerFixturePlayersWrapper).players;
    if (!Array.isArray(nestedEntries)) {
      return;
    }

    nestedEntries.forEach(entry => {
      if (entry.player || Array.isArray(entry.statistics)) {
        candidates.push(entry);
      }
    });
  });

  return candidates;
}

function resolvePrimaryFixtureStat(
  statistics: PlayerFixtureStat[] | undefined,
): PlayerFixtureStat | null {
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

    const aRating = Number.parseFloat(a.games?.rating ?? '');
    const bRating = Number.parseFloat(b.games?.rating ?? '');
    const safeARating = Number.isFinite(aRating) ? aRating : 0;
    const safeBRating = Number.isFinite(bRating) ? bRating : 0;
    return safeBRating - safeARating;
  })[0] ?? null;
}

export function mapPlayerMatchPerformance(
  playerId: string,
  teamId: string,
  fixtureDto: PlayerFixtureDto,
  performanceDto: PlayerFixtureStatsDto | null,
): PlayerMatchPerformanceAggregate | null {
  const fixtureId = toId(fixtureDto.fixture?.id);
  if (!fixtureId || !fixtureDto.teams) {
    return null;
  }

  let playerStats: PlayerMatchPerformanceAggregate['playerStats'] = {
    minutes: null,
    rating: null,
    goals: null,
    assists: null,
    yellowCards: null,
    secondYellowCards: null,
    redCards: null,
    saves: null,
    penaltiesSaved: null,
    penaltiesMissed: null,
    isStarter: null,
  };

  if (performanceDto?.players) {
    const normalizedCandidates = extractPlayerStatisticsCandidates(performanceDto);
    const foundPlayer = normalizedCandidates.find(
      candidate => String(candidate.player?.id) === playerId,
    );

    if (foundPlayer && foundPlayer.statistics && foundPlayer.statistics.length > 0) {
      const stat = resolvePrimaryFixtureStat(foundPlayer.statistics);
      if (stat) {
        playerStats = {
          minutes: normalizeNumber(stat.games?.minutes),
          rating: normalizeRating(stat.games?.rating, 1),
          goals: normalizeNumber(stat.goals?.total),
          assists: normalizeNumber(stat.goals?.assists),
          yellowCards: normalizeNumber(stat.cards?.yellow),
          secondYellowCards: normalizeNumber(stat.cards?.yellowred),
          redCards: normalizeNumber(stat.cards?.red),
          saves: normalizeNumber(stat.goals?.saves),
          penaltiesSaved: normalizeNumber(stat.penalty?.saved),
          penaltiesMissed: normalizeNumber(stat.penalty?.missed),
          isStarter:
            typeof stat.games?.substitute === 'boolean'
              ? stat.games.substitute === false
              : null,
        };
      }
    }
  }

  return {
    fixtureId,
    date: normalizeString(fixtureDto.fixture?.date),
    playerTeamId: teamId,
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
    goalsHome: normalizeNumber(fixtureDto.goals?.home),
    goalsAway: normalizeNumber(fixtureDto.goals?.away),
    playerStats,
  };
}
