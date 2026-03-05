# Patterns d'implémentation — FootAlert BFF

## Pattern : Route BFF agrégée (TOTW Sprint 2)

Cas d'usage : agréger N appels API-Football en 1 seul endpoint BFF pour réduire la latence mobile.

```typescript
// Type interne pour cast des réponses API-Football
type PlayerStatsRaw = { response?: unknown[] } & Record<string, unknown>;

export function registerCompetitionTotwRoute(app: FastifyInstance): void {
  app.get('/v1/competitions/:id/totw', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async request => {
    const params = parseOrThrow(competitionIdParamsSchema, request.params);
    const rawQuery = parseOrThrow(optionalSeasonQuerySchema, request.query);

    if (rawQuery.season === undefined) {
      throw Object.assign(new Error('Le paramètre season est requis'), { statusCode: 400 });
    }

    const cacheKey = `competition:totw:${params.id}:${rawQuery.season}`;

    return withCache<{ topScorers: unknown[]; ... }>(cacheKey, 5 * 60_000, async () => {
      const [a, b, c, d] = await Promise.all([
        apiFootballGet(buildPlayerStatsPath('topscorers', params.id, rawQuery.season!)),
        // ...
      ]);
      const extractResponse = (raw: unknown): unknown[] => ((raw as PlayerStatsRaw).response) ?? [];
      return { topScorers: extractResponse(a), ... };
    });
  });
}
```

Points clés :
- `optionalSeasonQuerySchema` + fail-fast manuel pour season obligatoire (évite de créer un nouveau schéma)
- `withCache<T>` générique typé explicitement
- `extractResponse` helper interne pour dé-envelopper sans `any`
- `Promise.all` (pas `allSettled`) : si un sous-appel échoue, toute la requête échoue — cohérent avec la sémantique cache

## Pattern : Méthode service non-enveloppe (app-core)

Quand la réponse BFF n'est PAS `{ response: T[] }` mais une structure plate :

```typescript
async fetchCompetitionTotw<T = unknown>(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<{ topScorers: T[]; topAssists: T[]; topYellowCards: T[]; topRedCards: T[] }> {
  const raw = await http.get<{
    topScorers: unknown[];
    topAssists: unknown[];
    topYellowCards: unknown[];
    topRedCards: unknown[];
  }>(
    `/competitions/${encodeURIComponent(String(leagueId))}/totw`,
    { season },
    { signal },
  );
  return {
    topScorers: (raw.topScorers ?? []) as T[],
    // ...
  };
}
```

- Jamais `fetchList` pour les réponses plates — `fetchList` extrait `.response` automatiquement
- Cast `as T[]` après nullish coalescing `?? []` pour typage correct sans `any`
