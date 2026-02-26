# Storybook React Native

## Objectif
Storybook permet de valider les composants UI isolément (états normal/loading/error/empty) sans lancer les parcours complets de l’app.

## Commandes
- `npm run storybook:generate` génère `/.storybook/storybook.requires.ts`.
- `npm run storybook` démarre Metro en mode Storybook.
- `npm run storybook:ios` lance l’app iOS en mode Storybook.
- `npm run storybook:android` lance l’app Android en mode Storybook.

## Activation
- Le mode Storybook est piloté par `STORYBOOK_ENABLED=true` (scripts npm déjà configurés).
- Le wrapper Metro Storybook est appliqué dans [`metro.config.js`](/Users/romarich/Desktop/Projet_perso/Football_apps/Mobile_Foot/metro.config.js).
- Le point d’entrée de l’app bascule automatiquement sur Storybook dans [`App.tsx`](/Users/romarich/Desktop/Projet_perso/Football_apps/Mobile_Foot/App.tsx).

## Emplacement de configuration
- Dossier de config: `/.storybook`
- Fichiers principaux:
  - [`main.ts`](/Users/romarich/Desktop/Projet_perso/Football_apps/Mobile_Foot/.storybook/main.ts)
  - [`preview.tsx`](/Users/romarich/Desktop/Projet_perso/Football_apps/Mobile_Foot/.storybook/preview.tsx)
  - [`index.ts`](/Users/romarich/Desktop/Projet_perso/Football_apps/Mobile_Foot/.storybook/index.ts)

## Conventions de stories
- Nommage: `*.stories.tsx`
- Emplacement recommandé: `src/ui/stories/`
- Chaque story critique doit couvrir au minimum:
  - état nominal
  - état vide / fallback (si applicable)
  - variante métier importante (live/upcoming, following/not-following, etc.)

## Matrice de couverture (scope actuel)

### Core (shared UI)
- `IconActionButton`: couvert
- `SectionInProgressView`: couvert
- `FollowToggleButton`: couvert
- `MatchCard`: couvert
- `TransferCard`: couvert

### Teams / Overview (composants extraits)
- `OverviewNextMatchCard`: couvert
- `OverviewRecentFormCard`: couvert
- `OverviewSeasonOverviewCard`: couvert
- `OverviewMiniStandingCard`: couvert
- `OverviewStandingHistoryCard`: couvert
- `OverviewCoachPerformanceCard`: couvert
- `OverviewPlayerLeadersCard`: couvert
- `OverviewCompetitionsCard`: couvert
- `OverviewStadiumInfoCard`: couvert

### Teams / Stats (composants extraits)
- `TeamPointsCard`: couvert
- `TeamGoalsCard`: couvert
- `TeamTopPlayersSection`: couvert
- `TeamComparisonMetricsSection`: couvert

### Players / Stats (composants extraits)
- `PlayerStatsHeaderCard`: couvert
- `PlayerStatsShotsCard`: couvert
- `PlayerStatsPerformanceCard`: couvert
- `PlayerStatsSectionBlock`: couvert

## Fixtures partagées
- Utiliser les fixtures centralisées dans `src/ui/stories/fixtures/`:
  - `teamFixtures.ts`
  - `playerFixtures.ts`
- Objectif: éviter la duplication des mocks et garder des stories cohérentes entre features.

## Conventions de naming et d’états
- `title` Storybook: `Feature/Section/ComponentName` (ex: `Teams/Overview/OverviewMiniStandingCard`).
- Export minimal attendu:
  - `Default`
  - un état edge (`Empty`, `Sparse`, `MissingImage`, etc.) selon le composant.
- Les stories de composants extraits doivent réutiliser:
  - `useAppTheme` + styles de feature (`*.styles.ts`)
  - `useTranslation` pour les labels i18n.

## Procédure après extraction d’un composant
1. Ajouter ou réutiliser des fixtures dans `src/ui/stories/fixtures/`.
2. Créer `src/ui/stories/<Component>.stories.tsx` avec `Default` + 1 état edge.
3. Vérifier que la story compile via `npm run storybook:generate`.
4. Mettre à jour cette matrice de couverture (section feature concernée).
