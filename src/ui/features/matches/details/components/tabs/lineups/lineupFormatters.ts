import type { MatchLineupPlayer } from '@ui/features/matches/types/matches.types';
import { toText } from '@ui/features/matches/details/components/tabs/shared/matchDetailsParsing';

export type RatingVariant = 'elite' | 'good' | 'warning' | 'neutral';

export function toInitials(value: string): string {
  const tokens = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return '?';
  }

  const first = tokens[0]?.[0] ?? '';
  const second = tokens[1]?.[0] ?? '';
  const initials = `${first}${second}`.trim().toUpperCase();
  return initials || tokens[0].slice(0, 2).toUpperCase();
}

export function formatRating(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }

  return value.toFixed(1).replace('.', ',');
}

export function resolveRatingVariant(value: number | null | undefined): RatingVariant {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'neutral';
  }
  if (value >= 8.5) {
    return 'elite';
  }
  if (value >= 7) {
    return 'good';
  }
  return 'warning';
}

export function formatShortPlayerName(player: MatchLineupPlayer): string {
  const fullName = toText(player.name, '');
  if (!fullName) {
    return '--';
  }

  const chunks = fullName.split(/\s+/).filter(Boolean);
  const shortName = chunks.length > 1 ? chunks[chunks.length - 1] : fullName;
  return `${player.number ?? '--'} ${shortName}`;
}

export function parseGridIndex(value: string | null | undefined): { row: number; col: number } {
  const fallback = { row: 999, col: 999 };
  if (!value || !value.includes(':')) {
    return fallback;
  }

  const [rowValue, colValue] = value.split(':');
  const row = Number.parseInt(rowValue ?? '', 10);
  const col = Number.parseInt(colValue ?? '', 10);

  if (!Number.isFinite(row) || !Number.isFinite(col)) {
    return fallback;
  }

  return { row, col };
}

export function resolvePositionLabel(position: string | null | undefined, t: (key: string) => string): string {
  switch (position) {
    case 'G':
      return t('playerPositions.goalkeeper');
    case 'D':
      return t('playerPositions.defender');
    case 'M':
      return t('playerPositions.midfielder');
    case 'F':
      return t('playerPositions.attacker');
    default:
      return t('matchDetails.values.unavailable');
  }
}

export function computeTeamAverageRating(players: MatchLineupPlayer[]): number | null {
  const ratings = players
    .map(player => player.rating)
    .filter((rating): rating is number => typeof rating === 'number' && Number.isFinite(rating));

  if (ratings.length === 0) {
    return null;
  }

  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return sum / ratings.length;
}

export function formatPlayerChange(player: MatchLineupPlayer): string {
  const inLabel =
    typeof player.inMinute === 'number' && Number.isFinite(player.inMinute)
      ? `↗ ${player.inMinute}'`
      : '';
  const outLabel =
    typeof player.outMinute === 'number' && Number.isFinite(player.outMinute)
      ? ` ↘ ${player.outMinute}'`
      : '';
  return `${inLabel}${outLabel}`.trim();
}

export function formatPlayerCards(player: MatchLineupPlayer): string {
  if (player.redCards && player.redCards > 0) {
    return `R${player.redCards}`;
  }
  if (player.yellowCards && player.yellowCards > 0) {
    return `J${player.yellowCards}`;
  }
  return 'J0';
}
