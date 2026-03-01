/**
 * Fonctions utilitaires pour le parsing et le calcul des données face-à-face (H2H).
 */

export type H2HFixture = {
  fixtureId: string;
  date: string;
  leagueId: string;
  leagueName: string;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamLogo: string;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamLogo: string;
  homeGoals: number | null;
  awayGoals: number | null;
};

export type H2HSummary = {
  homeWins: number;
  draws: number;
  awayWins: number;
  total: number;
};

/** Extrait une valeur string depuis un champ inconnu. */
function toStr(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return '';
}

/** Extrait un nombre ou null depuis un champ inconnu. */
function toNumOrNull(val: unknown): number | null {
  return typeof val === 'number' ? val : null;
}

/** Parse un item brut API-Football en H2HFixture. Retourne null si invalide. */
function parseRawFixture(raw: unknown): H2HFixture | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const obj = raw as Record<string, unknown>;
  const fixture = obj.fixture as Record<string, unknown> | undefined;
  const league = obj.league as Record<string, unknown> | undefined;
  const teams = obj.teams as Record<string, unknown> | undefined;
  const goals = obj.goals as Record<string, unknown> | undefined;

  if (!fixture || !league || !teams || !goals) return null;

  const fixtureId = toStr(fixture.id);
  const date = toStr(fixture.date);
  const home = teams.home as Record<string, unknown> | undefined;
  const away = teams.away as Record<string, unknown> | undefined;

  if (!fixtureId || !date || !home || !away) return null;

  return {
    fixtureId,
    date,
    leagueId: toStr(league.id),
    leagueName: toStr(league.name),
    homeTeamId: toStr(home.id),
    homeTeamName: toStr(home.name),
    homeTeamLogo: toStr(home.logo),
    awayTeamId: toStr(away.id),
    awayTeamName: toStr(away.name),
    awayTeamLogo: toStr(away.logo),
    homeGoals: toNumOrNull(goals.home),
    awayGoals: toNumOrNull(goals.away),
  };
}

/**
 * Parse les données brutes H2H, calcule le summary (victoires/nuls relatifs à homeTeamId
 * du match courant) et trie par date décroissante.
 */
export function parseH2HFixtures(
  raw: unknown[],
  currentHomeTeamId: string,
  currentAwayTeamId: string,
): { fixtures: H2HFixture[]; summary: H2HSummary } {
  const fixtures: H2HFixture[] = [];
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;

  for (const item of raw) {
    const parsed = parseRawFixture(item);
    if (!parsed) continue;
    const { homeTeamId, homeGoals, awayGoals } = parsed;
    // Exclure les matchs non joués / à venir dans l'historique H2H.
    if (homeGoals === null || awayGoals === null) continue;

    fixtures.push(parsed);

    if (homeGoals === awayGoals) {
      draws++;
    } else {
      const matchHomeWon = homeGoals > awayGoals;
      const h2hHomeIsCurrentHome = homeTeamId === currentHomeTeamId;
      const h2hHomeIsCurrentAway = homeTeamId === currentAwayTeamId;

      if (h2hHomeIsCurrentHome && matchHomeWon) homeWins++;
      else if (h2hHomeIsCurrentHome && !matchHomeWon) awayWins++;
      else if (h2hHomeIsCurrentAway && matchHomeWon) awayWins++;
      else if (h2hHomeIsCurrentAway && !matchHomeWon) homeWins++;
    }
  }

  fixtures.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { fixtures, summary: { homeWins, draws, awayWins, total: fixtures.length } };
}

/** Formate une date ISO en texte court localisé. */
export function formatH2HDate(isoDate: string, locale: string): string {
  return new Date(isoDate).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
