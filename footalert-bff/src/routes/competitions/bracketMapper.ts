// Mapper bracket/knockout pour les compétitions.
// Agrège les fixtures d'une saison, détecte le type de compétition
// (league / cup / mixed) et construit la structure bracket triée.

// --- Types internes BFF ---

type BracketTeam = {
  id: number | null;
  name: string;
  logo: string;
};

type BracketMatch = {
  matchId: number;
  homeTeam: BracketTeam;
  awayTeam: BracketTeam;
  homeScore: number | null;
  awayScore: number | null;
  penaltyHome: number | null;
  penaltyAway: number | null;
  status: string;
  date: string;
  winnerId: number | null;
};

type KnockoutRound = {
  name: string;
  order: number;
  matches: BracketMatch[];
};

export type CompetitionBracketResult = {
  competitionKind: 'league' | 'cup' | 'mixed';
  bracket: KnockoutRound[] | null;
};

// --- Interfaces de forme partielle pour les guards de type API-Football ---
// Ces interfaces correspondent au format de réponse API-Football et permettent
// d'utiliser la dot-notation tout en restant dans le domaine de unknown.

interface RawTeam {
  id?: unknown;
  name?: unknown;
  logo?: unknown;
}

interface RawStatus {
  short?: unknown;
}

interface RawFixtureData {
  id?: unknown;
  date?: unknown;
  status?: unknown;
}

interface RawTeamsData {
  home?: unknown;
  away?: unknown;
}

interface RawGoalsData {
  home?: unknown;
  away?: unknown;
}

interface RawPenaltyData {
  home?: unknown;
  away?: unknown;
}

interface RawScoreData {
  penalty?: unknown;
}

interface RawLeagueData {
  round?: unknown;
}

interface RawFixture {
  fixture?: unknown;
  league?: unknown;
  teams?: unknown;
  goals?: unknown;
  score?: unknown;
}

const UNKNOWN_ROUND_ORDER = 50_000;
const GROUP_PATTERN = /\bgroup\b/i;

function normalizeRoundName(roundName: string): string {
  return roundName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseRoundOfValue(normalizedRoundName: string): number | null {
  const roundOfMatch = normalizedRoundName.match(/\bround of\s+(\d{1,3})\b/);
  if (roundOfMatch) {
    return Number.parseInt(roundOfMatch[1], 10);
  }

  const lastMatch = normalizedRoundName.match(/\blast\s+(\d{1,3})\b/);
  if (lastMatch) {
    return Number.parseInt(lastMatch[1], 10);
  }

  const fractionMatch = normalizedRoundName.match(/\b1\s*\/\s*(\d{1,3})\b/);
  if (fractionMatch) {
    return Number.parseInt(fractionMatch[1], 10) * 2;
  }

  const englishFinalsMatch = normalizedRoundName.match(/\b(\d{1,3})(?:st|nd|rd|th)\s+finals?\b/);
  if (englishFinalsMatch) {
    return Number.parseInt(englishFinalsMatch[1], 10) * 2;
  }

  const frenchFinalsMatch = normalizedRoundName.match(/\b(\d{1,3})(?:e|eme|er)?\s+de\s+finale\b/);
  if (frenchFinalsMatch) {
    return Number.parseInt(frenchFinalsMatch[1], 10) * 2;
  }

  return null;
}

function parseNumberedRound(normalizedRoundName: string): number | null {
  const englishRoundMatch = normalizedRoundName.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+round\b/);
  if (englishRoundMatch) {
    return Number.parseInt(englishRoundMatch[1], 10);
  }

  const frenchRoundMatch = normalizedRoundName.match(/\b(\d{1,2})(?:er|e)?\s+tour\b/);
  if (frenchRoundMatch) {
    return Number.parseInt(frenchRoundMatch[1], 10);
  }

  return null;
}

/**
 * Classifie un nom de round comme 'group', 'knockout' ou 'unknown'.
 * - Teste d'abord les patterns knockout explicites.
 * - Teste ensuite le pattern group.
 * - Les rounds ambigus retournent 'unknown'.
 */
export function classifyRound(roundName: string): 'group' | 'knockout' | 'unknown' {
  const normalized = normalizeRoundName(roundName);
  if (!normalized) {
    return 'unknown';
  }

  if (GROUP_PATTERN.test(normalized)) return 'group';

  if (parseRoundOfValue(normalized) !== null) {
    return 'knockout';
  }

  if (parseNumberedRound(normalized) !== null) {
    return 'knockout';
  }

  if (normalized.includes('semi') || normalized.includes('demi')) {
    return 'knockout';
  }

  if (normalized.includes('quarter') || normalized.includes('quart')) {
    return 'knockout';
  }

  if (/^finale?s?$/.test(normalized)) {
    return 'knockout';
  }

  if (
    /\bfinal\b/.test(normalized) &&
    !/\bsemi\b/.test(normalized) &&
    !/\bquarter\b/.test(normalized) &&
    !/\bquart\b/.test(normalized)
  ) {
    return 'knockout';
  }

  if (/\b(qualifying|preliminary|elimination|play-?off|barrage)\b/.test(normalized)) {
    return 'knockout';
  }

  return 'unknown';
}

/**
 * Détecte le type de compétition à partir des noms de rounds collectés.
 * - 'mixed'  : la compétition a des poules ET des rounds knockout
 * - 'cup'    : uniquement des rounds knockout (pas de poules)
 * - 'league' : uniquement des poules (ou aucun round particulier détecté)
 */
export function detectCompetitionKind(
  groupNames: Set<string>,
  knockoutRoundNames: Set<string>,
): 'league' | 'cup' | 'mixed' {
  const hasGroups = groupNames.size > 0;
  const hasKnockout = knockoutRoundNames.size > 0;

  if (hasGroups && hasKnockout) return 'mixed';
  if (hasKnockout && !hasGroups) return 'cup';
  return 'league';
}

/**
 * Retourne l'ordre numérique d'un round knockout pour le tri.
 * La clé de recherche est normalisée en minuscules.
 */
function getRoundOrder(roundName: string): number {
  const normalized = normalizeRoundName(roundName);
  if (!normalized) return UNKNOWN_ROUND_ORDER;

  const roundOfValue = parseRoundOfValue(normalized);
  if (roundOfValue !== null) {
    if (roundOfValue >= 16) {
      return 10_000 - roundOfValue;
    }
    if (roundOfValue === 8) return 9_992;
    if (roundOfValue === 4) return 9_996;
    if (roundOfValue === 2) return 10_000;
  }

  if (normalized.includes('quarter') || normalized.includes('quart')) return 9_992;
  if (normalized.includes('semi') || normalized.includes('demi')) return 9_996;
  if (/^finale?s?$/.test(normalized)) return 10_000;

  if (
    /\bfinal\b/.test(normalized) &&
    !/\bsemi\b/.test(normalized) &&
    !/\bquarter\b/.test(normalized) &&
    !/\bquart\b/.test(normalized)
  ) {
    return 10_000;
  }

  const numberedRound = parseNumberedRound(normalized);
  if (numberedRound !== null) {
    return 8_000 + numberedRound;
  }

  if (normalized.includes('preliminary')) return 7_000;
  if (normalized.includes('qualifying')) return 7_500;
  if (/\b(play-?off|barrage)\b/.test(normalized)) return 9_900;

  return UNKNOWN_ROUND_ORDER;
}

// --- Guards de type structurés ---

function isRawFixture(value: unknown): value is RawFixture {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawLeagueData(value: unknown): value is RawLeagueData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawFixtureData(value: unknown): value is RawFixtureData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawTeamsData(value: unknown): value is RawTeamsData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawGoalsData(value: unknown): value is RawGoalsData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawScoreData(value: unknown): value is RawScoreData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawPenaltyData(value: unknown): value is RawPenaltyData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawStatus(value: unknown): value is RawStatus {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawTeam(value: unknown): value is RawTeam {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractTeam(raw: unknown): BracketTeam {
  if (!isRawTeam(raw)) return { id: null, name: '', logo: '' };
  return {
    id: typeof raw.id === 'number' ? raw.id : null,
    name: typeof raw.name === 'string' ? raw.name : '',
    logo: typeof raw.logo === 'string' ? raw.logo : '',
  };
}

function extractNullableInt(value: unknown): number | null {
  if (typeof value === 'number') return value;
  return null;
}

/**
 * Détermine l'id de l'équipe gagnante pour un match terminé.
 * Statuts terminaux : FT (temps réglementaire), AET (après prolongation), PEN (aux tirs au but).
 * En cas de match nul au score, retourne null.
 */
function computeWinnerId(
  status: string,
  homeId: number | null,
  awayId: number | null,
  homeScore: number | null,
  awayScore: number | null,
  penaltyHome: number | null,
  penaltyAway: number | null,
): number | null {
  const terminalStatuses = new Set(['FT', 'AET', 'PEN']);
  if (!terminalStatuses.has(status)) return null;

  // Tirs au but : le vainqueur est déterminé par les penalties
  if (status === 'PEN' && penaltyHome !== null && penaltyAway !== null) {
    if (penaltyHome > penaltyAway) return homeId;
    if (penaltyAway > penaltyHome) return awayId;
    return null;
  }

  if (homeScore === null || awayScore === null) return null;
  if (homeScore > awayScore) return homeId;
  if (awayScore > homeScore) return awayId;
  return null;
}

/**
 * Construit la réponse bracket complète à partir des fixtures brutes API-Football.
 *
 * Format attendu d'un fixture :
 * {
 *   fixture: { id, status: { short }, date },
 *   league:  { round },
 *   teams:   { home: { id, name, logo }, away: { id, name, logo } },
 *   goals:   { home, away },
 *   score:   { penalty: { home, away } }
 * }
 */
export function buildCompetitionBracket(fixtures: unknown[]): CompetitionBracketResult {
  // Accumulation des noms de rounds par catégorie
  const groupNames = new Set<string>();
  const knockoutRoundNames = new Set<string>();

  // Accumulation des fixtures par round knockout
  const knockoutFixturesByRound = new Map<string, unknown[]>();

  for (const rawFixture of fixtures) {
    if (!isRawFixture(rawFixture)) continue;

    // Extraction du nom du round depuis league.round
    const leagueRaw = rawFixture.league;
    if (!isRawLeagueData(leagueRaw)) continue;
    const roundName = typeof leagueRaw.round === 'string' ? leagueRaw.round : '';
    if (!roundName) continue;

    const classification = classifyRound(roundName);

    if (classification === 'group') {
      groupNames.add(roundName);
    } else if (classification === 'knockout') {
      // Rounds knockout explicitement reconnus : inclus dans le bracket
      knockoutRoundNames.add(roundName);
      const existing = knockoutFixturesByRound.get(roundName) ?? [];
      existing.push(rawFixture);
      knockoutFixturesByRound.set(roundName, existing);
    }
    // Rounds 'unknown' (ex: "Regular Season - 1") : ignorés pour la détection du type.
    // Ils ne contribuent ni aux groupes ni au knockout, ce qui laisse detectCompetitionKind
    // retourner 'league' quand il n'y a aucun pattern reconnu.
  }

  const competitionKind = detectCompetitionKind(groupNames, knockoutRoundNames);

  // Les championnats n'ont pas de bracket
  if (competitionKind === 'league') {
    return { competitionKind: 'league', bracket: null };
  }

  // Construction des rounds knockout triés par ordre
  const bracket: KnockoutRound[] = [];

  for (const [roundName, roundFixtures] of knockoutFixturesByRound) {
    const matches: BracketMatch[] = [];

    for (const rawFixture of roundFixtures) {
      if (!isRawFixture(rawFixture)) continue;

      const fixtureData = rawFixture.fixture;
      const teamsData = rawFixture.teams;
      const goalsData = rawFixture.goals;
      const scoreData = rawFixture.score;

      if (!isRawFixtureData(fixtureData)) continue;
      if (!isRawTeamsData(teamsData)) continue;

      const matchId = typeof fixtureData.id === 'number' ? fixtureData.id : 0;
      const date = typeof fixtureData.date === 'string' ? fixtureData.date : '';

      const statusRaw = fixtureData.status;
      const status = isRawStatus(statusRaw) && typeof statusRaw.short === 'string'
        ? statusRaw.short
        : '';

      const homeTeam = extractTeam(teamsData.home);
      const awayTeam = extractTeam(teamsData.away);

      let homeScore: number | null = null;
      let awayScore: number | null = null;
      if (isRawGoalsData(goalsData)) {
        homeScore = extractNullableInt(goalsData.home);
        awayScore = extractNullableInt(goalsData.away);
      }

      let penaltyHome: number | null = null;
      let penaltyAway: number | null = null;
      if (isRawScoreData(scoreData)) {
        const penaltyRaw = scoreData.penalty;
        if (isRawPenaltyData(penaltyRaw)) {
          penaltyHome = extractNullableInt(penaltyRaw.home);
          penaltyAway = extractNullableInt(penaltyRaw.away);
        }
      }

      const winnerId = computeWinnerId(
        status,
        homeTeam.id,
        awayTeam.id,
        homeScore,
        awayScore,
        penaltyHome,
        penaltyAway,
      );

      matches.push({
        matchId,
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        penaltyHome,
        penaltyAway,
        status,
        date,
        winnerId,
      });
    }

    bracket.push({
      name: roundName,
      order: getRoundOrder(roundName),
      matches,
    });
  }

  // Tri par ordre croissant (Round of 64 → Final)
  bracket.sort((a, b) => a.order - b.order);

  return { competitionKind, bracket };
}
