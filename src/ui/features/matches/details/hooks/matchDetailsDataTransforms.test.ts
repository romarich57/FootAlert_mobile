import { ApiError } from '@data/api/http/client';
import type { TeamMatchesData } from '@ui/features/teams/types/teams.types';

import {
  isWithinPreMatchLineupsVisibilityWindow,
  resolveDatasetWithFallback,
  toRecentResultRows,
  toUpcomingRows,
} from '@ui/features/matches/details/hooks/matchDetailsDataTransforms';

type TeamMatch = TeamMatchesData['all'][number];

function buildTeamMatch(overrides: Partial<TeamMatch>): TeamMatch {
  return {
    fixtureId: 'fixture',
    leagueId: null,
    leagueName: null,
    leagueLogo: null,
    date: null,
    round: null,
    venue: null,
    status: 'finished',
    statusLabel: null,
    minute: null,
    homeTeamId: null,
    homeTeamName: null,
    homeTeamLogo: null,
    awayTeamId: null,
    awayTeamName: null,
    awayTeamLogo: null,
    homeGoals: null,
    awayGoals: null,
    ...overrides,
  };
}

describe('matchDetailsDataTransforms', () => {
  it('prefers same-competition finished recent results and limits output to five rows', () => {
    const rows = toRecentResultRows({
      teamId: '1',
      leagueId: 61,
      matches: [
        buildTeamMatch({
          fixtureId: 'fallback-finished',
          leagueId: '999',
          date: '2026-02-01T12:00:00.000Z',
          homeTeamId: '1',
          homeTeamName: 'Home',
          homeTeamLogo: '',
          awayTeamId: '10',
          awayTeamName: 'A',
          awayTeamLogo: '',
          homeGoals: 2,
          awayGoals: 1,
        }),
        buildTeamMatch({
          fixtureId: 'same-1',
          leagueId: '61',
          date: '2026-02-06T12:00:00.000Z',
          homeTeamId: '1',
          homeTeamName: 'Home',
          homeTeamLogo: '',
          awayTeamId: '11',
          awayTeamName: 'B',
          awayTeamLogo: '',
          homeGoals: 3,
          awayGoals: 0,
        }),
        buildTeamMatch({
          fixtureId: 'same-2',
          leagueId: '61',
          date: '2026-02-05T12:00:00.000Z',
          homeTeamId: '12',
          homeTeamName: 'C',
          homeTeamLogo: '',
          awayTeamId: '1',
          awayTeamName: 'Home',
          awayTeamLogo: '',
          homeGoals: 1,
          awayGoals: 2,
        }),
        buildTeamMatch({
          fixtureId: 'same-upcoming',
          leagueId: '61',
          date: '2026-02-04T12:00:00.000Z',
          status: 'upcoming',
          homeTeamId: '1',
          homeTeamName: 'Home',
          homeTeamLogo: '',
          awayTeamId: '13',
          awayTeamName: 'D',
          awayTeamLogo: '',
        }),
        buildTeamMatch({
          fixtureId: 'same-3',
          leagueId: '61',
          date: '2026-02-03T12:00:00.000Z',
          homeTeamId: '1',
          homeTeamName: 'Home',
          homeTeamLogo: '',
          awayTeamId: '14',
          awayTeamName: 'E',
          awayTeamLogo: '',
          homeGoals: 1,
          awayGoals: 1,
        }),
        buildTeamMatch({
          fixtureId: 'same-4',
          leagueId: '61',
          date: '2026-02-02T12:00:00.000Z',
          homeTeamId: '1',
          homeTeamName: 'Home',
          homeTeamLogo: '',
          awayTeamId: '15',
          awayTeamName: 'F',
          awayTeamLogo: '',
          homeGoals: 0,
          awayGoals: 1,
        }),
        buildTeamMatch({
          fixtureId: 'same-5',
          leagueId: '61',
          date: '2026-02-01T11:00:00.000Z',
          homeTeamId: '16',
          homeTeamName: 'G',
          homeTeamLogo: '',
          awayTeamId: '1',
          awayTeamName: 'Home',
          awayTeamLogo: '',
          homeGoals: 0,
          awayGoals: 2,
        }),
        buildTeamMatch({
          fixtureId: 'same-6',
          leagueId: '61',
          date: '2026-01-31T11:00:00.000Z',
          homeTeamId: '1',
          homeTeamName: 'Home',
          homeTeamLogo: '',
          awayTeamId: '17',
          awayTeamName: 'H',
          awayTeamLogo: '',
          homeGoals: 4,
          awayGoals: 1,
        }),
      ],
    });

    expect(rows).toHaveLength(5);
    expect(rows.map(row => row.fixtureId)).toEqual(['same-1', 'same-2', 'same-3', 'same-4', 'same-5']);
    expect(rows.map(row => row.result)).toEqual(['W', 'W', 'D', 'L', 'W']);
  });

  it('falls back to all upcoming competitions when the current competition has none', () => {
    const rows = toUpcomingRows({
      leagueId: 61,
      locale: 'fr-FR',
      matches: [
        buildTeamMatch({
          fixtureId: 'all-2',
          leagueId: '999',
          leagueName: 'Cup',
          leagueLogo: null,
          date: '2026-03-10T20:00:00.000Z',
          status: 'upcoming',
          homeTeamId: '1',
          homeTeamName: 'Home',
          homeTeamLogo: '',
          awayTeamId: '20',
          awayTeamName: 'Away A',
          awayTeamLogo: '',
        }),
        buildTeamMatch({
          fixtureId: 'all-1',
          leagueId: '998',
          leagueName: 'Super Cup',
          leagueLogo: null,
          date: '2026-03-09T20:00:00.000Z',
          status: 'upcoming',
          homeTeamId: '1',
          homeTeamName: 'Home',
          homeTeamLogo: '',
          awayTeamId: '21',
          awayTeamName: 'Away B',
          awayTeamLogo: '',
        }),
      ],
    });

    expect(rows.map(row => row.fixtureId)).toEqual(['all-1', 'all-2']);
    expect(rows.every(row => typeof row.kickoffDisplay === 'string')).toBe(true);
  });

  it('keeps dataset fallback rows and classifies 404 as endpoint not available', () => {
    const fallbackResolution = resolveDatasetWithFallback({
      queryData: [],
      fallbackData: [{ id: 1 }],
      queryError: new ApiError('HTTP 500', 500, ''),
      isQueryError: true,
    });
    const notAvailableResolution = resolveDatasetWithFallback({
      queryData: [],
      fallbackData: [],
      queryError: new ApiError('HTTP 404', 404, ''),
      isQueryError: true,
    });

    expect(fallbackResolution).toEqual({
      data: [{ id: 1 }],
      source: 'fixture_fallback',
      isError: false,
      errorReason: 'none',
    });
    expect(notAvailableResolution).toEqual({
      data: [],
      source: 'none',
      isError: true,
      errorReason: 'endpoint_not_available',
    });
  });

  it('shows pre-match lineups only inside the 20-minute visibility window', () => {
    const nowMs = new Date('2026-03-10T19:40:00.000Z').getTime();

    expect(
      isWithinPreMatchLineupsVisibilityWindow('2026-03-10T19:59:00.000Z', nowMs),
    ).toBe(true);
    expect(
      isWithinPreMatchLineupsVisibilityWindow('2026-03-10T20:01:00.000Z', nowMs),
    ).toBe(false);
    expect(
      isWithinPreMatchLineupsVisibilityWindow('2026-03-10T20:10:00.000Z', nowMs),
    ).toBe(false);
  });
});
