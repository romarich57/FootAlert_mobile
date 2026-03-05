# Patterns de performance — feature competitions (audit 2026-03-05)

## P1 — renderTabContent dépend de l'objet screenModel entier
Fichier : CompetitionDetailsScreen.tsx:157
useCallback([screenModel]) — screenModel est un nouvel objet à chaque render du hook.
Fix : extraire les valeurs scalaires nécessaires dans les dépendances.

## P2 — estimatedItemSize=340 dans FlashList standings
Fichier : CompetitionStandingsTab.tsx:322
La vraie hauteur d'un item 'row' est ~48px (paddingVertical:12 x2 + contenu ~24px).
Un 'header' fait ~80px. Valeur 340 force FlashList à recalculer toutes ses estimations.
Fix : estimatedItemSize=52, utiliser overrideItemLayout pour les headers.

## P3 — followedIds.includes() O(n) à chaque render
Fichier : useCompetitionDetailsScreenModel.ts:60-62
followedIds est un tableau. .includes() est O(n). Si l'utilisateur suit 50 compétitions, c'est 50 comparaisons à chaque render du hook.
Fix : useMemo(() => new Set(followedIds), [followedIds]) puis .has().

## P4 — Inline arrow dans renderItem (StandingsTab et MatchesTab)
Fichier : CompetitionStandingsTab.tsx:247 et CompetitionMatchesTab.tsx:208, 258
() => onPressTeam(String(data.teamId)) crée une nouvelle fonction à chaque appel de renderItem.
FlashList réutilise les cellules mais React voit des props différentes → re-render.
Fix : passer teamId directement via un composant mémoïsé ou extraire un composant StandingRow.

## P5 — Double useMemo chaîné inutile dans useCompetitionTeamStats
Fichier : useCompetitionTeamStats.ts:214-231
advancedQueryData (l.214) → advancedPayloads (l.222) : deux passes .map() sur les mêmes données.
La deuxième map ne fait que retirer hasRequestError, ce qui pourrait se faire en une seule passe.
Fix : fusionner les deux useMemo en un seul.

## P6 — playerStats BFF TTL vs staleTime désynchronisé (critique)
BFF playerStatsRoute.ts:26 : TTL = 90_000ms (90s)
queryOptions.ts:50 : playerStats staleTime = 60 * 60 * 1000 (3600s = 1h)
Problème inverse : le client garde ses données fraîches 1h mais le BFF les invalide toutes les 90s.
Résultat : l'utilisateur voit des données jusqu'à 1h périmées même si le BFF a des données fraîches.
Fix : aligner staleTime competitions.playerStats à 5 * 60 * 1000 (5min) ou augmenter le BFF TTL à 30min.

## P7 — sort inline avec new Date() dans processedFixtures
Fichier : CompetitionMatchesTab.tsx:93-115
Le sort comparator recalcule new Date(a.date).getTime() à chaque comparaison.
Pour 380 matchs (saison complète Ligue 1), ça peut être ~2000 appels new Date().
Fix : pré-calculer les timestamps avant le sort (schwartzian transform).

## P8 — getDescriptionColor appelle normalize+replace sur chaque render
Fichier : CompetitionStandingsTab.tsx:151-163
normalize('NFD').replace() sur chaque item à chaque render renderItem.
Devrait être calculé une fois dans le mapper et stocké dans le modèle (champ normalisé).

## P9 — totwData déclenche un fetch AVANT que seasonsLoading soit terminé
Fichier : useCompetitionDetailsScreenModel.ts:83-86
La condition `seasonsLoading ? undefined : actualSeason` est correcte mais le hook useCompetitionTotw
est quand même monté et évalue enabled=false à chaque render pendant le chargement des saisons.
Pas de fetch inutile, mais le hook s'enregistre dans React Query inutilement.
Mineur car enabled=false est peu coûteux.

## P10 — Concurrency hardcodée dans useCompetitionTeamStats queryKey
Fichier : useCompetitionTeamStats.ts:183
effectiveAdvancedConcurrency fait partie de la queryKey du batch.
Si la valeur par défaut est 3 et que l'appelant ne passe pas advancedConcurrency, la clé
contient toujours '3'. Mais si l'appelant passe une valeur différente puis revient à undefined,
les deux entrées de cache coexistent. Risque faible mais gaspillage de cache.

## P11 — useEffect de auto-scroll avec setTimeout 500ms
Fichier : CompetitionMatchesTab.tsx:149-175
setTimeout de 500ms bloquant pour attendre que le layout soit terminé est une heuristique fragile.
Sur des appareils lents, 500ms peut ne pas suffire. Sur des appareils rapides, c'est un délai inutile.
Fix : utiliser onLayout ou InteractionManager.runAfterInteractions().

## P12 — TOTW formation hardcodée '4-3-3'
Fichier : competitionsMapper.ts:458
La formation est toujours '4-3-3' indépendamment des vrais rôles des joueurs sélectionnés.
Pas un problème de performance mais un bug logique qui peut survenir avec des sélections DEF/MID/ATT inhabituelles.

## P13 — resolvePrimaryCompetitionStatistic : spread + sort sur chaque joueur
Fichier : competitionsMapper.ts:152
[...candidates].sort(...) crée un nouveau tableau et trie pour chaque joueur dans mapPlayerStatsDtoToPlayerStats.
Pour 20 joueurs TOTW avec 5 stats chacun, c'est 20 sorts de 5 éléments.
Mineur mais peut être optimisé avec un simple find du maximum (O(n) au lieu de O(n log n)).

## P14 — gcTime global 5min trop court pour une app offline-first
Fichier : queryOptions.ts:4
QUERY_GC_TIME_MS = 5 * 60_000 (5min)
Les données des compétitions (standings, fixtures) durent 24h dans AsyncStorage mais gcTime 5min
signifie que React Query vide le cache mémoire après 5min. Au retour sur la page après 5min,
React Query doit relire depuis AsyncStorage (coût I/O) avant de re-fetcher.
Fix : gcTime = 30 * 60_000 (30min) pour réduire les lectures AsyncStorage.
