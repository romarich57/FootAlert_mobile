# Performance mobile

## Objectifs

- Réduire le coût du démarrage via lazy-loading des écrans secondaires.
- Précharger les données des onglets principaux au moment de la navigation.
- Standardiser le rendu d'images distantes avec cache disque/mémoire.
- Garder Hermes activé sur Android et iOS.
- Surveiller le cold-start Android via CI.
- Adapter le rafraîchissement live au mode batterie faible.

## Lazy loading navigation

Les écrans secondaires du stack sont déclarés avec `getComponent` dans `src/ui/app/navigation/RootNavigator.tsx`:

- `MatchDetails`
- `CompetitionDetails`
- `TeamDetails`
- `PlayerDetails`
- `SearchPlaceholder`

Contrôle statique:

```bash
npm run check:lazy-screens
```

Le script vérifie:

- absence d'imports eager pour les écrans stack secondaires,
- absence de `lazy: false` dans `RootNavigator`,
- présence des `getComponent` attendus.

## Images optimisées

`AppImage` (`src/ui/shared/media/AppImage.tsx`) encapsule `react-native-fast-image` avec:

- cache par défaut `immutable`,
- mapping `resizeMode`,
- fallback automatique vers `react-native` `Image` en cas d'erreur ou source non supportée.

## Prefetch navigation

Le hook `src/ui/app/navigation/useMainTabsPrefetch.ts` déclenche un prefetch React Query sur `tabPress`:

- `Matches`: `queryKeys.matches(today, timezone)` (même queryFn que `useMatchesQuery`)
- `Competitions`: `queryKeys.competitions.catalog()`
- `Follows`: IDs suivis, cartes suivies, trends équipes/joueurs

Garde-fous:

- cooldown anti-spam de 20s par onglet,
- skip automatique hors ligne.

## Refresh batterie faible

Le refresh live utilise `usePowerState` (`react-native-device-info`) et applique une cadence minimale via:

- `MATCHES_BATTERY_SAVER_REFRESH_INTERVAL_MS` (défaut `300000` ms)

Quand `lowPowerMode=true`, la cadence de polling ne descend jamais en dessous de ce seuil.

## Hermes

Hermes doit rester activé:

- Android: `android/gradle.properties` -> `hermesEnabled=true`
- iOS: `ios/Mobile_Foot.xcodeproj/project.pbxproj` -> `USE_HERMES = true;`

Contrôle statique:

```bash
npm run check:hermes-enabled
```

## Cold-start CI

Workflow: `.github/workflows/mobile-quality.yml`

- `android-perf-budget` (nightly): audit + SLO + comparaison baseline.
- `android-perf-smoke` (PR, non bloquant): audit réduit + SLO + artefacts + résumé `GITHUB_STEP_SUMMARY`.

SLO appliqués:

- `p50 < 750ms`
- `p95 < 1200ms`
- `janky_frames < 6%`

Commandes locales:

```bash
npm run perf:android:audit
npm run perf:android:audit:slo
npm run perf:android:audit:smoke
npm run perf:android:audit:slo -- "" 750 1200 6
```
