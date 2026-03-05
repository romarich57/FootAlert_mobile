# Plan : Bracket Compétitions + Optimisations Performances

**Date :** 2026-03-05
**Statut :** Sprint 1 ✅ implémenté — Sprint 2-4 à venir

---

## Contexte

Deux axes d'amélioration identifiés :

1. **Feature manquante** : Aucune visualisation bracket/élimination directe n'existe. Les coupes (UCL, FA Cup, Coupe du Monde, Copa del Rey) affichent les mêmes onglets qu'une ligue standard.
2. **Performances** : Chargements lents, trop de re-fetches, staleTime/BFF TTL désynchronisés, FlashList mal calibré, re-renders inutiles.

---

## Audit performances — résultats

Audit complet (22 problèmes identifiés par perf-optimizer) :

### Problèmes critiques

| ID | Fichier | Description | Impact |
|----|---------|-------------|--------|
| PROB-02 | `queryOptions.ts:50` | `playerStats.staleTime` 1h vs BFF TTL 90s → données périmées 40× | Fraîcheur données |
| PROB-08 | `CompetitionStandingsTab.tsx:322` | `estimatedItemSize=340` (réel ≈52px) → viewport 6× trop grand | FPS scroll -30 |
| PROB-16 | `CompetitionDetailsScreen.tsx:157` | `renderTabContent` useCallback([screenModel]) → toujours recréé | Re-renders en cascade |
| PROB-18 | `matchesRoute.ts:32` | Clé cache manque les params pagination → bug silencieux | Pagination inopérante |

### Problèmes majeurs

| ID | Fichier | Description |
|----|---------|-------------|
| PROB-01 | `queryOptions.ts:4` | gcTime 5min → lectures AsyncStorage fréquentes |
| PROB-03 | `useCompetitionDetailsScreenModel.ts:61` | `followedIds.includes()` O(n) à chaque render |
| PROB-05 | `useCompetitionTotw.ts:28` | 4 requêtes BFF lancées même si onglet TOTW jamais consulté |
| PROB-12 | `CompetitionMatchesTab.tsx:94` | `new Date()` dans comparateur sort → ~6000 instanciations pour 380 matchs |
| PROB-17 | `CompetitionDetailsScreen.tsx` | Onglets non actifs unmountés → perte état scroll + re-mount FlashList |
| PROB-19 | `transfersRoute.ts:53` | N+1 appels API (atténué par cache 1h) |

---

## Sprint 1 — ✅ Implémenté (2026-03-05)

### `src/ui/shared/query/queryOptions.ts`
- `QUERY_GC_TIME_MS` : 5min → **30min** (PROB-01)
- `competitions.standings.staleTime` : 5min → **2min**
- `competitions.fixtures.staleTime` : 5min → **2min**
- `competitions.playerStats.staleTime` : 60min → **5min** (PROB-02 critique)
- `competitions.transfers.staleTime` : 60min → **6h** (stable, pas besoin de refetch fréquent)
- `competitions.totw.staleTime` : 24h → **30min** (PROB)

### BFF `footalert-bff/src/routes/competitions/`
- `standingsRoute.ts` : TTL 60s → **90s**
- `matchesRoute.ts` : TTL 60s → **90s** + clé cache `competition:matches:${params.id}:${query.season}` → `${request.url}` (PROB-18 critique)
- `playerStatsRoute.ts` : TTL 90s → **5min** (synchronisé avec client)
- `coreRoutes.ts` : TTL liste complète 120s → **1h** (PROB-20, données quasi-statiques)

### UI composants
- `CompetitionStandingsTab.tsx` : `estimatedItemSize` 340 → **52** (PROB-08 critique)
- `CompetitionMatchesTab.tsx` : sort refactorisé avec **transformation de Schwartzian** — timestamps pré-calculés 1 fois avant le sort (PROB-12 + PROB-14)
- `CompetitionDetailsScreen.tsx` : `renderTabContent` useCallback avec **deps scalaires** au lieu de `[screenModel]` (PROB-16 critique)

### `src/ui/features/competitions/hooks/useCompetitionDetailsScreenModel.ts`
- `followedIds` → **Set** pour lookup O(1) (PROB-03)
- `tabs` useMemo : mutation `baseTabs.push('totw')` → **expression declarative** `totwData ? [...base, 'totw'] : base` (PROB-04)

### Tests mis à jour
- `useCompetitionTotw.test.ts` : assertion staleTime 24h → 30min
- `useCompetitionTransfers.test.tsx` : assertion staleTime 60min → 6h

---

## Sprint 2 — Prefetch + TOTW lazy (2-3 jours)

### 2.1 — Prefetch standings + fixtures à l'ouverture de l'écran

Dans `useCompetitionDetailsScreenModel.ts`, ajouter un `useEffect` qui prefetch les deux queries les plus critiques dès que `numericCompetitionId` et `actualSeason` sont disponibles :

```typescript
const queryClient = useQueryClient();
useEffect(() => {
  if (!Number.isFinite(numericCompetitionId) || !actualSeason) return;
  void queryClient.prefetchQuery({
    queryKey: queryKeys.competitions.standings(numericCompetitionId, actualSeason),
    queryFn: () => fetchCompetitionStandings(numericCompetitionId, actualSeason),
    staleTime: featureQueryOptions.competitions.standings.staleTime,
  });
  void queryClient.prefetchQuery({
    queryKey: queryKeys.competitions.fixtures(numericCompetitionId, actualSeason),
    queryFn: () => fetchCompetitionFixtures(numericCompetitionId, actualSeason),
    staleTime: featureQueryOptions.competitions.fixtures.staleTime,
  });
}, [numericCompetitionId, actualSeason, queryClient]);
```

### 2.2 — TOTW lazy (ne charger que quand l'onglet est ouvert)

**Problème :** `useCompetitionTotw` est appelé inconditionnellement pour déterminer si l'onglet existe, déclenchant 4 requêtes BFF à chaque ouverture d'écran.

**Solution :** Utiliser un endpoint BFF agrégateur qui consolide les 4 appels en 1 seul appel côté serveur.

**Nouveau endpoint BFF :** `GET /v1/competitions/:id/totw?season=`
```typescript
// footalert-bff/src/routes/competitions/totwRoute.ts
// 4 appels API-Football en Promise.all côté BFF
// TTL : 5min (300_000ms)
// Rate limit : 5/min (consomme 4 crédits API-Football)
```

**Hook mis à jour :** `useCompetitionTotw` appelle `/v1/competitions/:id/totw` (1 call) au lieu de 4 calls BFF séparés.

**Navigation conditionnelle :** Rendre l'onglet TOTW présent par défaut dans `tabs`, le désactiver si le fetch retourne null.

### 2.3 — `keepPreviousData` pour changement de saison

Dans les hooks standings, fixtures, bracket (futur) :
```typescript
placeholderData: keepPreviousData
```
→ L'ancien contenu reste visible pendant le chargement de la nouvelle saison.

---

## Sprint 3 — Feature Bracket/Knockout (3-5 jours)

### Types domaine
**Nouveau fichier :** `src/domain/contracts/bracket.types.ts`
```typescript
export type CompetitionKind = 'league' | 'cup' | 'mixed';
export type BracketTeam = { id: number; name: string; logo: string };
export type BracketMatch = {
  matchId: number;
  homeTeam: BracketTeam;
  awayTeam: BracketTeam;
  homeScore: number | null;
  awayScore: number | null;
  penaltyHome?: number | null;
  penaltyAway?: number | null;
  status: string;
  date: string;
  winnerId?: number | null;
};
export type KnockoutRound = { name: string; nameKey?: string; order: number; matches: BracketMatch[] };
export type KnockoutBracket = { rounds: KnockoutRound[] };
```

### BFF bracket

**Nouveau fichier :** `footalert-bff/src/routes/competitions/bracketMapper.ts`
- Patterns regex de classification des rounds : "Round of 16", "Quarter-finals", "Semi-finals", "Final" → knockout ; "Group Stage" → group
- `detectCompetitionKind(rounds)` → `'league' | 'cup' | 'mixed'`

**Nouveau endpoint :** `GET /v1/competitions/:id/bracket?season=`
- Réutilise le cache fixtures (même clé)
- TTL : 90s (saison active), 6h (saison terminée)
- Retourne `{ competitionKind, groups?, bracket? }`

**Contrat OpenAPI :** Ajouter dans `footalert.v1.yaml` + `npm run contract:generate`

### Hook mobile

**Nouveau fichier :** `src/ui/features/competitions/hooks/useCompetitionBracket.ts`
```typescript
export function useCompetitionBracket(leagueId: number | undefined, season: number | undefined) {
  // staleTime: 6min, gcTime: 24h
  // placeholderData: keepPreviousData
  // Mappe DTO → modèle domaine
}
```

### Composant KnockoutBracketView

**Nouveau fichier :** `src/ui/features/competitions/components/KnockoutBracketView.tsx`
- ScrollView horizontal, colonnes par round
- Cards de match : 140×72px, 2 teams × 36px
- Connecteurs Vue-based (pas SVG)
- Intégré dans `CompetitionStandingsTab` en section conditionnelle sous les groupes

**Logique visuelle :**
```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ 8es      │────>│ QF       │────>│ SF       │────>│ F │
│ PSG-City │     │ Real-PSG │     │ Real-Man │     │...│
│ Real-BVB │     │ Man-Inter│     │ Man-Real │
└──────────┘     └──────────┘     └──────────┘
```

### i18n keys à ajouter
```
competitionDetails.bracket.title
competitionDetails.bracket.rounds.final
competitionDetails.bracket.rounds.semi_final
competitionDetails.bracket.rounds.quarter_final
competitionDetails.bracket.rounds.round_of_16
competitionDetails.bracket.rounds.round_of_32
competitionDetails.bracket.tbd
```

---

## Sprint 4 — Pagination fixtures useInfiniteQuery (2 jours)

Migrer `useCompetitionFixtures` de `useQuery` → `useInfiniteQuery` (50 matchs/page) :
- Premier render : 50 matchs → chargement ultra-rapide
- Scroll near bottom → charge 50 suivants
- L'endpoint BFF `/v1/competitions/:id/matches` supporte déjà `limit` + `cursor` (pagination cursor)

**Impact :** Une saison Ligue 1 = 380 matchs. Actuellement chargés en 1 bloc. Après : 8 pages de 50.

---

## Autres améliorations identifiées (backlog)

| ID | Description | Priorité |
|----|-------------|----------|
| PROB-06 | `useCompetitionTeamStats` : double useMemo chaîné → fusionner en 1 passe | Faible |
| PROB-07 | Concurrency dans queryKey `teamAdvancedStatsBatch` → retirer de la clé | Faible |
| PROB-09 | `createFormBadges` dans renderItem → extraire composant `StandingRowItem` mémoïsé | Moyenne |
| PROB-11 | Inline arrow `() => onPressTeam(...)` → extraire composant `StandingRowItem` | Moyenne |
| PROB-17 | Onglets unmountés → pattern `display:none` ou MaterialTopTabNavigator | Haute |
| PROB-21 | `resolvePrimaryCompetitionStatistic` : sort O(n log n) → reduce O(n) | Faible |
| PROB-22 | `selectTotwLineByRole` : 4 tris complets → pré-grouper par rôle | Faible |

---

## Vérification Sprint 1 (résultats)

```
TypeScript mobile  : ✅ 0 nouvelles erreurs
TypeScript BFF     : ✅ 0 erreurs
Tests              : ✅ 401 passent (4 suites pré-existantes en échec, non liées)
```

## Vérification Sprint 2-4 (à faire)

```bash
npm run typecheck
npm run web:typecheck
npm run lint
npm run check:keys
npm run contract:check
npm test
npm run check:all
```
