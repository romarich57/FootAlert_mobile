import type {
  TeamApiLeagueDto,
  TeamApiTeamDetailsDto,
  TeamCompetitionOption,
  TeamIdentity,
  TeamMatchStatus,
  TeamSelection,
} from '@domain/contracts/teams.types';

import { toId, toNumber, toText } from './shared';

const LIVE_STATUSES = new Set(['1H', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);
const UPCOMING_STATUSES = new Set(['TBD', 'NS']);

export function classifyTeamMatchStatus(shortStatus: string | null | undefined): TeamMatchStatus {
  const normalizedStatus = toText(shortStatus)?.toUpperCase() ?? '';

  if (LIVE_STATUSES.has(normalizedStatus)) {
    return 'live';
  }

  if (UPCOMING_STATUSES.has(normalizedStatus)) {
    return 'upcoming';
  }

  return 'finished';
}

export function mapTeamDetails(dto: TeamApiTeamDetailsDto | null, teamId: string): TeamIdentity {
  return {
    id: teamId,
    name: toText(dto?.team?.name),
    logo: toText(dto?.team?.logo),
    country: toText(dto?.team?.country),
    founded: toNumber(dto?.team?.founded),
    venueName: toText(dto?.venue?.name),
    venueCity: toText(dto?.venue?.city),
    venueCapacity: toNumber(dto?.venue?.capacity),
    venueImage: toText(dto?.venue?.image),
  };
}

function sortSeasonsDesc(seasons: number[]): number[] {
  return [...seasons].sort((first, second) => second - first);
}

export function mapTeamLeaguesToCompetitionOptions(
  payload: TeamApiLeagueDto[],
): TeamCompetitionOption[] {
  const mapped = payload
    .map<TeamCompetitionOption | null>(item => {
      const leagueId = toId(item.league?.id);
      if (!leagueId) {
        return null;
      }

      const seasons = (item.seasons ?? [])
        .map(season => toNumber(season.year))
        .filter((year): year is number => typeof year === 'number');

      const currentSeason =
        item.seasons?.find(season => season.current === true)?.year ?? null;

      return {
        leagueId,
        leagueName: toText(item.league?.name),
        leagueLogo: toText(item.league?.logo),
        type: toText(item.league?.type),
        country: toText(item.country?.name),
        seasons: sortSeasonsDesc(Array.from(new Set(seasons))),
        currentSeason: toNumber(currentSeason),
      };
    })
    .filter((item): item is TeamCompetitionOption => item !== null)
    .sort((first, second) => {
      const firstName = first.leagueName ?? '';
      const secondName = second.leagueName ?? '';
      return firstName.localeCompare(secondName);
    });

  return mapped;
}

export function resolveDefaultTeamSelection(
  options: TeamCompetitionOption[],
): TeamSelection {
  const selectMostRecent = (items: TeamCompetitionOption[]): TeamCompetitionOption | null =>
    [...items]
      .filter(item => item.seasons.length > 0)
      .sort((first, second) => (second.seasons[0] ?? 0) - (first.seasons[0] ?? 0))[0] ?? null;

  const leagueWithCurrentSeason = options.find(
    option =>
      option.type?.toLowerCase() === 'league' &&
      typeof option.currentSeason === 'number',
  );

  if (leagueWithCurrentSeason) {
    return {
      leagueId: leagueWithCurrentSeason.leagueId,
      season: leagueWithCurrentSeason.currentSeason,
    };
  }

  const withCurrentSeason = options.find(option => typeof option.currentSeason === 'number');

  if (withCurrentSeason) {
    return {
      leagueId: withCurrentSeason.leagueId,
      season: withCurrentSeason.currentSeason,
    };
  }

  const leagueWithRecentSeason = selectMostRecent(
    options.filter(option => option.type?.toLowerCase() === 'league'),
  );

  if (leagueWithRecentSeason) {
    return {
      leagueId: leagueWithRecentSeason.leagueId,
      season: leagueWithRecentSeason.seasons[0] ?? null,
    };
  }

  const withRecentSeason = selectMostRecent(options);
  if (withRecentSeason) {
    return {
      leagueId: withRecentSeason.leagueId,
      season: withRecentSeason.seasons[0] ?? null,
    };
  }

  return {
    leagueId: null,
    season: null,
  };
}
