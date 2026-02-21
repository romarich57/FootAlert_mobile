# Mobile Data Flow (RN + BFF)

## Objectif

- Secrets API côté serveur uniquement.
- Contrat réseau stable côté mobile.
- Politique offline unifiée via persistance globale React Query.

## Flux nominal

1. UI (`src/ui/features/*`) déclenche un hook React Query.
2. Hook appelle `src/data/endpoints/*`.
3. Endpoint appelle le BFF via `MOBILE_API_BASE_URL`.
4. BFF valide les params (Zod), applique rate-limit + cache court TTL, puis appelle API-Football.
5. Réponse normalisée retourne au mobile.
6. Query cache/persist stocke les données pour rehydration offline.

## Couches mobile

- `src/ui/*`: écrans, composants, hooks de présentation.
- `src/data/endpoints/*`: contrats HTTP vers BFF.
- `src/data/mappers/*`: mapping API DTO -> modèles UI.
- `src/ui/shared/query/*`: query keys/options globales.

## Couches BFF (`footalert-bff/`)

- `src/routes/*`: surface `/v1/*` consommée par le mobile.
- `src/lib/validation.ts`: validation stricte des params.
- `src/lib/apiFootballClient.ts`: timeout + retry borné + erreurs normalisées.
- `src/lib/cache.ts`: cache mémoire TTL court (30s-120s).
- `@fastify/rate-limit`: limite globale + limites renforcées sur endpoints coûteux.

## Offline

- `PersistQueryClientProvider` + AsyncStorage persister.
- Les données query persistées servent de fallback offline multi-feature.
- Les caches ad hoc feature ont été supprimés au profit du cache React Query global.

## Guardrails sécurité

- Aucun `x-apisports-key` dans le mobile.
- `API_FOOTBALL_KEY` présent uniquement dans l'env BFF.
- Rejet des paramètres non supportés (`z.object(...).strict()`).
