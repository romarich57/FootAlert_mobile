import type {
  PlayerApiDetailsDto,
  PlayerCharacteristics,
  PlayerPositionPoint,
  PlayerPositionsData,
  PlayerProfile,
} from '@domain/contracts/players.types';

import {
  normalizeNumber,
  normalizeString,
  resolvePrimaryStatistic,
  resolveSeasonStatistics,
  sumOrNull,
  toId,
} from './shared';

type PositionDefinition = {
  id: string;
  code: string;
  shortLabel: string;
  x: number;
  y: number;
};

const POSITION_DEFINITIONS: Record<string, PositionDefinition> = {
  gk: { id: 'gk', code: 'GK', shortLabel: 'GK', x: 50, y: 90 },
  lb: { id: 'lb', code: 'LB', shortLabel: 'DG', x: 18, y: 74 },
  rb: { id: 'rb', code: 'RB', shortLabel: 'DD', x: 82, y: 74 },
  cb: { id: 'cb', code: 'CB', shortLabel: 'DC', x: 50, y: 76 },
  lwb: { id: 'lwb', code: 'LWB', shortLabel: 'PG', x: 14, y: 58 },
  rwb: { id: 'rwb', code: 'RWB', shortLabel: 'PD', x: 86, y: 58 },
  dm: { id: 'dm', code: 'DM', shortLabel: 'MDC', x: 50, y: 62 },
  cm: { id: 'cm', code: 'CM', shortLabel: 'MC', x: 50, y: 50 },
  am: { id: 'am', code: 'AM', shortLabel: 'MOC', x: 50, y: 36 },
  lm: { id: 'lm', code: 'LM', shortLabel: 'MG', x: 24, y: 44 },
  rm: { id: 'rm', code: 'RM', shortLabel: 'MD', x: 76, y: 44 },
  lw: { id: 'lw', code: 'LW', shortLabel: 'AG', x: 20, y: 26 },
  rw: { id: 'rw', code: 'RW', shortLabel: 'AD', x: 80, y: 26 },
  st: { id: 'st', code: 'ST', shortLabel: 'BU', x: 50, y: 16 },
  att: { id: 'att', code: 'ATT', shortLabel: 'ATT', x: 50, y: 12 },
};

const POSITION_LOOKUP: Record<string, string> = {
  gk: 'gk',
  goalkeeper: 'gk',
  gardien: 'gk',
  keeper: 'gk',
  portier: 'gk',
  df: 'cb',
  defender: 'cb',
  defenseur: 'cb',
  defenceur: 'cb',
  defense: 'cb',
  defence: 'cb',
  cb: 'cb',
  centerback: 'cb',
  centreback: 'cb',
  centraldefender: 'cb',
  lb: 'lb',
  leftback: 'lb',
  arrieregauche: 'lb',
  rb: 'rb',
  rightback: 'rb',
  arrieredroit: 'rb',
  lwb: 'lwb',
  rwb: 'rwb',
  wingback: 'lwb',
  piston: 'lwb',
  mf: 'cm',
  midfielder: 'cm',
  milieu: 'cm',
  dm: 'dm',
  cdm: 'dm',
  defensivemidfielder: 'dm',
  milieudefensif: 'dm',
  am: 'am',
  cam: 'am',
  attackingmidfielder: 'am',
  milieuoffensif: 'am',
  cm: 'cm',
  centralmidfielder: 'cm',
  milieucentral: 'cm',
  lm: 'lm',
  leftmidfielder: 'lm',
  milieugauche: 'lm',
  rm: 'rm',
  rightmidfielder: 'rm',
  milieudroit: 'rm',
  lw: 'lw',
  leftwing: 'lw',
  leftwinger: 'lw',
  ailiergauche: 'lw',
  rw: 'rw',
  rightwing: 'rw',
  rightwinger: 'rw',
  ailierdroit: 'rw',
  st: 'st',
  striker: 'st',
  buteur: 'st',
  cf: 'st',
  centerforward: 'st',
  centreforward: 'st',
  avantcentre: 'st',
  fw: 'att',
  fwd: 'att',
  forward: 'att',
  attacker: 'att',
  attaquant: 'att',
  att: 'att',
};

type PositionAccumulator = {
  definition: PositionDefinition;
  label: string;
  labelScore: number;
  appearances: number | null;
  minutes: number | null;
  score: number;
};

function createEmptyPositionsData(): PlayerPositionsData {
  return {
    primary: null,
    others: [],
    all: [],
  };
}

function normalizePositionToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function resolvePositionDefinition(rawPosition: string): PositionDefinition | null {
  const normalized = normalizePositionToken(rawPosition);
  const mappedKey = POSITION_LOOKUP[normalized];
  if (mappedKey && POSITION_DEFINITIONS[mappedKey]) {
    return POSITION_DEFINITIONS[mappedKey];
  }

  if (normalized.includes('leftwing')) return POSITION_DEFINITIONS.lw;
  if (normalized.includes('rightwing')) return POSITION_DEFINITIONS.rw;
  if (normalized.includes('wingback')) {
    if (normalized.startsWith('r')) return POSITION_DEFINITIONS.rwb;
    return POSITION_DEFINITIONS.lwb;
  }
  if (normalized.includes('midfielder')) return POSITION_DEFINITIONS.cm;
  if (normalized.includes('defender') || normalized.includes('defence')) return POSITION_DEFINITIONS.cb;
  if (normalized.includes('striker') || normalized.includes('forward')) return POSITION_DEFINITIONS.st;
  if (normalized.includes('attacker') || normalized.includes('attaquant')) return POSITION_DEFINITIONS.att;

  return null;
}

function comparePositionPoints(first: PlayerPositionPoint, second: PlayerPositionPoint): number {
  if (second.score !== first.score) {
    return second.score - first.score;
  }

  const firstAppearances = first.appearances ?? Number.NEGATIVE_INFINITY;
  const secondAppearances = second.appearances ?? Number.NEGATIVE_INFINITY;
  if (secondAppearances !== firstAppearances) {
    return secondAppearances - firstAppearances;
  }

  const firstMinutes = first.minutes ?? Number.NEGATIVE_INFINITY;
  const secondMinutes = second.minutes ?? Number.NEGATIVE_INFINITY;
  if (secondMinutes !== firstMinutes) {
    return secondMinutes - firstMinutes;
  }

  return first.label.localeCompare(second.label);
}

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

export function mapPlayerDetailsToPositions(
  dto: PlayerApiDetailsDto,
  season?: number,
): PlayerPositionsData {
  const statsRows = resolveSeasonStatistics(dto.statistics, season);
  if (statsRows.length === 0) {
    return createEmptyPositionsData();
  }

  const accumulators = new Map<string, PositionAccumulator>();

  statsRows.forEach(statRow => {
    const rawPosition = normalizeString(statRow.games?.position);
    if (!rawPosition) {
      return;
    }

    const definition = resolvePositionDefinition(rawPosition);
    if (!definition) {
      return;
    }

    const appearances = normalizeNumber(statRow.games?.appearences);
    const minutes = normalizeNumber(statRow.games?.minutes);
    const rowScore = (appearances ?? 0) * 1000 + (minutes ?? 0);
    const current = accumulators.get(definition.id);

    if (!current) {
      accumulators.set(definition.id, {
        definition,
        label: rawPosition,
        labelScore: rowScore,
        appearances,
        minutes,
        score: rowScore,
      });
      return;
    }

    current.appearances = sumOrNull(current.appearances, appearances);
    current.minutes = sumOrNull(current.minutes, minutes);
    current.score += rowScore;

    if (rowScore > current.labelScore && rawPosition) {
      current.label = rawPosition;
      current.labelScore = rowScore;
    }
  });

  const all = Array.from(accumulators.values())
    .map<PlayerPositionPoint>(item => ({
      id: item.definition.id,
      code: item.definition.code,
      shortLabel: item.definition.shortLabel,
      label: item.label,
      x: item.definition.x,
      y: item.definition.y,
      appearances: item.appearances,
      minutes: item.minutes,
      score: item.score,
      isPrimary: false,
    }))
    .sort(comparePositionPoints)
    .map((item, index) => ({
      ...item,
      isPrimary: index === 0,
    }));

  if (all.length === 0) {
    return createEmptyPositionsData();
  }

  return {
    primary: all[0],
    others: all.slice(1),
    all,
  };
}
