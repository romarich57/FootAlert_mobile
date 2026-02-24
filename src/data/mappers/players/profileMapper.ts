import type {
  PlayerApiDetailsDto,
  PlayerCharacteristics,
  PlayerProfile,
} from '@ui/features/players/types/players.types';

import {
  normalizeNumber,
  normalizeString,
  resolvePrimaryStatistic,
  sumOrNull,
  toId,
} from './shared';

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
