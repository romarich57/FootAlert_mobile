import type {
  ApiFootballFixtureDto,
  CompetitionSection,
  MatchItem,
  MatchLineupPlayer,
  MatchLineupTeam,
  MatchStatus,
} from '@domain/contracts/matches.types';
import { TOP_COMPETITION_IDS } from '@/shared/constants';

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'SUSP', 'LIVE']);
const UPCOMING_STATUSES = new Set(['TBD', 'NS']);
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO']);
const LONG_STATUS_FINISHED_HINTS = [
  'finished',
  'after penalties',
  'penalties',
  'fulltime',
  'full time',
  'awarded',
  'walkover',
  'abandoned',
  'cancelled',
  'postponed',
];
const LONG_STATUS_LIVE_HINTS = [
  'in play',
  'live',
  '1st half',
  '2nd half',
  'half time',
  'extra time',
  'penalty shootout',
  'suspended',
  'interrupted',
  'break',
];
const LONG_STATUS_UPCOMING_HINTS = ['not started', 'to be defined'];
const TOP_COMPETITION_IDS_SET = new Set<string>(TOP_COMPETITION_IDS);
const TOP_COMPETITION_PRIORITY = TOP_COMPETITION_IDS.reduce<Record<string, number>>(
  (accumulator, competitionId, index) => {
    accumulator[competitionId] = index;
    return accumulator;
  },
  {},
);

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some(needle => haystack.includes(needle));
}

function normalizeStatus(
  shortStatus: string,
  longStatus?: string | null,
  elapsedMinute?: number | null,
): MatchStatus {
  const normalizedShortStatus = shortStatus.trim().toUpperCase();
  const normalizedLongStatus = (longStatus ?? '').trim().toLowerCase();

  if (LIVE_STATUSES.has(normalizedShortStatus)) {
    return 'live';
  }

  if (UPCOMING_STATUSES.has(normalizedShortStatus)) {
    return 'upcoming';
  }

  if (FINISHED_STATUSES.has(normalizedShortStatus)) {
    return 'finished';
  }

  if (normalizedLongStatus.length > 0) {
    if (includesAny(normalizedLongStatus, LONG_STATUS_FINISHED_HINTS)) {
      return 'finished';
    }

    if (includesAny(normalizedLongStatus, LONG_STATUS_LIVE_HINTS)) {
      return 'live';
    }

    if (includesAny(normalizedLongStatus, LONG_STATUS_UPCOMING_HINTS)) {
      return 'upcoming';
    }
  }

  if (typeof elapsedMinute === 'number' && Number.isFinite(elapsedMinute) && elapsedMinute > 0) {
    return 'live';
  }

  return 'upcoming';
}

function isTopCompetition(competitionId: string): boolean {
  return TOP_COMPETITION_IDS_SET.has(competitionId);
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
  const status = normalizeStatus(
    dto.fixture.status.short,
    dto.fixture.status.long,
    dto.fixture.status.elapsed,
  );

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

const COMPETITION_WEIGHTS: Record<string, number> = {
  // Top International Tournaments
  '1': 110, // World Cup
  '4': 105, // Euro Championship
  '9': 100, // Copa America
  '12': 95, // Africa Cup of Nations
  // Top European Clubs
  '2': 100, // UEFA Champions League
  '3': 90,  // UEFA Europa League
  '848': 85, // UEFA Europa Conference League
  // Top 5 Leagues
  '39': 95, // Premier League (England)
  '140': 90, // La Liga (Spain)
  '61': 85, // Ligue 1 (France)
  '78': 85, // Bundesliga (Germany)
  '135': 85, // Serie A (Italy)
  // Others
  '94': 70, // Primeira Liga (Portugal)
  '88': 70, // Eredivisie (Netherlands)
  '301': 65, // Ligue 2 (France)
  '40': 65, // Championship (England)
  '141': 65, // Segunda Division (Spain)
  '136': 65, // Serie B (Italy)
  '79': 65, // 2. Bundesliga (Germany)
};

function getCompetitionWeight(competitionId: string, competitionName: string): number {
  if (COMPETITION_WEIGHTS[competitionId]) {
    return COMPETITION_WEIGHTS[competitionId];
  }

  const normalizedName = competitionName.trim().toLowerCase();
  if (normalizedName.includes('champions league')) return 100;
  if (normalizedName.includes('europa league')) return 90;
  if (normalizedName.includes('premier league')) return 95;
  if (normalizedName.includes('ligue 1')) return 85;
  if (normalizedName.includes('bundesliga')) return 85;
  if (normalizedName.includes('serie a')) return 85;
  if (normalizedName.includes('la liga')) return 90;

  // Fallback weights based on general names
  if (normalizedName.includes('cup') || normalizedName.includes('coupe')) return 50;
  if (normalizedName.includes('league 1') || normalizedName.includes('division 1')) return 60;
  if (normalizedName.includes('league 2') || normalizedName.includes('division 2') || normalizedName.includes('ligue 2')) return 40;

  return 10; // Default weight
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
        isTopCompetition: isTopCompetition(sectionId),
        matches: [match],
        weight: getCompetitionWeight(sectionId, match.competitionName),
      });
      return;
    }

    existingSection.isTopCompetition =
      Boolean(existingSection.isTopCompetition) || isTopCompetition(sectionId);
    existingSection.matches.push(match);
    existingSection.weight = existingSection.weight || getCompetitionWeight(sectionId, match.competitionName);
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
    const topA = Boolean(a.isTopCompetition);
    const topB = Boolean(b.isTopCompetition);
    if (topA !== topB) {
      return topA ? -1 : 1;
    }

    if (topA && topB) {
      const priorityA = TOP_COMPETITION_PRIORITY[a.id] ?? Number.MAX_SAFE_INTEGER;
      const priorityB = TOP_COMPETITION_PRIORITY[b.id] ?? Number.MAX_SAFE_INTEGER;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
    }

    const weightA = a.weight ?? 0;
    const weightB = b.weight ?? 0;

    if (weightA !== weightB) {
      return weightB - weightA; // Higher weight first
    }

    return a.name.localeCompare(b.name);
  });
  return sections;
}

export function hasLiveMatches(sections: CompetitionSection[]): boolean {
  return sections.some(section => section.matches.some(match => match.status === 'live'));
}

export function isFixtureLive(
  shortStatus: string,
  longStatus?: string | null,
  elapsedMinute?: number | null,
): boolean {
  return normalizeStatus(shortStatus, longStatus, elapsedMinute) === 'live';
}

export function classifyFixtureStatus(
  shortStatus: string,
  longStatus?: string | null,
  elapsedMinute?: number | null,
): MatchStatus {
  return normalizeStatus(shortStatus, longStatus, elapsedMinute);
}

// --- LINEUPS MAPPERS ---

type RawRecord = Record<string, unknown>;

function toRecord(value: unknown): RawRecord | null {
  if (!value || typeof value !== 'object') return null;
  return value as RawRecord;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toText(value: unknown): string;
function toText<T extends string | null>(value: unknown, fallback: T): T;
function toText(value: unknown, fallback: string | null = ''): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function mapLineupPlayer(
  rawRecord: unknown,
  fallbackTeamId: string,
  fallbackIndex: number,
): MatchLineupPlayer {
  const wrapper = toRecord(rawRecord);
  const player = toRecord(wrapper?.player);
  const playerId = toText(player?.id);
  const playerName = toText(player?.name, 'Joueur Inconnu');
  const fallbackNameSlug = playerName.toLowerCase().replace(/\s+/g, '-');

  return {
    id: playerId || `${fallbackTeamId}-${fallbackNameSlug}-${fallbackIndex}`,
    name: playerName,
    photo: toText(player?.photo, null),
    number: typeof player?.number === 'number' ? player.number : null,
    position: toText(player?.pos, null),
    grid: toText(player?.grid, null),
    isCaptain: null,
    // Performance stats will be merged later in the details screen model
    rating: null,
    goals: null,
    assists: null,
    yellowCards: null,
    redCards: null,
    inMinute: null,
    outMinute: null,
    penaltyScored: null,
    penaltyMissed: null,
    statusTag: null,
  };
}

export function mapMatchLineupTeam(rawLineup: unknown): Omit<MatchLineupTeam, 'absences'> | null {
  const lineup = toRecord(rawLineup);
  if (!lineup) return null;

  const team = toRecord(lineup.team);
  const coach = toRecord(lineup.coach);
  const teamId = toText(team?.id);

  if (!teamId) return null;

  return {
    teamId,
    teamName: toText(team?.name, 'Équipe'),
    teamLogo: toText(team?.logo, null),
    formation: toText(lineup.formation, null),
    coach: toText(coach?.name, null),
    coachPhoto: toText(coach?.photo, null),
    startingXI: toArray(lineup.startXI).map((player, index) => mapLineupPlayer(player, teamId, index)),
    substitutes: toArray(lineup.substitutes).map((player, index) =>
      mapLineupPlayer(player, teamId, index),
    ),
    reserves: [],
  };
}
