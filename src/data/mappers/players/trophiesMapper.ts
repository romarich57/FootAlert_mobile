import type { PlayerApiTrophyDto, PlayerTrophy } from '@ui/features/players/types/players.types';

export function mapPlayerTrophies(dtos: PlayerApiTrophyDto[]): PlayerTrophy[] {
  const trophyCounts = new Map<string, number>();

  dtos.forEach(dto => {
    if (dto.place === 'Winner' && dto.league) {
      trophyCounts.set(dto.league, (trophyCounts.get(dto.league) || 0) + 1);
    }
  });

  return Array.from(trophyCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}
