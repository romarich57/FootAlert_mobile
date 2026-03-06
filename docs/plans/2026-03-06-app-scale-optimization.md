# FootAlert App Scale Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** rendre l'application mobile fluide sur reseau reel, reduire les appels API inutiles, durcir le BFF sous charge, et mettre en place des garde-fous CI/ops pour eviter toute regression de performance.

**Architecture:** on traite d'abord la mesure et les budgets, puis le chemin critique mobile -> BFF -> contrat partage -> plateforme. Le principe directeur est simple: moins de fetchs, moins de payloads, moins de recalculs, des cles de cache canoniques, et des degradations controlees plutot que des echecs bruyants.

**Tech Stack:** React Native, TanStack Query, Fastify 5, API-Football, React web/Vite, Tauri, GitHub Actions, AsyncStorage/localStorage persistence, Redis cache optionnel.

---

## Constats qui pilotent le plan

- Le client mobile persiste tout le cache TanStack pendant 24h sans filtre explicite, ce qui augmente le cout de rehydratation et conserve des donnees volatiles trop longtemps.
- L'ecran competition lance encore des requetes non critiques trop tot, notamment `totw` et `bracket`, et le rendu des tabs reste couteux.
- Le BFF peut renvoyer des erreurs de contention sur lock cache Redis et son circuit breaker upstream est trop global.
- Des endpoints BFF lourds (`advancedStats`, `transfers`, `players/:id/matches`) ne bornent pas assez le fanout ou la charge amont.
- Le contrat OpenAPI est trop permissif pour servir de garde-fou reel, et `packages/app-core` laisse encore passer trop de `unknown`/casts.
- Les workflows CI/CD ne bloquent pas encore correctement les regressions perf et le deploiement reste trop peu deterministe.

## Ordre d'execution

1. Gardes-fous perf et baseline.
2. Budget cache/persistence cote mobile.
3. Reduction du cout initial des ecrans les plus visites.
4. Durcissement du BFF sous contention et sous charge.
5. Typage contractuel strict et alleger les clients web/desktop.
6. Observabilite, tests de charge, rollouts reproductibles.

---

### Task 1: Verrouiller les budgets perf dans la CI

**Files:**
- Modify: `.github/workflows/mobile-quality.yml`
- Modify: `scripts/perf/compare-android-audit.sh`
- Modify: `scripts/perf/assert-android-slo.sh`
- Create: `scripts/perf/assert-ios-slo.sh`
- Create: `perf-results/baseline/README.md`

**Actions:**
1. Supprimer les `continue-on-error` des jobs perf qui doivent devenir bloquants.
2. Rendre la comparaison Android contre baseline bloquante avec seuils de derive explicites (`p50`, `p95`, `jank`).
3. Ajouter un assert iOS homologue a Android pour valider `p50`, `p95` et presence de baseline.
4. Documenter le processus de mise a jour de baseline pour eviter les nightly casses.

**Verify:**
- Run: `npm run perf:android:audit:slo -- "" 750 1200 6 220`
- Run: `bash scripts/perf/compare-android-audit.sh`
- Run: `bash scripts/perf/assert-ios-slo.sh <summary-file> <thresholds>`
- Expected: la CI echoue sur regression reelle, pas seulement sur erreur de script.

### Task 2: Mettre un budget de persistence du cache mobile

**Files:**
- Modify: `src/ui/app/providers/QueryProvider.tsx`
- Modify: `src/ui/shared/query/queryOptions.ts`
- Create: `src/ui/shared/query/queryPersistence.ts`
- Modify: `src/ui/features/matches/hooks/useMatchesQuery.ts`
- Modify: `src/ui/features/competitions/hooks/useCompetitionFixtures.ts`
- Modify: `src/ui/features/search/hooks/useSearchScreenModel.ts`

**Actions:**
1. Introduire une whitelist de queries persistables et exclure les donnees live, la recherche et les datasets volumineux a faible valeur offline.
2. Reduire `QUERY_PERSIST_MAX_AGE_MS` et aligner la persistence avec les classes de fraicheur (`live`, `interactive`, `stable`).
3. Ajouter `shouldDehydrateQuery`/`dehydrateOptions` pour eviter de serialiser le cache complet a chaque cycle.
4. Verifier que les ecrans offline utiles restent restaures, sans conserver les payloads les plus volatils.

**Verify:**
- Run: `npm run typecheck`
- Run: `npm test -- QueryProvider`
- Manual: lancer l'app, la quitter, la relancer avec cache existant, verifier que le boot ne degrade pas et que les ecrans critiques restaurent bien leurs donnees.

### Task 3: Reduire le cout initial de l'ecran competition

**Files:**
- Modify: `src/ui/features/competitions/hooks/useCompetitionDetailsScreenModel.ts`
- Modify: `src/ui/features/competitions/hooks/useCompetitionTotw.ts`
- Modify: `src/ui/features/competitions/hooks/useCompetitionBracket.ts`
- Modify: `src/ui/features/competitions/screens/CompetitionDetailsScreen.tsx`
- Modify: `src/ui/features/competitions/components/CompetitionStandingsTab.tsx`
- Modify: `src/ui/features/competitions/components/CompetitionMatchesTab.tsx`

**Actions:**
1. Arreter les fetchs `totw` et `bracket` au premier rendu quand l'utilisateur n'en a pas encore besoin.
2. Prefetcher au chargement uniquement les donnees du premier ecran utile: standings ou premiere page des fixtures selon le type de competition.
3. Conserver l'etat des tabs lourds et eviter les remounts qui reinitialisent scroll et listes.
4. Sortir du render path tout calcul repetitif restant sur standings/matches.

**Verify:**
- Run: `npm run typecheck`
- Run: `npm test -- useCompetitionTotw`
- Manual: ouvrir une competition, changer d'onglet, revenir, changer de saison, verifier absence de spinner plein ecran inutile et etat de scroll conserve.

### Task 4: Nettoyer les hot paths mobile (matches, follows, search, match details)

**Files:**
- Modify: `src/ui/app/navigation/useMainTabsPrefetch.ts`
- Modify: `src/ui/features/matches/hooks/useMatchesScreenModel.ts`
- Modify: `src/ui/features/matches/details/hooks/useMatchDetailsScreenModel.ts`
- Modify: `src/ui/features/follows/hooks/useFollowedTeamsCards.ts`
- Modify: `src/ui/features/follows/hooks/useFollowedPlayersCards.ts`
- Modify: `src/ui/features/search/hooks/useSearchScreenModel.ts`

**Actions:**
1. Reduire les prefetchs opportunistes au strict utile et les desactiver en mode reseau/batterie contraints.
2. Remplacer les lookups lineaires repetes (`includes`) par des `Set` dans les chemins executes a chaque rendu.
3. Eviter les tris/recalculs couteux sur les sections matches/follows quand les donnees sources n'ont pas change.
4. Uniformiser la propagation de `AbortSignal` et la telemetrie de latence sur les parcours critiques.

**Verify:**
- Run: `npm run typecheck`
- Run: `npm test -- useMatchesScreenModel`
- Manual: navigation rapide entre tabs, ouverture/fermeture de l'ecran match, recherche successive, verification qu'aucune tempete de requetes n'apparait.

### Task 5: Durcir le cache BFF et le circuit breaker upstream

**Files:**
- Modify: `footalert-bff/src/lib/cache.ts`
- Modify: `footalert-bff/src/lib/apiFootballClient.ts`
- Modify: `footalert-bff/src/routes/competitions/matchesRoute.ts`
- Modify: `footalert-bff/src/routes/search/index.ts`
- Create: `footalert-bff/test/lib/cache.redis.test.ts`
- Modify: `footalert-bff/test/routes/competitions.matchesRoute.test.ts`

**Actions:**
1. Remplacer le `CACHE_LOCK_TIMEOUT` fatal par une degradation controlee: attente adaptee, backoff, fallback stale ou recalcul borne.
2. Allonger ou renouveler le lock Redis pour eviter le dogpile sur calculs longs.
3. Scinder le circuit breaker par famille d'endpoint upstream au lieu d'un breaker process-wide.
4. Canoniser les cles cache des routes paginees quand la pagination est locale au BFF.

**Verify:**
- Run: `cd footalert-bff && npm run test -- cache redis`
- Run: `cd footalert-bff && npm run test -- competitions.matchesRoute`
- Expected: pas de 503 massifs sur miss concurrent et meilleure hit-rate sur `/competitions/:id/matches`.

### Task 6: Borner les endpoints BFF les plus couteux

**Files:**
- Modify: `footalert-bff/src/routes/teams/advancedStats.ts`
- Modify: `footalert-bff/src/routes/competitions/transfersRoute.ts`
- Modify: `footalert-bff/src/routes/players/index.ts`
- Modify: `footalert-bff/src/worker.ts`
- Modify: `footalert-bff/src/lib/notifications/queue.ts`
- Modify: `footalert-bff/src/routes/notifications.ts`
- Create: `footalert-bff/test/routes/notifications.ingest.test.ts`
- Create: `footalert-bff/test/routes/players.matchesRoute.test.ts`

**Actions:**
1. Mettre des plafonds de fanout et une concurrence bornee sur les endpoints qui multiplient les appels upstream.
2. Sortir les agregations trop lourdes (`advancedStats`) vers pre-aggregation, cache long ou job asynchrone.
3. Corriger l'ingestion notifications pour qu'elle echoue si la queue n'est pas reellement operationnelle.
4. Cibler les requetes SQL du worker par `deliveryIds` au lieu de rescanner les pending deliveries.

**Verify:**
- Run: `cd footalert-bff && npm run test -- notifications.ingest`
- Run: `cd footalert-bff && npm run test -- players.matchesRoute`
- Manual: simuler indisponibilite Redis/queue, verifier qu'on n'ecrit plus de faux `queued`.

### Task 7: Rendre le contrat API strict et consomme reellement

**Files:**
- Modify: `packages/api-contract/openapi/footalert.v1.yaml`
- Modify: `packages/app-core/src/services/competitionsService.ts`
- Modify: `packages/app-core/src/services/matchesService.ts`
- Modify: `packages/app-core/src/services/playersService.ts`
- Modify: `packages/app-core/src/services/teamsService.ts`
- Modify: `packages/app-core/src/runtime/validation.ts`

**Actions:**
1. Remplacer les schemas `FlexibleObject` sur les endpoints critiques par des schemas reels et minimaux.
2. Typiser `app-core` avec les types generes OpenAPI plutot qu'avec `unknown` + casts.
3. Passer la validation runtime en mode strict pour les endpoints critiques et garder les fallbacks seulement sur les flux non bloquants.
4. Regenerer le contrat et verrouiller l'absence de drift.

**Verify:**
- Run: `npm run contract:generate`
- Run: `npm run contract:check`
- Run: `npm run typecheck`
- Expected: erreur de build si le BFF et le client divergent sur un endpoint critique.

### Task 8: Alleger les clients web et desktop

**Files:**
- Modify: `web/src/main.tsx`
- Modify: `web/src/app/App.tsx`
- Modify: `web/src/pages/MatchesPage.tsx`
- Modify: `web/src/pages/TeamsPage.tsx`
- Modify: `web/src/pages/SearchPage.tsx`
- Modify: `web/vite.config.ts`
- Modify: `web/tsconfig.json`

**Actions:**
1. Remplacer la persistence `localStorage` synchrone par une persistence async budgetee et filtrer les queries persistables.
2. Brancher `AbortSignal` sur tous les `queryFn` qui ne l'utilisent pas encore cote web.
3. Ajouter du code splitting par route pour sortir les pages textuelles et lourdes du bundle initial.
4. Consommer `@footalert/app-core` comme package workspace au lieu de pointer directement sur `packages/*/src`.

**Verify:**
- Run: `npm run web:typecheck`
- Run: `npm run web:build`
- Expected: baisse du chunk initial et disparition des fetchs obsoletes lors des changements rapides d'ecran.

### Task 9: Ajouter observabilite, charge et deploiement deterministe

**Files:**
- Create: `footalert-bff/src/lib/observability/metrics.ts`
- Modify: `footalert-bff/src/index.ts`
- Modify: `footalert-bff/src/worker.ts`
- Create: `scripts/perf/k6-critical-routes.js`
- Modify: `.github/workflows/bff-quality.yml`
- Modify: `.github/workflows/bff-staging.yml`
- Modify: `.github/workflows/bff-production.yml`
- Modify: `deploy_vps.sh`

**Actions:**
1. Exposer des metriques minimales (`cache hit/miss`, `lock contention`, `upstream latency`, `error rate`, `queue lag`, `db saturation`).
2. Ajouter un scenario de charge sur les routes critiques et le lancer en nightly et avant release.
3. Ajouter `concurrency` dans les workflows de deploiement et supprimer le `git pull` non epingle quand c'est possible.
4. Durcir `deploy_vps.sh` pour qu'il n'avale plus les erreurs critiques.

**Verify:**
- Run: `cd footalert-bff && npm run test`
- Run: `k6 run scripts/perf/k6-critical-routes.js`
- Expected: metrics exploitables, charge reproductible et deploiement qui echoue proprement en cas d'etat incoherent.

---

## Definition of done

- Les ecrans mobile critiques (`Matches`, `CompetitionDetails`, `MatchDetails`, `Follows`) n'affichent plus de rechargements complets evitables lors des retours et changements d'onglets.
- Les endpoints BFF critiques supportent la contention cache sans cascades de `503`.
- Le contrat OpenAPI bloque les regressions de schema sur les flux critiques.
- Les regressions perf mobile et backend deviennent bloquantes en CI.
- Une baseline perf officielle existe et est maintenue.
- Une campagne de charge minimale valide les routes les plus couteuses avant release.

## Rollout recommande

1. Task 1 + Task 2
2. Task 3 + Task 4
3. Task 5 + Task 6
4. Task 7 + Task 8
5. Task 9

## Notes

- Ne pas lancer de charge sur la prod.
- Les taches 5 et 6 doivent etre accompagnees de telemetry sinon on corrigera a l'aveugle.
- Si une tache revele un probleme structurel plus large, ouvrir un sous-plan dedie plutot que d'elargir le scope a chaud.
