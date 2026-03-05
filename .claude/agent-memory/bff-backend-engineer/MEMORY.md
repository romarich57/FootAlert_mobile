# BFF Backend Engineer — Mémoire persistante

## Conventions clés vérifiées en production

- **Schemas Zod BFF** : `competitionIdParamsSchema`, `seasonQuerySchema`, `optionalSeasonQuerySchema`, `playerStatsQuerySchema` dans `footalert-bff/src/routes/competitions/schemas.ts`
- **`seasonQuerySchema`** contient aussi `limit` et `cursor` (pagination). Pour une route qui veut juste `season`, utiliser `optionalSeasonQuerySchema` + validation manuelle fail-fast si season requise.
- **Pattern route BFF** : `parseOrThrow(schema, request.params/query)` → `withCache(key, ttl, async () => apiFootballGet(...))` — voir `playerStatsRoute.ts`
- **`buildPlayerStatsPath(type, leagueId, season)`** : construit `/players/${type}?league=...&season=...` — dans `transfersMapper.ts`
- **Cache TTL** : player-stats → 5 min (`5 * 60_000`). Live data → 30s-1min. Static → 1h+
- **Rate limit TOTW** : `max: 5, timeWindow: '1 minute'` (4 crédits API-Football par requête)
- **`withCache`** est générique : `withCache<T>(key, ttl, fn)` — typer explicitement pour éviter `unknown`

## Architecture service mobile (app-core)

- `createCompetitionsReadService` dans `packages/app-core/src/services/competitionsService.ts`
- Méthode interne `fetchList` pour les réponses enveloppe `{ response: T[] }`. **Ne pas utiliser** pour les réponses BFF à forme plate (ex: `{ topScorers, topAssists, ... }`).
- Pour réponses non-enveloppe : appeler `http.get<T>()` directement dans la méthode du service.

## Patterns wrapper competitionsApi.ts

- Fichier : `src/data/endpoints/competitionsApi.ts`
- Instancie `competitionsReadService` avec `mobileReadHttpAdapter` + `mobileReadTelemetryAdapter`
- Chaque export est une fonction async typée avec les DTOs concrets (`CompetitionsApiPlayerStatDto`, etc.)
- DTOs importés depuis `@domain/contracts/competitions.types`

## Test hooks React Query

- Mocker `@tanstack/react-query` avec `{ useQuery: jest.fn() }`
- Récupérer `queryFn` via `mockedUseQuery.mock.calls[0]?.[0]?.queryFn` et l'appeler directement
- Changement de comportement Sprint 2 : TOTW passe de `Promise.allSettled` (résilience partielle) à un seul appel BFF (`fetchCompetitionTotw`). Les erreurs BFF sont maintenant propagées (pas de fallback partiel côté mobile).

## Fichiers importants

- Routes BFF competitions : `footalert-bff/src/routes/competitions/`
- Service app-core : `packages/app-core/src/services/competitionsService.ts`
- Endpoints mobile : `src/data/endpoints/competitionsApi.ts`
- Hooks features : `src/ui/features/competitions/hooks/`

## Pattern bracket/knockout (Sprint 3)

- Mapper : `footalert-bff/src/routes/competitions/bracketMapper.ts` — `classifyRound`, `detectCompetitionKind`, `buildCompetitionBracket`
- Route : `footalert-bff/src/routes/competitions/bracketRoute.ts` — GET `/v1/competitions/:id/bracket?season=`
- **Clé cache partagée** avec `matchesRoute` : `competition:matches:/v1/competitions/${id}/matches?season=${season}` (construite manuellement, pas depuis `request.url`)
- **Rounds `unknown`** : ignorés pour la détection du type (ni group ni knockout). Seuls les patterns explicites contribuent à `detectCompetitionKind`.
- **Guards de type** : utiliser des interfaces partielles (`RawFixture`, `RawTeam`, etc.) plutôt que `Record<string, unknown>` pour éviter les warnings ESLint `dot-notation`.
- Tests BFF : `node:test` + `node:assert/strict` (pas Jest) — dans `footalert-bff/test/unit/`
- Failures préexistantes connues : `matches.absences.test.ts`, `matches.fixtureContext.test.ts` — non liées au bracket.

## Erreurs typecheck préexistantes (à ignorer)

- `site_vitrine/` : nombreuses erreurs TS (missing modules, lib dom) — préexistantes, hors scope
- `src/data/api/http/secureTransport.ts` : AbortSignal incompatibility — préexistant
- Ces erreurs apparaissent dans `npm run typecheck` (racine) mais n'affectent pas le BFF ni web
- `npm run web:typecheck` et `cd footalert-bff && npm run typecheck` sont les checks fiables

Voir aussi : `patterns.md` pour détails implémentation Sprint 2 TOTW.
