import type {
  ApiFootballFixtureDto,
  CompetitionSection,
  MatchItem,
  MatchStatus,
} from '@ui/features/matches/types/matches.types';
import { TOP_COMPETITION_IDS } from '@/shared/constants';

const LIVE_STATUSES = new Set(['1H', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);
const UPCOMING_STATUSES = new Set(['TBD', 'NS']);
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO']);
const TOP_COMPETITION_IDS_SET = new Set<string>(TOP_COMPETITION_IDS);
const TOP_COMPETITION_NAME_HINTS = [
  'champions league',
  'uefa champions league',
  'europa league',
  'premier league',
  'ligue 1',
  'bundesliga',
  'serie a',
  'la liga',
];

function normalizeStatus(shortStatus: string): MatchStatus {
  if (LIVE_STATUSES.has(shortStatus)) {
    return 'live';
  }

  if (UPCOMING_STATUSES.has(shortStatus)) {
    return 'upcoming';
  }

  if (FINISHED_STATUSES.has(shortStatus)) {
    return 'finished';
  }

  return 'upcoming';
}

function isTopCompetition(competitionId: string, competitionName: string): boolean {
  if (TOP_COMPETITION_IDS_SET.has(competitionId)) {
    return true;
  }

  const normalizedCompetitionName = competitionName.trim().toLowerCase();
  return TOP_COMPETITION_NAME_HINTS.some(nameHint => normalizedCompetitionName.includes(nameHint));
}

export function formatStatusLabel(
  status: MatchStatus,
  elapsedMinute: number | null,
  shortStatus: string,
): string {
  if (status === 'live' && elapsedMinute) {
    return `${elapsedMinute}'`;
  }

  if (status === 'finished') {
    return 'FT';
  }

  return shortStatus;
}

export function mapFixtureToMatchItem(dto: ApiFootballFixtureDto): MatchItem {
  const status = normalizeStatus(dto.fixture.status.short);

  return {
    fixtureId: String(dto.fixture.id),
    competitionId: String(dto.league.id),
    competitionName: dto.league.name,
    competitionLogo: dto.league.logo,
    competitionCountry: dto.league.country,
    startDate: dto.fixture.date,
    minute: dto.fixture.status.elapsed,
    venue: dto.fixture.venue.name ?? '',
    status,
    statusLabel: formatStatusLabel(status, dto.fixture.status.elapsed, dto.fixture.status.short),
    homeTeamId: String(dto.teams.home.id),
    homeTeamName: dto.teams.home.name,
    homeTeamLogo: dto.teams.home.logo,
    awayTeamId: String(dto.teams.away.id),
    awayTeamName: dto.teams.away.name,
    awayTeamLogo: dto.teams.away.logo,
    homeGoals: dto.goals.home,
    awayGoals: dto.goals.away,
    hasBroadcast: false,
  };
}

export function mapFixturesToSections(fixtures: ApiFootballFixtureDto[]): CompetitionSection[] {
  const byCompetition = new Map<string, CompetitionSection>();

  fixtures.forEach(fixture => {
    const match = mapFixtureToMatchItem(fixture);
    const sectionId = match.competitionId;
    const existingSection = byCompetition.get(sectionId);

    if (!existingSection) {
      byCompetition.set(sectionId, {
        id: sectionId,
        name: match.competitionName,
        logo: match.competitionLogo,
        country: match.competitionCountry,
        isTopCompetition: isTopCompetition(sectionId, match.competitionName),
        matches: [match],
      });
      return;
    }

    existingSection.isTopCompetition =
      Boolean(existingSection.isTopCompetition) || isTopCompetition(sectionId, match.competitionName);
    existingSection.matches.push(match);
  });

  const sections = Array.from(byCompetition.values());

  sections.forEach(section => {
    section.matches.sort((a, b) => {
      const firstDate = new Date(a.startDate).getTime();
      const secondDate = new Date(b.startDate).getTime();
      return firstDate - secondDate;
    });
  });

  sections.sort((a, b) => {
    if (a.isTopCompetition === b.isTopCompetition) {
      return a.name.localeCompare(b.name);
    }
    return a.isTopCompetition ? -1 : 1;
  });
  return sections;
}

export function hasLiveMatches(sections: CompetitionSection[]): boolean {
  return sections.some(section => section.matches.some(match => match.status === 'live'));
}

export function isFixtureLive(shortStatus: string): boolean {
  return normalizeStatus(shortStatus) === 'live';
}

export function classifyFixtureStatus(shortStatus: string): MatchStatus {
  return normalizeStatus(shortStatus);
}
