import type { TeamStandingsData, TeamStandingRow } from '@ui/features/teams/types/teams.types';

export type DisplayMode = 'simple' | 'detailed' | 'form';
export type SubFilter = 'all' | 'home' | 'away';

export type StandingFeedItem =
  | {
    type: 'header';
    key: string;
    title: string;
  }
  | {
    type: 'row';
    key: string;
    row: TeamStandingRow;
  };

export const FORM_COLORS: Record<string, string> = {
  W: '#15F86A',
  D: '#6B7280',
  L: '#EF4444',
};

export function buildStandingFeedItems(
  data: TeamStandingsData | undefined,
  subFilter: SubFilter,
  defaultGroupTitle: string,
): StandingFeedItem[] {
  if (!data) {
    return [];
  }

  const headerOccurrences = new Map<string, number>();

  return data.groups.flatMap(group => {
    const groupIdentity = group.groupName ?? defaultGroupTitle;
    const headerOccurrence = (headerOccurrences.get(groupIdentity) ?? 0) + 1;
    headerOccurrences.set(groupIdentity, headerOccurrence);

    const header: StandingFeedItem = {
      type: 'header',
      key: `group-${groupIdentity}-${headerOccurrence}`,
      title: group.groupName?.trim() || defaultGroupTitle,
    };

    let processedRows = group.rows;
    if (subFilter !== 'all') {
      processedRows = group.rows
        .map(row => {
          const stats = row[subFilter];
          const points = (stats.win ?? 0) * 3 + (stats.draw ?? 0);
          const goalDiff = (stats.goalsFor ?? 0) - (stats.goalsAgainst ?? 0);
          return {
            ...row,
            points,
            goalDiff,
          };
        })
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
          const aGoalsFor = a[subFilter].goalsFor ?? 0;
          const bGoalsFor = b[subFilter].goalsFor ?? 0;
          return bGoalsFor - aGoalsFor;
        })
        .map((row, index) => ({
          ...row,
          rank: index + 1,
        }));
    }

    const rowOccurrences = new Map<string, number>();

    const rows = processedRows.map<StandingFeedItem>(row => {
      const rowBaseKey = `${groupIdentity}-${row.teamId ?? row.teamName ?? 'unknown'}-${row.rank ?? 'unknown'}`;
      const rowOccurrence = (rowOccurrences.get(rowBaseKey) ?? 0) + 1;
      rowOccurrences.set(rowBaseKey, rowOccurrence);

      return {
        type: 'row',
        key: `row-${rowBaseKey}-${rowOccurrence}`,
        row,
      };
    });

    return [header, ...rows];
  });
}
