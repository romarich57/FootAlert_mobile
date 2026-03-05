# Perf-Optimizer Agent Memory — FootAlert

## Architecture rapide
- Mobile: RN + FlashList, React Query, AsyncStorage persistence
- BFF: Fastify 5, cache mémoire/Redis (withCache), TTL jitter 15%, staleGrace 60s
- Web: Vite+React ; Desktop: Tauri 2
- Alias: @/ → src/, @data/ → src/data/, @ui/ → src/ui/, @app-core/, @api-contract/

## Fichiers clés auditée (feature competitions)
- queryOptions.ts : `src/ui/shared/query/queryOptions.ts` — staleTime globaux et par feature
- queryKeys.ts : `src/ui/shared/query/queryKeys.ts`
- BFF cache : `footalert-bff/src/lib/cache.ts` — withCache, TTL jitter ±15%, staleGrace 60s
- BFF routes competitions : `footalert-bff/src/routes/competitions/`
- Mapper : `src/data/mappers/competitionsMapper.ts`

## TTL Matrix (competitions, audit 2026-03-05)
| Ressource      | BFF TTL  | RQ staleTime | Delta  | Statut         |
|----------------|----------|--------------|--------|----------------|
| competition/:id | 120s    | 12h          | OK     | OK             |
| standings      | 60s      | 5min (300s)  | +240s  | DESYNCHRONISE  |
| matches        | 60s      | 5min (300s)  | +240s  | DESYNCHRONISE  |
| playerStats    | 90s      | 60min (3600s)| +3510s | DESYNCHRONISE  |
| transfers      | 3600s    | 60min (3600s)| OK     | OK             |
| totw (RQ only) | N/A BFF  | 24h          | N/A    | 4 appels séquentiels via playerStatsRoute |

Règle : staleTime RQ DOIT être >= BFF TTL pour éviter les requêtes inutiles au BFF.
Standings et matches : staleTime 5min mais BFF TTL 60s → RQ refetch toutes les 5min mais BFF répond depuis le cache 60s → acceptable. Cas critique : playerStats staleTime 60min mais BFF TTL 90s.

## Patterns confirmés
- `renderTabContent` dans CompetitionDetailsScreen est une fonction inline dans useCallback([screenModel]) — se recalcule à chaque render car screenModel est un objet nouveau
- `createStyles(colors)` pattern utilisé partout : correct si enveloppé dans useMemo
- FlashList `estimatedItemSize=340` dans StandingsTab : trop élevé (items font ~48px)
- CompetitionMatchesTab : sort inline dans processedFixtures crée des Date() objects à chaque appel du sort comparator
- useCompetitionTotw : 4 requêtes parallèles (OK) mais résultat concaténé dans allPlayers (~200 items) re-mappé entièrement à chaque render si season change
- useCompetitionTeamStats : double useMemo chaîné (advancedQueryData → advancedPayloads) inutile — une seule transformation suffit

## Anti-patterns trouvés
- `followedIds.includes(safeCompetitionId)` ligne 61 useCompetitionDetailsScreenModel : O(n) à chaque render, devrait être un Set
- `getDescriptionColor` dans StandingsTab : appelle .normalize().replace() sur chaque item à chaque render (pas mémoïsé)
- Inline arrow dans onPressTeam : `() => onPressTeam(String(data.teamId))` dans renderItem — nouvelle référence à chaque render

## Voir aussi
- patterns.md pour détails sur chaque problème
