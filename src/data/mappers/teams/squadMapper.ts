import type {
  TeamApiSquadDto,
  TeamSquadData,
  TeamSquadPlayer,
  TeamSquadRole,
} from '@ui/features/teams/types/teams.types';

import { toId, toNumber, toText } from './shared';

function mapSquadRole(position: string | null): TeamSquadRole {
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

  const coach = payload?.coach
    ? {
        id: payload.coach.id?.toString() ?? null,
        name: payload.coach.name ?? null,
        photo: payload.coach.photo ?? null,
        age: payload.coach.age ?? null,
      }
    : null;

  return {
    coach,
    players,
  };
}
