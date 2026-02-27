import type {
  TeamApiStandingsDto,
  TeamStandingRow,
  TeamStandingsData,
} from '@ui/features/teams/types/teams.types';

import { toId, toNumber, toText } from './shared';

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
        update: row.update ?? null,
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
