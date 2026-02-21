# Setup environnement React Native (feature-first)

## Ce qui a ete fait

- Mise a jour de la documentation pour expliciter PostgreSQL comme base backend:
  - `Agents.md`
  - `PRD_ FootScores Mobile App _React Native _ API-FOOTBALL_.md`
  - `README.md`
- Mise en place d'un socle d'architecture `feature-first` dans `src/`:
  - bootstrap app (`src/app/App.tsx`)
  - providers (`QueryProvider`, `ThemeProvider`)
  - navigation typee (`RootNavigator`, `types.ts`, `linking.ts`)
  - ecrans initiaux `Matches`, `Competitions`, `Follows`, `More`
  - i18n centralise FR/EN (`src/shared/i18n`)
  - theme centralise (`src/shared/theme/theme.ts`)
  - services `http` et `storage` (`AsyncStorage`, `Keychain`)
- Configuration outillage:
  - alias `@/` (TypeScript + Babel + Jest)
  - setup Jest pour navigation/reanimated/localize
  - scripts npm `typecheck` et `lint:fix`
- Dependances installees selon le document bonnes pratiques:
  - React Navigation, TanStack Query, i18next/react-i18next, RHF, Zod, Zustand, FlashList, Reanimated, AsyncStorage, Keychain.

## Choix techniques

- Socle minimal executable en priorisant:
  - navigation bottom tabs typee
  - providers transverses
  - architecture de dossiers cible
  - conventions de nommage et alias
- Pas d'implementation metier P0 (API-Football, cache TTL, notifs, ads) a cette etape: objectif = environnement de travail propre et pret.

## Difficultes rencontrees

- Configuration Jest avec ESM de `@react-navigation/native`:
  - correction via `transformIgnorePatterns`.
- Ajustements lint RN:
  - suppression des warnings bloquants (styles inline/no-void/jest globals).

## Ce qui reste a faire

- Implementer la feature P0 `Matches` avec:
  - date picker, filtres, sections competition, etats UX (loading/empty/error/offline).
- Brancher API-Football via couche `services/http` + React Query.
- Ajouter persistance metier (suivis/preferences) et cache offline structure.
- Initialiser backend notifs (Node/Express + PostgreSQL + FCM).
