# FootAlert Mobile (React Native)

Application mobile FootAlert (iOS/Android) construite en React Native + TypeScript.

## Stack technique

- React Native 0.84 + React 19
- Navigation: React Navigation (Bottom Tabs + Native Stack)
- Server state: TanStack Query
- i18n: i18next + react-i18next
- Form: React Hook Form + Zod
- UI perf: FlashList
- Stockage local: AsyncStorage
- Backend data store: PostgreSQL

## Prérequis

- Node `>=22.11.0`
- npm
- Xcode (iOS) / Android Studio (Android)
- CocoaPods (iOS)

## Installation

```bash
npm install
```

## Variables d'environnement API-Football

Créer un fichier `.env` à la racine de `Mobile_Foot` (à partir de `.env.example`) :

```bash
cp .env.example .env
```

Puis renseigner au minimum :

```env
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
API_FOOTBALL_KEY=your_real_key
MATCHES_DEMO_MODE=false
```

Variables utiles pour contrôler la consommation API en dev :

```env
# Fallback démo auto sur erreurs API (401/403/429) :
# true = affiche des données démo si quota/auth KO
# false = affiche les vraies erreurs (mode réel)
MATCHES_API_ERROR_FALLBACK_ENABLED=true

# Cadence de requêtes (en millisecondes)
MATCHES_QUERY_STALE_TIME_MS=60000
MATCHES_LIVE_REFRESH_INTERVAL_MS=60000
MATCHES_SLOW_REFRESH_INTERVAL_MS=120000
MATCHES_MAX_REFRESH_BACKOFF_MS=300000
```

Variables utiles pour l'onglet Suivis (quota/perf) :

```env
FOLLOWS_SEARCH_DEBOUNCE_MS=500
FOLLOWS_SEARCH_MIN_CHARS=2
FOLLOWS_SEARCH_RESULTS_LIMIT=20
FOLLOWS_TEAM_NEXT_FIXTURE_TTL_MS=3600000
FOLLOWS_PLAYER_STATS_TTL_MS=3600000
FOLLOWS_TRENDS_TTL_MS=21600000
FOLLOWS_TRENDS_LEAGUE_COUNT=7
FOLLOWS_TRENDS_TEAMS_LIMIT=8
FOLLOWS_TRENDS_PLAYERS_LIMIT=8
FOLLOWS_MAX_FOLLOWED_TEAMS=30
FOLLOWS_MAX_FOLLOWED_PLAYERS=30
```

Exemple de profil dev économe en quota :

```env
MATCHES_LIVE_REFRESH_INTERVAL_MS=180000
MATCHES_SLOW_REFRESH_INTERVAL_MS=300000
MATCHES_MAX_REFRESH_BACKOFF_MS=600000
```

### iOS uniquement

```bash
bundle install
bundle exec pod install
```

Si tu ajoutes/modifies des dépendances natives (`react-native-config`, etc.), relance `pod install`.

## Lancer l'application

```bash
# 1) terminal metro
npm start

# 2) terminal android
npm run android

# 3) terminal ios
npm run ios
```

Important : le flux Matchs V1 appelle directement API-Football depuis l'app mobile.

- Sans `API_FOOTBALL_KEY`, l’écran Matchs bascule en mode démo (fallback).
- Si `MATCHES_API_ERROR_FALLBACK_ENABLED=false`, les erreurs API (dont quota) restent visibles et aucun fallback démo n’est appliqué.

## Scripts utiles

```bash
npm run lint
npm run typecheck
npm test
```

## Architecture (feature-first)

```text
src/
  app/
    App.tsx
    navigation/
    providers/
  features/
    matches/
    competitions/
    follows/
    more/
  shared/
    config/
    i18n/
    theme/
    ui/
  services/
    http/
    storage/
```

## Règles de base

- Tout texte UI passe par i18n (`src/shared/i18n`).
- Navigation strictement typée (`src/app/navigation/types.ts`).
- Données serveur via React Query.
- Aucun secret en dur dans le code.
- Respect du document `react-native-bonnes-pratiques.md`.
