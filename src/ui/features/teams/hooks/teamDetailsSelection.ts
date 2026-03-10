import type {
  TeamCompetitionOption,
  TeamDetailsTab,
  TeamSelection,
} from '@ui/features/teams/types/teams.types';

export type TeamDetailsContentSelection = TeamSelection;
export type TeamDetailsStandingsSelection = TeamSelection;
export type TeamDetailsSelectionGroup = 'content' | 'standings' | 'transfers' | 'none';

export type ActiveSelectionContext = {
  selectionGroup: TeamDetailsSelectionGroup;
  leagueId: string | null;
  season: number | null;
  selectionFingerprint: string;
};

type ResolveActiveSelectionContextArgs = {
  activeTab: TeamDetailsTab;
  contentSelection: TeamDetailsContentSelection;
  standingsSelection: TeamDetailsStandingsSelection;
  transfersSeason: number | null;
};

const buildSelectionFingerprint = (
  selectionGroup: TeamDetailsSelectionGroup,
  leagueId: string | null,
  season: number | null,
): string => [selectionGroup, leagueId ?? 'none', season ?? 'none'].join(':');

export const isLeagueCompetition = (type: string | null | undefined): boolean =>
  (type ?? '').trim().toLowerCase() === 'league';

export const areSelectionsEqual = (
  first: TeamSelection,
  second: TeamSelection,
): boolean => first.leagueId === second.leagueId && first.season === second.season;

export const resolveCompetitionFallbackSelection = (
  competition: TeamCompetitionOption | null | undefined,
): TeamSelection => {
  if (!competition) {
    return {
      leagueId: null,
      season: null,
    };
  }

  return {
    leagueId: competition.leagueId,
    season: competition.currentSeason ?? competition.seasons[0] ?? null,
  };
};

export const reconcileCompetitionSelection = (
  selection: TeamSelection,
  competitions: TeamCompetitionOption[],
  fallbackSelection: TeamSelection,
): TeamSelection => {
  if (competitions.length === 0) {
    return {
      leagueId: null,
      season: null,
    };
  }

  if (!selection.leagueId || typeof selection.season !== 'number') {
    return fallbackSelection;
  }

  const selectedCompetition = competitions.find(item => item.leagueId === selection.leagueId);
  if (!selectedCompetition) {
    return fallbackSelection;
  }

  if (selectedCompetition.seasons.includes(selection.season)) {
    return selection;
  }

  return resolveCompetitionFallbackSelection(selectedCompetition);
};

export const reconcileSeasonValue = (
  season: number | null,
  seasons: number[],
  fallbackSeason: number | null,
): number | null => {
  if (seasons.length === 0) {
    return null;
  }

  if (typeof season === 'number' && seasons.includes(season)) {
    return season;
  }

  if (typeof fallbackSeason === 'number' && seasons.includes(fallbackSeason)) {
    return fallbackSeason;
  }

  return seasons[0] ?? null;
};

export const resolveActiveSelectionContext = ({
  activeTab,
  contentSelection,
  standingsSelection,
  transfersSeason,
}: ResolveActiveSelectionContextArgs): ActiveSelectionContext => {
  if (activeTab === 'overview' || activeTab === 'matches' || activeTab === 'stats') {
    return {
      selectionGroup: 'content',
      leagueId: contentSelection.leagueId,
      season: contentSelection.season,
      selectionFingerprint: buildSelectionFingerprint(
        'content',
        contentSelection.leagueId,
        contentSelection.season,
      ),
    };
  }

  if (activeTab === 'standings') {
    return {
      selectionGroup: 'standings',
      leagueId: standingsSelection.leagueId,
      season: standingsSelection.season,
      selectionFingerprint: buildSelectionFingerprint(
        'standings',
        standingsSelection.leagueId,
        standingsSelection.season,
      ),
    };
  }

  if (activeTab === 'transfers') {
    return {
      selectionGroup: 'transfers',
      leagueId: null,
      season: transfersSeason,
      selectionFingerprint: buildSelectionFingerprint('transfers', null, transfersSeason),
    };
  }

  return {
    selectionGroup: 'none',
    leagueId: null,
    season: null,
    selectionFingerprint: buildSelectionFingerprint('none', null, null),
  };
};
