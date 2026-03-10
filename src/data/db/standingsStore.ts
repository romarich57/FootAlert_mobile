import type {
  StandingGroup,
  StandingVenueStats,
} from '@domain/contracts/competitions.types';

import { getDatabaseSync } from './database';

export function upsertNormalizedStandings(
  competitionId: string,
  season: number,
  groups: StandingGroup[],
): void {
  const db = getDatabaseSync();
  const now = Date.now();

  db.executeSync('BEGIN TRANSACTION');
  try {
    db.executeSync(
      `DELETE FROM normalized_standings
       WHERE competition_id = ? AND season = ?`,
      [competitionId, season],
    );

    groups.forEach(group => {
      group.rows.forEach(row => {
        db.executeSync(
          `INSERT OR REPLACE INTO normalized_standings (
            competition_id,
            season,
            group_name,
            team_id,
            rank,
            team_name,
            team_logo,
            points,
            goals_diff,
            played,
            win,
            draw,
            lose,
            goals_for,
            goals_against,
            form,
            description,
            home_stats,
            away_stats,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            competitionId,
            season,
            group.groupName,
            row.teamId,
            row.rank,
            row.teamName,
            row.teamLogo,
            row.points,
            row.goalsDiff,
            row.played,
            row.win,
            row.draw,
            row.lose,
            row.goalsFor,
            row.goalsAgainst,
            row.form,
            row.description,
            JSON.stringify(row.home),
            JSON.stringify(row.away),
            now,
          ],
        );
      });
    });

    db.executeSync('COMMIT');
  } catch (error) {
    db.executeSync('ROLLBACK');
    throw error;
  }
}

export function getNormalizedStandings(
  competitionId: string,
  season: number,
): StandingGroup[] {
  const db = getDatabaseSync();
  const result = db.executeSync(
    `SELECT *
     FROM normalized_standings
     WHERE competition_id = ? AND season = ?
     ORDER BY group_name ASC, rank ASC, team_name ASC`,
    [competitionId, season],
  );

  const groups = new Map<string, StandingGroup>();

  result.rows.forEach(row => {
    const groupName = typeof row.group_name === 'string' ? row.group_name : '';
    const currentGroup = groups.get(groupName) ?? {
      groupName,
      rows: [],
    };

    const parseVenueStats = (value: unknown): StandingVenueStats => {
      try {
        return JSON.parse(String(value)) as StandingVenueStats;
      } catch {
        return {
          played: 0,
          win: 0,
          draw: 0,
          lose: 0,
          goalsFor: 0,
          goalsAgainst: 0,
        };
      }
    };

    currentGroup.rows.push({
      rank: Number(row.rank ?? 0),
      teamId: Number(row.team_id ?? 0),
      teamName: String(row.team_name ?? ''),
      teamLogo: String(row.team_logo ?? ''),
      points: Number(row.points ?? 0),
      goalsDiff: Number(row.goals_diff ?? 0),
      played: Number(row.played ?? 0),
      win: Number(row.win ?? 0),
      draw: Number(row.draw ?? 0),
      lose: Number(row.lose ?? 0),
      goalsFor: Number(row.goals_for ?? 0),
      goalsAgainst: Number(row.goals_against ?? 0),
      group: groupName,
      form: String(row.form ?? ''),
      description:
        typeof row.description === 'string' ? row.description : null,
      home: parseVenueStats(row.home_stats),
      away: parseVenueStats(row.away_stats),
    });

    groups.set(groupName, currentGroup);
  });

  return Array.from(groups.values());
}
