import type { TeamCompetitionOption, TeamDetailsTab } from '@ui/features/teams/types/teams.types';

import {
  reconcileCompetitionSelection,
  reconcileSeasonValue,
  resolveActiveSelectionContext,
  resolveCompetitionFallbackSelection,
} from './teamDetailsSelection';

const competitions: TeamCompetitionOption[] = [
  {
    leagueId: '39',
    leagueName: 'Premier League',
    leagueLogo: null,
    seasons: [2025, 2024],
    type: 'league',
    country: 'England',
    currentSeason: 2025,
  },
  {
    leagueId: '2',
    leagueName: 'Champions League',
    leagueLogo: null,
    seasons: [2025, 2024],
    type: 'cup',
    country: 'Europe',
    currentSeason: 2025,
  },
];

describe('teamDetailsSelection', () => {
  it('falls back to the competition current season when the selected season is unavailable', () => {
    expect(
      reconcileCompetitionSelection(
        { leagueId: '39', season: 2023 },
        competitions,
        { leagueId: '39', season: 2025 },
      ),
    ).toEqual({ leagueId: '39', season: 2025 });
  });

  it('uses the provided fallback season for transfers when it exists in the available list', () => {
    expect(reconcileSeasonValue(null, [2025, 2024], 2024)).toBe(2024);
  });

  it('returns an empty fallback selection when no competition is available', () => {
    expect(resolveCompetitionFallbackSelection(null)).toEqual({
      leagueId: null,
      season: null,
    });
  });

  it.each<[TeamDetailsTab, string]>([
    ['overview', 'content:39:2025'],
    ['matches', 'content:39:2025'],
    ['stats', 'content:39:2025'],
    ['standings', 'standings:39:2024'],
    ['transfers', 'transfers:none:2024'],
    ['squad', 'none:none:none'],
  ])('builds the expected selection fingerprint for %s', (activeTab, selectionFingerprint) => {
    expect(
      resolveActiveSelectionContext({
        activeTab,
        contentSelection: { leagueId: '39', season: 2025 },
        standingsSelection: { leagueId: '39', season: 2024 },
        transfersSeason: 2024,
      }).selectionFingerprint,
    ).toBe(selectionFingerprint);
  });
});
