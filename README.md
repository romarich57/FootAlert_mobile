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

## Architecture multi-plateforme (API-first)

Le repo inclut maintenant un socle partagé pour web/mobile/desktop:

- `packages/api-contract`: contrat OpenAPI versionné + types générés
- `packages/app-core`: services de lecture BFF + validation runtime + modèles partagés
- `web`: client React/Vite branché sur `app-core`
- `desktop`: shell Tauri 2 réutilisant le build web

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

Profils à conserver dans `Mobile_Foot/` :

- `.env` -> local/dev
- `.env.staging` -> préproduction
- `.env.production` -> production
- `.env.example`, `.env.staging.example`, `.env.production.example` -> templates versionnés

Initialisation rapide :

```bash
cp .env.example .env
cp .env.staging.example .env.staging
cp .env.production.example .env.production
```

Nettoyage des fichiers env non standards (optionnel) :

```bash
find . -maxdepth 1 -type f -name '.env*' \
  ! -name '.env' \
  ! -name '.env.staging' \
  ! -name '.env.production' \
  ! -name '.env.example' \
  ! -name '.env.staging.example' \
  ! -name '.env.production.example' \
  -delete
```

Minimum obligatoire et règles de sécurité :

- En dev, `MOBILE_API_BASE_URL` peut être en `http://localhost`, `http://127.0.0.1` ou `http://10.0.2.2`.
- En staging/prod, `MOBILE_API_BASE_URL` doit être en `https://`.
- En staging/prod, `MOBILE_PRIVACY_POLICY_URL`, `MOBILE_TERMS_OF_USE_URL`, `MOBILE_SUPPORT_URL`, `MOBILE_FOLLOW_US_URL` sont obligatoires et en `https://`.
- En staging/prod, `MOBILE_AUTH_ATTESTATION_MODE=provider` et `MOBILE_ATTESTATION_STRATEGY=strict`.
- Si `MOBILE_PINNING_ENABLED=true` hors dev, `MOBILE_PINNING_SPKI_PRIMARY` et `MOBILE_PINNING_SPKI_BACKUP` sont obligatoires.
- `NOTIFICATIONS_MATCH_BACKEND_ENABLED` active la consommation des notifications match côté mobile.
- `MOBILE_PUSH_TOKEN` reste optionnelle (utile en QA/staging pour forcer un token explicite).

Lancement par profil :

```bash
# dev
npm start
npm run ios
npm run android

# staging
npm run start:staging
npm run ios:staging
npm run android:staging

# production
npm run start:production
npm run ios:production
npm run android:production
```

Note Android émulateur : utiliser `MOBILE_API_BASE_URL=http://10.0.2.2:3001/v1`.

## URLs légales publiques (web)

- `/legal/privacy`
- `/legal/terms`
- `/legal/cookies`
- `/legal/data-deletion`

Ces routes doivent rester stables, avec `policyVersion` et `lastUpdated` visibles.

## Politique âge & positionnement contenu

- Positionnement produit: contenu football **informatif**.
- Public cible: **13+**.
- Les prédictions affichées ne constituent **pas** un conseil de pari.
- Référence conformité stores: `docs/compliance/store-age-rating.md`.

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

3. Tester l'app mobile avec le profil staging :

```bash
cp .env.staging.example .env.staging
npm run ios:staging
# ou
npm run android:staging
```

4. Avant les tests mobile en production (notifications incluses), vérifier côté BFF:

- `NOTIFICATIONS_BACKEND_ENABLED=true`
- `NOTIFICATIONS_EVENT_INGEST_ENABLED=true`
- `NOTIFICATIONS_PERSISTENCE_BACKEND=postgres`
- `DATABASE_URL`, `REDIS_URL`
- `NOTIFICATIONS_INGEST_TOKEN`, `PUSH_TOKEN_ENCRYPTION_KEY`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

5. Pour la prod BFF, lancer le workflow manuel `.github/workflows/bff-production.yml`
   après migration notifications (`npm run db:migrate:notifications`) avec `migration_confirmed=yes`.

6. Tester l'app mobile avec le profil production :

```bash
cp .env.production.example .env.production
npm run ios:production
# ou
npm run android:production
```

Référence détaillée: `docs/infra/notifications-prod-rollout.md`.

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
npm run contract:check
npm run typecheck
npm test
npm run ios:staging
npm run android:staging
npm run ios:production
npm run android:production
npm run qa:competitions:team-stats:preflight
npm run aso:validate:metadata
npm run aso:validate:assets
npm run aso:validate:icon-ios
npm run aso:validate
npm run check:file-size
npm run check:all
npm run check:lazy-screens
npm run check:hermes-enabled
npm run web:typecheck
npm run web:build
npm run desktop:typecheck
npm run desktop:build
npm run storybook
npm run storybook:ios
npm run storybook:android
```

Guide Storybook React Native: `docs/mobile/storybook-react-native.md`.

## E2E mobile Match Details (Maestro)

Les flows Maestro pour `Match Details` sont dans `.maestro/`:

- `match-details-summary-flow.yaml` (données complètes)
- `match-details-empty-blocks-flow.yaml` (blocs optionnels absents)
- `match-details-error-flow.yaml` (erreur BFF visible)

Le workflow CI `.github/workflows/mobile-e2e-match-details.yml` lance ces flows avec un stub BFF déterministe local:

```bash
npm run e2e:mobile:bff-stub
```

Puis l'app Android est lancée et testée via Maestro.

## Performance runtime (Hermes + cold-start)

- Hermes est activé côté Android (`android/gradle.properties`) et iOS (`ios/Mobile_Foot.xcodeproj/project.pbxproj`).
- Prefetch React Query activé sur navigation onglets (`Matches`, `Competitions`, `Follows`).
- Refresh live adapté au mode batterie faible via `MATCHES_BATTERY_SAVER_REFRESH_INTERVAL_MS` (défaut `300000` ms).
- Validation locale rapide:

```bash
npm run check:hermes-enabled
npm run check:lazy-screens
```

- Audit cold-start Android:

```bash
npm run perf:android:audit
npm run perf:android:audit:slo
npm run perf:android:audit:slo -- "" 750 1200 6
```

Seuils SLO courants:

- `p50 < 750ms`
- `p95 < 1200ms`
- `janky_frames < 6%`

- Smoke PR (runs réduits):

```bash
npm run perf:android:audit:smoke
```

Référence complète: `docs/mobile/performance.md`.

## Vérification contrat API

```bash
npm run contract:lint
npm run contract:generate
npm run contract:check
```

Le contrat source est `packages/api-contract/openapi/footalert.v1.yaml` et les types générés sont `packages/api-contract/generated/types.ts`.

## Client web

```bash
cd web
npm install
npm run dev
```

URL par défaut: `http://localhost:5173` (avec `VITE_WEB_API_BASE_URL` vers le BFF).

## Desktop (Tauri 2 shell)

```bash
cd desktop
npm install
npm run build
```

Ce script génère d'abord le build web puis valide la configuration Tauri.

## Release Android (signing)

Le build `release` Android nécessite un keystore dédié et 4 variables de signing (`FOOTALERT_UPLOAD_*`).

Référence complète : `docs/mobile/android-release-signing.md`.

## Parité multi-plateforme

Matrice et scénarios de validation: `docs/architecture/multi-platform-parity.md`.

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

### Modules refactorisés

- UI Teams:
  - `src/ui/features/teams/components/overview/*`
  - `src/ui/features/teams/components/stats/*`
  - `src/ui/features/teams/components/standings/*`
- UI Players:
  - `src/ui/features/players/components/stats/*`
  - `src/ui/features/players/components/career/*`
  - `src/ui/features/players/components/profile/*`
- BFF routes:
  - `footalert-bff/src/routes/teams/*`
  - `footalert-bff/src/routes/players/*`
  - façade de compatibilité conservée via `footalert-bff/src/routes/teams.ts` et `footalert-bff/src/routes/players.ts`

## Gates de taille (bloquants)

- `npm run check:file-size` est intégré à `npm run check:all`.
- Seuil UI: tout `src/ui/**/*.tsx` (hors tests) doit rester `<= 350` lignes.
- Seuil BFF routes: tout `footalert-bff/src/routes/**/*.ts` (hors tests) doit rester `<= 500` lignes.
- Script utilisé: `scripts/quality/check-file-line-limits.sh`.

## Règles de base

- Tout texte UI passe par i18n (`src/ui/shared/i18n`).
- Navigation strictement typée (`src/ui/app/navigation/types.ts`).
- Données serveur via React Query.
- Aucun secret API tiers dans l’application mobile.

## QA visuelle guidée (Compétitions > Stats équipes)

- Préflight ciblé: `npm run qa:competitions:team-stats:preflight`
- Checklist manuelle (petits écrans / dark mode / scroll / lazy avancé):
  `docs/mobile/competition-team-stats-qa-checklist.md`
