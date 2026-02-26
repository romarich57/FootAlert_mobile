export type ApiFootballUnknownListResponse = {
  response?: unknown[];
};

export function normalizeStandingsPayload(
  payload: ApiFootballUnknownListResponse | null | undefined,
): ApiFootballUnknownListResponse {
  if (!payload || !Array.isArray(payload.response)) {
    return { response: [] };
  }

  return payload;
}

export function buildFixtureQuery(
  teamId: string,
  query: {
    season?: number;
    leagueId?: string;
    timezone?: string;
    next?: number;
  },
): string {
  const searchParams = new URLSearchParams({ team: teamId });

  if (typeof query.season === 'number') {
    searchParams.set('season', String(query.season));
  }

  if (query.leagueId) {
    searchParams.set('league', query.leagueId);
  }

  if (query.timezone) {
    searchParams.set('timezone', query.timezone);
  }

  if (typeof query.next === 'number') {
    searchParams.set('next', String(query.next));
  }

  return searchParams.toString();
}

function normalizeTeamName(teamName: string): string {
  return teamName.trim().replace(/\s+/g, ' ');
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function pushTeamNameCandidate(candidates: Set<string>, value: string): void {
  const normalized = normalizeTeamName(value);
  if (!normalized) {
    return;
  }

  candidates.add(normalized);
}

export function buildTeamNameCandidates(teamName: string): string[] {
  const normalized = normalizeTeamName(teamName);
  if (!normalized) {
    return [];
  }

  const candidates = new Set<string>();
  const baseVariants = new Set<string>([
    normalized,
    normalizeTeamName(normalized.replace(/[-–—]+/g, ' ')),
    normalizeTeamName(normalized.replace(/[.'’]/g, '')),
    normalizeTeamName(stripDiacritics(normalized)),
  ]);

  for (const baseVariant of baseVariants) {
    if (!baseVariant) {
      continue;
    }

    pushTeamNameCandidate(candidates, baseVariant);

    const strippedSuffix = normalizeTeamName(
      baseVariant.replace(/\b(fc|cf|sc|ac|afc|fk|sk|nk|ssc|cfc)\b\.?/gi, ''),
    );
    if (strippedSuffix && strippedSuffix !== baseVariant) {
      pushTeamNameCandidate(candidates, strippedSuffix);
    }

    if (!/\bfc\b/i.test(baseVariant)) {
      pushTeamNameCandidate(candidates, `${strippedSuffix || baseVariant} FC`);
    }
  }

  const aliasSource = stripDiacritics(normalized).toLowerCase();

  if (/paris saint[-\s]?germain/i.test(aliasSource)) {
    pushTeamNameCandidate(candidates, 'Paris SG');
    pushTeamNameCandidate(candidates, 'PSG');
  }

  if (/internazionale/i.test(aliasSource)) {
    pushTeamNameCandidate(candidates, 'Inter');
  }

  return Array.from(candidates);
}

export function normalizeTransferDate(value: string): string | null {
  const explicitDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (explicitDate) {
    return explicitDate;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export function toTransferTimestamp(value: string | null): number {
  if (!value) {
    return Number.MIN_SAFE_INTEGER;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return Number.MIN_SAFE_INTEGER;
  }

  return parsed.getTime();
}

export function normalizeTransferKeyText(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function toNumericId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number.parseFloat(normalized.replace('%', '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}
