# FootAlert Mobile — Agent Memory

## Architecture des types domaine

- Les types domaine partagés (DTOs, modèles) sont dans `src/domain/contracts/competitions.types.ts`
- Le fichier `src/ui/features/competitions/types/competitions.types.ts` ne fait qu'un re-export : `export * from '@domain/contracts/competitions.types'`
- Pour ajouter des types, modifier directement `src/domain/contracts/competitions.types.ts`

## Pattern Query (React Query)

- `queryKeys` : `src/ui/shared/query/queryKeys.ts` — clés organisées par feature
- `featureQueryOptions` : `src/ui/shared/query/queryOptions.ts` — staleTime + retry par feature
- Les hooks utilisent `useQuery<T, Error>` + `keepPreviousData` + `enabled: !!param`
- `gcTime: 24 * 60 * 60 * 1000` pour les données stables (bracket, bracket, etc.)

## Pattern Service (BFF)

- Deux cas distincts selon la réponse BFF :
  1. **Enveloppe** `{ response: T[] }` → utiliser `fetchList()` interne dans `competitionsService.ts`
  2. **Objet direct** (ex: bracket, totw) → utiliser `http.get<T>()` directement
- Le pattern totw (`fetchCompetitionTotw`) est le modèle pour les réponses directes
- `fetchCompetitionBracket` suit ce même pattern

## Pattern Composant

- `createStyles(colors: ThemeColors)` en dehors du composant, appelé avec `useMemo`
- `useAppTheme()` pour les couleurs, jamais de couleurs hardcodées
- `useTranslation()` pour tous les textes
- `FlashList` pour toutes les listes, jamais `FlatList`
- Composants sous-fonctions (helpers) déclarés AVANT le composant exporté dans le même fichier
- Limite stricte 350 lignes par composant UI

## Clés i18n — Conventions

- Section `competitionDetails` dans `fr.ts` et `en.ts`
- Clés bracket : `competitionDetails.bracket.title`, `competitionDetails.bracket.rounds.{key}`, `competitionDetails.bracket.tbd`
- Noms de rounds normalisés : `final`, `semi_final`, `quarter_final`, `round_of_16`, `round_of_32`, `other`

## Fichiers clés à toujours lire avant de modifier

- `src/ui/shared/query/queryKeys.ts` — ajouter les nouvelles clés dans la feature existante
- `src/ui/shared/query/queryOptions.ts` — ajouter les timings dans `featureQueryOptions`
- `packages/app-core/src/services/competitionsService.ts` — ajouter les méthodes de service
- `src/data/endpoints/competitionsApi.ts` — ajouter les wrappers API

## Composants réutilisables confirmés

- `AppPressable` depuis `@ui/shared/components` — bouton accessible avec press feedback
- `useAppTheme()` depuis `@ui/app/providers/ThemeProvider` — retourne `{ colors }`

## Limites qualité vérifiées

- `npm run check:keys` — vérifie l'absence de `key={index}`
- `npm run lint` — ESLint strict, `no-explicit-any`
- `npx tsc --noEmit` — TypeScript strict
- Composants : ≤ 350 lignes (vérifier avec `wc -l`)

## Détail : KnockoutBracketView

- Fichier : `src/ui/features/competitions/components/KnockoutBracketView.tsx`
- Props : `rounds: KnockoutRound[]`, `sectionTitle?: string` (optionnel, affiche un titre de section)
- Design : `ScrollView horizontal` > colonnes (rounds) > `BracketMatchCard` (140×72px)
- Gagnant : `color: colors.primary` + `fontWeight: '700'`

## Détail : intégration CompetitionStandingsTab

- `isCupOnly` (`cup`) : bracket seul, pas de standings
- `isMixed` (`mixed`) : standings + bracket (titre via sectionTitle prop)
- `league` ou pas de bracket : comportement standings seul (inchangé)
- Hook : `useCompetitionBracket(competitionId, season)`
