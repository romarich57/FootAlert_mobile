/**
 * Store dénormalisé pour les matches par date.
 *
 * Permet un affichage instantané de l'écran Matches principal
 * sans avoir à parser toutes les entités de type 'match'.
 */

import { getDatabaseSync } from './database';
import type { MatchItem } from '@domain/contracts/matches.types';

export type MatchByDateEntry<T> = {
  matchId: string;
  leagueId: string;
  status: string;
  data: T;
  updatedAt: number;
};

function getMatchItemSnapshot(data: unknown): MatchItem | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const candidate = data as Partial<MatchItem>;
  if (
    typeof candidate.fixtureId !== 'string' ||
    typeof candidate.competitionId !== 'string' ||
    typeof candidate.homeTeamId !== 'string' ||
    typeof candidate.awayTeamId !== 'string'
  ) {
    return null;
  }

  return candidate as MatchItem;
}

/**
 * Insère ou met à jour les matches pour une date donnée.
 * Utilise une transaction pour la performance.
 */
export function upsertMatchesByDate<T>(
  date: string,
  matches: Array<{
    matchId: string;
    leagueId: string;
    status: string;
    data: T;
  }>,
): void {
  if (matches.length === 0) return;

  const db = getDatabaseSync();
  const now = Date.now();

  db.executeSync('BEGIN TRANSACTION');
  try {
    for (const match of matches) {
      const snapshot = getMatchItemSnapshot(match.data);
      db.executeSync(
        `INSERT OR REPLACE INTO matches_by_date (
          date,
          match_id,
          league_id,
          status,
          data,
          updated_at,
          competition_name,
          competition_logo,
          competition_country,
          start_date,
          minute,
          venue,
          status_label,
          home_team_id,
          home_team_name,
          home_team_logo,
          away_team_id,
          away_team_name,
          away_team_logo,
          home_goals,
          away_goals,
          has_broadcast
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          date,
          match.matchId,
          match.leagueId,
          match.status,
          JSON.stringify(match.data),
          now,
          snapshot?.competitionName ?? null,
          snapshot?.competitionLogo ?? null,
          snapshot?.competitionCountry ?? null,
          snapshot?.startDate ?? null,
          snapshot?.minute ?? null,
          snapshot?.venue ?? null,
          snapshot?.statusLabel ?? null,
          snapshot?.homeTeamId ?? null,
          snapshot?.homeTeamName ?? null,
          snapshot?.homeTeamLogo ?? null,
          snapshot?.awayTeamId ?? null,
          snapshot?.awayTeamName ?? null,
          snapshot?.awayTeamLogo ?? null,
          snapshot?.homeGoals ?? null,
          snapshot?.awayGoals ?? null,
          snapshot?.hasBroadcast ? 1 : 0,
        ],
      );
    }
    db.executeSync('COMMIT');
  } catch (error) {
    db.executeSync('ROLLBACK');
    throw error;
  }
}

/**
 * Lit tous les matches pour une date donnée, triés par ligue.
 */
export function getMatchesByDate<T>(date: string): MatchByDateEntry<T>[] {
  const db = getDatabaseSync();
  const result = db.executeSync(
    `SELECT match_id, league_id, status, data, updated_at
     FROM matches_by_date
     WHERE date = ?
     ORDER BY league_id, match_id`,
    [date],
  );

  const entries: MatchByDateEntry<T>[] = [];
  for (const row of result.rows) {
    try {
      entries.push({
        matchId: row.match_id as string,
        leagueId: row.league_id as string,
        status: row.status as string,
        data: JSON.parse(row.data as string) as T,
        updatedAt: row.updated_at as number,
      });
    } catch {
      // Skip les entrées corrompues
    }
  }

  return entries;
}

/**
 * Lit les matches par date et ligue.
 */
export function getMatchesByDateAndLeague<T>(
  date: string,
  leagueId: string,
): MatchByDateEntry<T>[] {
  const db = getDatabaseSync();
  const result = db.executeSync(
    `SELECT match_id, league_id, status, data, updated_at
     FROM matches_by_date
     WHERE date = ? AND league_id = ?
     ORDER BY match_id`,
    [date, leagueId],
  );

  const entries: MatchByDateEntry<T>[] = [];
  for (const row of result.rows) {
    try {
      entries.push({
        matchId: row.match_id as string,
        leagueId: row.league_id as string,
        status: row.status as string,
        data: JSON.parse(row.data as string) as T,
        updatedAt: row.updated_at as number,
      });
    } catch {
      // Skip
    }
  }

  return entries;
}

/**
 * Lit les matches live pour une date donnée.
 */
export function getLiveMatchesByDate<T>(date: string): MatchByDateEntry<T>[] {
  const db = getDatabaseSync();
  const result = db.executeSync(
    `SELECT match_id, league_id, status, data, updated_at
     FROM matches_by_date
     WHERE date = ? AND status = 'live'
     ORDER BY league_id, match_id`,
    [date],
  );

  const entries: MatchByDateEntry<T>[] = [];
  for (const row of result.rows) {
    try {
      entries.push({
        matchId: row.match_id as string,
        leagueId: row.league_id as string,
        status: row.status as string,
        data: JSON.parse(row.data as string) as T,
        updatedAt: row.updated_at as number,
      });
    } catch {
      // Skip
    }
  }

  return entries;
}

/**
 * Supprime les matches plus anciens qu'une date donnée.
 * Retourne le nombre de lignes supprimées.
 */
export function deleteMatchesOlderThan(olderThanDate: string): number {
  const db = getDatabaseSync();
  const result = db.executeSync(
    'DELETE FROM matches_by_date WHERE date < ?',
    [olderThanDate],
  );
  return result.rowsAffected;
}
