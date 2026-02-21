# FootAlert Mobile (React Native)

Application mobile FootAlert (iOS/Android) construite en React Native + TypeScript.

## Stack technique

- React Native 0.84 + React 19
- Navigation: React Navigation (Bottom Tabs + Native Stack)
- Server state + offline persistence: TanStack Query + Persist Query Client
- i18n: i18next + react-i18next
- Form: React Hook Form + Zod
- UI perf: FlashList
- Stockage local: AsyncStorage

## Architecture data (mobile + BFF)

Le mobile ne parle plus directement à API-Football.

- Mobile -> `MOBILE_API_BASE_URL` (BFF)
- BFF -> API-Football avec `API_FOOTBALL_KEY` côté serveur uniquement

Référence: `docs/architecture/mobile-data-flow.md`.

## Prérequis

- Node `>=22.11.0`
- npm
- Xcode (iOS) / Android Studio (Android)
- CocoaPods (iOS)

## Installation

```bash
npm install
```

## Variables d'environnement mobile

Créer un fichier `.env` à la racine de `Mobile_Foot` (à partir de `.env.example`) :

```bash
cp .env.example .env
```

Puis renseigner au minimum :

```env
MOBILE_API_BASE_URL=http://localhost:3001/v1
```

Variables utiles pour la cadence et les limites UI :

```env
MATCHES_QUERY_STALE_TIME_MS=60000
MATCHES_LIVE_REFRESH_INTERVAL_MS=60000
MATCHES_SLOW_REFRESH_INTERVAL_MS=120000
MATCHES_MAX_REFRESH_BACKOFF_MS=300000
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

## BFF (footalert-bff)

Le BFF est dans `footalert-bff/`.

```bash
cd footalert-bff
cp .env.example .env
npm install
npm run dev
```

Variables minimales côté BFF:

```env
API_FOOTBALL_KEY=your_server_side_api_football_key
```

## Validation staging avant prod

1. Déployer le BFF staging via le workflow `.github/workflows/bff-staging.yml`.
2. Vérifier les smoke checks staging:

```bash
MOBILE_API_BASE_URL=https://your-staging-domain/v1 npm run staging:bff:smoke
```

3. Tester l'app mobile en pointant `MOBILE_API_BASE_URL` vers staging (ex: `.env.staging`), puis lancer:

```bash
cp .env.staging.example .env.staging
# puis utiliser ENVFILE=.env.staging selon votre setup react-native-config
npm run ios
# ou
npm run android
```

## iOS uniquement

```bash
bundle install
bundle exec pod install
```

Si tu ajoutes/modifies des dépendances natives, relance `pod install`.

## Lancer l'application

```bash
# 1) terminal BFF (depuis Mobile_Foot/footalert-bff)
npm run dev

# 2) terminal metro (depuis Mobile_Foot)
npm start

# 3) terminal android (depuis Mobile_Foot)
npm run android

# 4) terminal ios (depuis Mobile_Foot)
npm run ios
```

## Scripts utiles

```bash
npm run lint
npm run typecheck
npm test
npm run aso:validate
npm run check:all
```

## Release Android (signing)

Le build `release` Android nécessite un keystore dédié et 4 variables de signing (`FOOTALERT_UPLOAD_*`).

Référence complète : `docs/mobile/android-release-signing.md`.

## Architecture (feature-first)

```text
src/
  data/
    api/
    config/
    endpoints/
    mappers/
    storage/
  ui/
    app/
      navigation/
      providers/
    features/
      competitions/
      follows/
      matches/
      more/
      players/
      teams/
    shared/
      i18n/
      query/
      testing/
      theme/
```

## Règles de base

- Tout texte UI passe par i18n (`src/ui/shared/i18n`).
- Navigation strictement typée (`src/ui/app/navigation/types.ts`).
- Données serveur via React Query.
- Aucun secret API tiers dans l’application mobile.
