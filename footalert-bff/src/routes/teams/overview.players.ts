// Fonctions pures de transformation et ranking des joueurs pour l'overview d'équipe

import type {
  PlayerLineCategory,
  TeamApiPlayerDto,
  TeamSeasonLineup,
  TeamTopPlayer,
} from './overview.types.js';

import { toId, toNumber, toParsedFloat, toText } from './overview.mappers.js';

// --- Résolution de la statistique principale d'un joueur ---

function resolvePrimaryTeamPlayerStatistic(
  statistics: TeamApiPlayerDto['statistics'],
  context: {
    teamId: string;
    leagueId: string;
    season: number;
  },
) {
  if (!statistics || statistics.length === 0) {
    return undefined;
  }

  // On filtre en priorité les stats correspondant à l'équipe + ligue + saison cible
  const candidates = statistics
    .filter(stat => {
      return (
        toId(stat.team?.id) === context.teamId &&
        toId(stat.league?.id) === context.leagueId &&
        stat.league?.season === context.season
      );
    });

  const pool = candidates.length > 0 ? candidates : statistics;

  // Tri par minutes jouées, puis apparitions, puis buts, puis passes décisives
  return [...pool].sort((first, second) => {
    const secondMinutes = toNumber(second.games?.minutes) ?? 0;
    const firstMinutes = toNumber(first.games?.minutes) ?? 0;
    if (secondMinutes !== firstMinutes) {
      return secondMinutes - firstMinutes;
    }

    const secondAppearances = toNumber(second.games?.appearences) ?? 0;
    const firstAppearances = toNumber(first.games?.appearences) ?? 0;
    if (secondAppearances !== firstAppearances) {
      return secondAppearances - firstAppearances;
    }

    const secondGoals = toNumber(second.goals?.total) ?? 0;
    const firstGoals = toNumber(first.goals?.total) ?? 0;
    if (secondGoals !== firstGoals) {
      return secondGoals - firstGoals;
    }

    const secondAssists = toNumber(second.goals?.assists) ?? 0;
    const firstAssists = toNumber(first.goals?.assists) ?? 0;
    return secondAssists - firstAssists;
  })[0];
}

function mapPlayerStat(
  player: TeamApiPlayerDto,
  context: {
    teamId: string;
    leagueId: string;
    season: number;
  },
): TeamTopPlayer | null {
  const playerId = toId(player.player?.id);
  if (!playerId) {
    return null;
  }

  const stat = resolvePrimaryTeamPlayerStatistic(player.statistics, context);
  return {
    playerId,
    name: toText(player.player?.name),
    photo: toText(player.player?.photo),
    teamLogo: toText(stat?.team?.logo),
    position: toText(stat?.games?.position),
    goals: toNumber(stat?.goals?.total),
    assists: toNumber(stat?.goals?.assists),
    rating: toParsedFloat(stat?.games?.rating),
  };
}

// Score composite pour le classement général : buts > passes > note
function sortByCompositeScore(first: TeamTopPlayer, second: TeamTopPlayer): number {
  const firstScore = (first.goals ?? 0) * 3 + (first.assists ?? 0) * 2 + (first.rating ?? 0);
  const secondScore = (second.goals ?? 0) * 3 + (second.assists ?? 0) * 2 + (second.rating ?? 0);
  return secondScore - firstScore;
}

export function mapPlayersToTopPlayers(
  players: TeamApiPlayerDto[],
  context: {
    teamId: string;
    leagueId: string;
    season: number;
  },
  limit: number,
): TeamTopPlayer[] {
  return players
    .map(player => mapPlayerStat(player, context))
    .filter((item): item is TeamTopPlayer => item !== null)
    .sort(sortByCompositeScore)
    .slice(0, limit);
}

export function mapPlayersToTopPlayersByCategory(
  players: TeamApiPlayerDto[],
  context: {
    teamId: string;
    leagueId: string;
    season: number;
  },
  limit: number,
) {
  const mappedPlayers = players
    .map(player => mapPlayerStat(player, context))
    .filter((item): item is TeamTopPlayer => item !== null);

  return {
    ratings: mappedPlayers
      .filter(player => player.rating !== null)
      .sort((first, second) => (second.rating ?? -1) - (first.rating ?? -1))
      .slice(0, limit),
    scorers: mappedPlayers
      .filter(player => typeof player.goals === 'number' && player.goals > 0)
      .sort((first, second) => (second.goals ?? -1) - (first.goals ?? -1))
      .slice(0, limit),
    assisters: mappedPlayers
      .filter(player => typeof player.assists === 'number' && player.assists > 0)
      .sort((first, second) => (second.assists ?? -1) - (first.assists ?? -1))
      .slice(0, limit),
  };
}

// --- Construction du lineup estimé en formation 4-3-3 ---

function resolvePlayerLineCategory(position: string | null | undefined): PlayerLineCategory {
  const normalized = (position ?? '').trim().toLowerCase();
  if (!normalized) {
    return 'other';
  }

  if (normalized.includes('goal')) {
    return 'goalkeeper';
  }
  if (normalized.includes('def')) {
    return 'defender';
  }
  if (normalized.includes('mid')) {
    return 'midfielder';
  }
  if (
    normalized.includes('att') ||
    normalized.includes('forw') ||
    normalized.includes('strik') ||
    normalized.includes('wing')
  ) {
    return 'attacker';
  }

  return 'other';
}

function sortPlayersForLineup(first: TeamTopPlayer, second: TeamTopPlayer): number {
  const byRating = (second.rating ?? -1) - (first.rating ?? -1);
  if (byRating !== 0) {
    return byRating;
  }

  const byGoals = (second.goals ?? -1) - (first.goals ?? -1);
  if (byGoals !== 0) {
    return byGoals;
  }

  return (second.assists ?? -1) - (first.assists ?? -1);
}

export function buildEstimatedLineup(players: TeamTopPlayer[]): TeamSeasonLineup {
  const sortedPlayers = [...players].sort(sortPlayersForLineup);
  const usedPlayerIds = new Set<string>();

  // Sélectionne `count` joueurs pour une position donnée.
  // Si insuffisant, complète avec les meilleurs joueurs restants toutes positions confondues.
  const pickPlayers = (category: PlayerLineCategory, count: number): TeamTopPlayer[] => {
    const selected: TeamTopPlayer[] = [];

    for (const player of sortedPlayers) {
      if (selected.length >= count) {
        break;
      }
      if (usedPlayerIds.has(player.playerId)) {
        continue;
      }
      if (resolvePlayerLineCategory(player.position) !== category) {
        continue;
      }

      selected.push(player);
      usedPlayerIds.add(player.playerId);
    }

    if (selected.length < count) {
      for (const player of sortedPlayers) {
        if (selected.length >= count) {
          break;
        }
        if (usedPlayerIds.has(player.playerId)) {
          continue;
        }

        selected.push(player);
        usedPlayerIds.add(player.playerId);
      }
    }

    return selected;
  };

  return {
    formation: '4-3-3',
    estimated: true,
    goalkeeper: pickPlayers('goalkeeper', 1)[0] ?? null,
    defenders: pickPlayers('defender', 4),
    midfielders: pickPlayers('midfielder', 3),
    attackers: pickPlayers('attacker', 3),
  };
}
