import type { ApiFootballFixtureDto } from '@ui/features/matches/types/matches.types';
import type {
  MatchPostMatchSection,
  MatchPostMatchTabViewModel,
  MatchPreMatchSection,
  MatchPreMatchTabViewModel,
} from '@ui/features/matches/types/matches.types';
import type {
  TeamTopPlayersByCategory,
} from '@ui/features/teams/types/teams.types';

import {
  hasWeatherData,
  pickWeather,
  toId,
  toLeaderPlayer,
  toNullableText,
  toNumber,
  toRawRecord,
  type MatchStandingsData,
  type RawRecord,
  type TeamContextMatch,
  toRecentResultRows,
  toUpcomingRows,
  formatKickoffWithDate,
} from '@ui/features/matches/details/hooks/matchDetailsDataTransforms';

type BuildPreMatchSectionsInput = {
  isLoading: boolean;
  fixture: ApiFootballFixtureDto | null;
  fixtureRecord: RawRecord | null;
  predictionsPercent: {
    home: string | null;
    draw: string | null;
    away: string | null;
  };
  winPercent: {
    home: string;
    draw: string;
    away: string;
  };
  leagueId: number | undefined;
  locale: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeRecentMatches: TeamContextMatch[];
  awayRecentMatches: TeamContextMatch[];
  standings: MatchStandingsData;
  homeLeaders: TeamTopPlayersByCategory | null;
  awayLeaders: TeamTopPlayersByCategory | null;
};

type BuildPostMatchSectionsInput = {
  isLoading: boolean;
  fixture: ApiFootballFixtureDto | null;
  fixtureRecord: RawRecord | null;
  leagueId: number | undefined;
  locale: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamMatches: TeamContextMatch[];
  awayTeamMatches: TeamContextMatch[];
  standings: MatchStandingsData;
};

export function buildPreMatchSections({
  isLoading,
  fixture,
  fixtureRecord,
  predictionsPercent,
  winPercent,
  leagueId,
  locale,
  homeTeamId,
  awayTeamId,
  homeRecentMatches,
  awayRecentMatches,
  standings,
  homeLeaders,
  awayLeaders,
}: BuildPreMatchSectionsInput): MatchPreMatchTabViewModel {
  const homeTeamName = fixture?.teams.home.name ?? '';
  const awayTeamName = fixture?.teams.away.name ?? '';

  const fixtureNode = toRawRecord(fixtureRecord?.fixture);
  const venueNode = toRawRecord(fixtureNode?.venue);
  const leagueNode = toRawRecord(fixtureRecord?.league);

  const venueName = toNullableText(fixture?.fixture.venue.name) ?? toNullableText(venueNode?.name);
  const venueCity = toNullableText(fixture?.fixture.venue.city) ?? toNullableText(venueNode?.city);
  const venueCapacity = toNumber(fixture?.fixture.venue.capacity) ?? toNumber(venueNode?.capacity);
  const venueSurface = toNullableText(fixture?.fixture.venue.surface) ?? toNullableText(venueNode?.surface);
  const weather = pickWeather(fixture, fixtureRecord);

  const roundValue = toNullableText(fixture?.league.round) ?? toNullableText(leagueNode?.round);
  const competitionType = toNullableText(fixture?.league.type) ?? toNullableText(leagueNode?.type);
  const refereeValue = toNullableText(fixture?.fixture.referee) ?? toNullableText(fixtureNode?.referee);
  const kickoffDisplay = formatKickoffWithDate(fixture?.fixture.date, locale);

  const shouldShowWinProbability =
    Boolean(predictionsPercent.home) ||
    Boolean(predictionsPercent.draw) ||
    Boolean(predictionsPercent.away);

  const winProbabilitySection: MatchPreMatchSection = {
    id: 'winProbability',
    order: 1,
    isAvailable: shouldShowWinProbability,
    payload: shouldShowWinProbability
      ? {
        homeTeamName,
        awayTeamName,
        home: winPercent.home,
        draw: winPercent.draw,
        away: winPercent.away,
      }
      : null,
  };

  const hasVenueWeatherData =
    Boolean(venueName) ||
    Boolean(venueCity) ||
    typeof venueCapacity === 'number' ||
    Boolean(venueSurface) ||
    hasWeatherData(weather);

  const venueWeatherSection: MatchPreMatchSection = {
    id: 'venueWeather',
    order: 2,
    isAvailable: hasVenueWeatherData,
    payload: hasVenueWeatherData
      ? {
        venueName,
        venueCity,
        capacity: venueCapacity,
        surface: venueSurface,
        weather,
      }
      : null,
  };

  const hasCompetitionMetaData =
    Boolean(fixture?.league.name) ||
    Boolean(roundValue) ||
    Boolean(kickoffDisplay) ||
    Boolean(refereeValue) ||
    Boolean(competitionType);

  const competitionMetaSection: MatchPreMatchSection = {
    id: 'competitionMeta',
    order: 3,
    isAvailable: hasCompetitionMetaData,
    payload: hasCompetitionMetaData
      ? {
        competitionId: toId(fixture?.league.id),
        competitionName: toNullableText(fixture?.league.name),
        competitionType,
        competitionRound: roundValue,
        kickoffDateIso: toNullableText(fixture?.fixture.date),
        kickoffDisplay,
        referee: refereeValue,
      }
      : null,
  };

  const homeRecentRows =
    homeTeamId && typeof leagueId === 'number'
      ? toRecentResultRows({
        matches: homeRecentMatches,
        teamId: homeTeamId,
        leagueId,
      })
      : [];
  const awayRecentRows =
    awayTeamId && typeof leagueId === 'number'
      ? toRecentResultRows({
        matches: awayRecentMatches,
        teamId: awayTeamId,
        leagueId,
      })
      : [];
  const hasRecentResultsData = homeRecentRows.length > 0 || awayRecentRows.length > 0;

  const recentResultsSection: MatchPreMatchSection = {
    id: 'recentResults',
    order: 4,
    isAvailable: hasRecentResultsData,
    payload: hasRecentResultsData
      ? {
        home: {
          teamId: homeTeamId,
          teamName: homeTeamName,
          teamLogo: fixture?.teams.home.logo ?? null,
          matches: homeRecentRows,
        },
        away: {
          teamId: awayTeamId,
          teamName: awayTeamName,
          teamLogo: fixture?.teams.away.logo ?? null,
          matches: awayRecentRows,
        },
      }
      : null,
  };

  const standingsRows = (standings?.league?.standings ?? []).flat();
  const homeStandingRow = standingsRows.find(row => String(row.team.id) === homeTeamId) ?? null;
  const awayStandingRow = standingsRows.find(row => String(row.team.id) === awayTeamId) ?? null;
  const hasStandingsData = homeStandingRow !== null && awayStandingRow !== null;

  const standingsSection: MatchPreMatchSection = {
    id: 'standings',
    order: 5,
    isAvailable: hasStandingsData,
    payload: hasStandingsData
      ? {
        competitionName: toNullableText(standings?.league?.name) ?? toNullableText(fixture?.league.name),
        home: {
          teamId: homeTeamId,
          teamName: homeStandingRow?.team.name ?? null,
          teamLogo: homeStandingRow?.team.logo ?? null,
          rank: homeStandingRow?.rank ?? null,
          played: homeStandingRow?.all.played ?? null,
          win: homeStandingRow?.all.win ?? null,
          draw: homeStandingRow?.all.draw ?? null,
          lose: homeStandingRow?.all.lose ?? null,
          goalDiff: homeStandingRow?.goalsDiff ?? null,
          points: homeStandingRow?.points ?? null,
        },
        away: {
          teamId: awayTeamId,
          teamName: awayStandingRow?.team.name ?? null,
          teamLogo: awayStandingRow?.team.logo ?? null,
          rank: awayStandingRow?.rank ?? null,
          played: awayStandingRow?.all.played ?? null,
          win: awayStandingRow?.all.win ?? null,
          draw: awayStandingRow?.all.draw ?? null,
          lose: awayStandingRow?.all.lose ?? null,
          goalDiff: awayStandingRow?.goalsDiff ?? null,
          points: awayStandingRow?.points ?? null,
        },
      }
      : null,
  };

  const homeTopScorer = toLeaderPlayer(homeLeaders?.scorers?.[0]);
  const homeTopAssister = toLeaderPlayer(homeLeaders?.assisters?.[0]);
  const awayTopScorer = toLeaderPlayer(awayLeaders?.scorers?.[0]);
  const awayTopAssister = toLeaderPlayer(awayLeaders?.assisters?.[0]);
  const hasLeadersData =
    (homeTopScorer !== null || homeTopAssister !== null) &&
    (awayTopScorer !== null || awayTopAssister !== null);

  const leadersSection: MatchPreMatchSection = {
    id: 'leadersComparison',
    order: 6,
    isAvailable: hasLeadersData,
    payload: hasLeadersData
      ? {
        home: {
          teamId: homeTeamId,
          teamName: homeTeamName,
          teamLogo: fixture?.teams.home.logo ?? null,
          topScorer: homeTopScorer,
          topAssister: homeTopAssister,
        },
        away: {
          teamId: awayTeamId,
          teamName: awayTeamName,
          teamLogo: fixture?.teams.away.logo ?? null,
          topScorer: awayTopScorer,
          topAssister: awayTopAssister,
        },
      }
      : null,
  };

  const sectionsOrdered = [
    winProbabilitySection,
    venueWeatherSection,
    competitionMetaSection,
    recentResultsSection,
    standingsSection,
    leadersSection,
  ];

  return {
    sectionsOrdered,
    hasAnySection: sectionsOrdered.some(section => section.isAvailable),
    isLoading,
  };
}

export function buildPostMatchSections({
  isLoading,
  fixture,
  fixtureRecord,
  leagueId,
  locale,
  homeTeamId,
  awayTeamId,
  homeTeamMatches,
  awayTeamMatches,
  standings,
}: BuildPostMatchSectionsInput): MatchPostMatchTabViewModel {
  const homeTeamName = fixture?.teams.home.name ?? '';
  const awayTeamName = fixture?.teams.away.name ?? '';

  const fixtureNode = toRawRecord(fixtureRecord?.fixture);
  const venueNode = toRawRecord(fixtureNode?.venue);
  const leagueNode = toRawRecord(fixtureRecord?.league);

  const venueName = toNullableText(fixture?.fixture.venue.name) ?? toNullableText(venueNode?.name);
  const venueCity = toNullableText(fixture?.fixture.venue.city) ?? toNullableText(venueNode?.city);
  const venueCapacity = toNumber(fixture?.fixture.venue.capacity) ?? toNumber(venueNode?.capacity);
  const venueSurface = toNullableText(fixture?.fixture.venue.surface) ?? toNullableText(venueNode?.surface);
  const weather = pickWeather(fixture, fixtureRecord);

  const roundValue = toNullableText(fixture?.league.round) ?? toNullableText(leagueNode?.round);
  const competitionType = toNullableText(fixture?.league.type) ?? toNullableText(leagueNode?.type);
  const refereeValue = toNullableText(fixture?.fixture.referee) ?? toNullableText(fixtureNode?.referee);
  const kickoffDisplay = formatKickoffWithDate(fixture?.fixture.date, locale);

  const hasVenueWeatherData =
    Boolean(venueName) ||
    Boolean(venueCity) ||
    typeof venueCapacity === 'number' ||
    Boolean(venueSurface) ||
    hasWeatherData(weather);

  const venueWeatherSection: MatchPostMatchSection = {
    id: 'venueWeather',
    order: 4,
    isAvailable: hasVenueWeatherData,
    payload: hasVenueWeatherData
      ? {
        venueName,
        venueCity,
        capacity: venueCapacity,
        surface: venueSurface,
        weather,
      }
      : null,
  };

  const hasCompetitionMetaData =
    Boolean(fixture?.league.name) ||
    Boolean(roundValue) ||
    Boolean(kickoffDisplay) ||
    Boolean(refereeValue) ||
    Boolean(competitionType);

  const competitionMetaSection: MatchPostMatchSection = {
    id: 'competitionMeta',
    order: 5,
    isAvailable: hasCompetitionMetaData,
    payload: hasCompetitionMetaData
      ? {
        competitionId: toId(fixture?.league.id),
        competitionName: toNullableText(fixture?.league.name),
        competitionType,
        competitionRound: roundValue,
        kickoffDateIso: toNullableText(fixture?.fixture.date),
        kickoffDisplay,
        referee: refereeValue,
      }
      : null,
  };

  const standingsRows = (standings?.league?.standings ?? []).flat();
  const homeStandingRow = standingsRows.find(row => String(row.team.id) === homeTeamId) ?? null;
  const awayStandingRow = standingsRows.find(row => String(row.team.id) === awayTeamId) ?? null;
  const hasStandingsData = homeStandingRow !== null && awayStandingRow !== null;

  const standingsSection: MatchPostMatchSection = {
    id: 'standings',
    order: 6,
    isAvailable: hasStandingsData,
    payload: hasStandingsData
      ? {
        competitionName: toNullableText(standings?.league?.name) ?? toNullableText(fixture?.league.name),
        home: {
          teamId: homeTeamId,
          teamName: homeStandingRow?.team.name ?? null,
          teamLogo: homeStandingRow?.team.logo ?? null,
          rank: homeStandingRow?.rank ?? null,
          played: homeStandingRow?.all.played ?? null,
          win: homeStandingRow?.all.win ?? null,
          draw: homeStandingRow?.all.draw ?? null,
          lose: homeStandingRow?.all.lose ?? null,
          goalDiff: homeStandingRow?.goalsDiff ?? null,
          points: homeStandingRow?.points ?? null,
        },
        away: {
          teamId: awayTeamId,
          teamName: awayStandingRow?.team.name ?? null,
          teamLogo: awayStandingRow?.team.logo ?? null,
          rank: awayStandingRow?.rank ?? null,
          played: awayStandingRow?.all.played ?? null,
          win: awayStandingRow?.all.win ?? null,
          draw: awayStandingRow?.all.draw ?? null,
          lose: awayStandingRow?.all.lose ?? null,
          goalDiff: awayStandingRow?.goalsDiff ?? null,
          points: awayStandingRow?.points ?? null,
        },
      }
      : null,
  };

  const homeRecentRows =
    homeTeamId && typeof leagueId === 'number'
      ? toRecentResultRows({
        matches: homeTeamMatches,
        teamId: homeTeamId,
        leagueId,
      })
      : [];
  const awayRecentRows =
    awayTeamId && typeof leagueId === 'number'
      ? toRecentResultRows({
        matches: awayTeamMatches,
        teamId: awayTeamId,
        leagueId,
      })
      : [];
  const hasRecentResultsData = homeRecentRows.length > 0 || awayRecentRows.length > 0;

  const recentResultsSection: MatchPostMatchSection = {
    id: 'recentResults',
    order: 7,
    isAvailable: hasRecentResultsData,
    payload: hasRecentResultsData
      ? {
        home: {
          teamId: homeTeamId,
          teamName: homeTeamName,
          teamLogo: fixture?.teams.home.logo ?? null,
          matches: homeRecentRows,
        },
        away: {
          teamId: awayTeamId,
          teamName: awayTeamName,
          teamLogo: fixture?.teams.away.logo ?? null,
          matches: awayRecentRows,
        },
      }
      : null,
  };

  const homeUpcomingRows =
    typeof leagueId === 'number'
      ? toUpcomingRows({
        matches: homeTeamMatches,
        leagueId,
        locale,
      })
      : [];
  const awayUpcomingRows =
    typeof leagueId === 'number'
      ? toUpcomingRows({
        matches: awayTeamMatches,
        leagueId,
        locale,
      })
      : [];
  const hasUpcomingData = homeUpcomingRows.length > 0 || awayUpcomingRows.length > 0;

  const upcomingMatchesSection: MatchPostMatchSection = {
    id: 'upcomingMatches',
    order: 8,
    isAvailable: hasUpcomingData,
    payload: hasUpcomingData
      ? {
        home: {
          teamId: homeTeamId,
          teamName: homeTeamName,
          teamLogo: fixture?.teams.home.logo ?? null,
          matches: homeUpcomingRows,
        },
        away: {
          teamId: awayTeamId,
          teamName: awayTeamName,
          teamLogo: fixture?.teams.away.logo ?? null,
          matches: awayUpcomingRows,
        },
      }
      : null,
  };

  const sectionsOrdered: MatchPostMatchSection[] = [
    venueWeatherSection,
    competitionMetaSection,
    standingsSection,
    recentResultsSection,
    upcomingMatchesSection,
  ];

  return {
    sectionsOrdered,
    hasAnySection: sectionsOrdered.some(section => section.isAvailable),
    isLoading,
  };
}
