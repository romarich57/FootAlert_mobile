# Screen Test Matrix

## Objectif

Standardiser les tests d'écran mobile autour d'une matrice simple, réutilisable et co-localisée pour éviter les trous de couverture sur les états critiques.

## Convention de placement

- Les tests restent dans `src/ui/features/**` à côté de l'écran, du hook ou du composant testé.
- Pas de dossier `__tests__/` racine pour les features mobile.
- Les écrans utilisent le harness partagé `src/ui/shared/testing/renderWithAppProviders.tsx`.

## Matrice minimale par écran

- `loading`
- `error`
- `offline / cache`
- `empty`
- `ready`
- action principale / navigation
- persistance ou filtres si l'écran en dépend

## Répartition recommandée

- Les hooks `useXxxScreenModel` portent les règles d'orchestration et les cas limites de données.
- Les tests d'écran RNTL valident les états visibles, les CTA et la navigation.
- Les composants purement visuels gardent des tests ciblés, pas de snapshots larges par défaut.

## Priorités actuelles

- `MatchesScreen`
- `CompetitionDetailsScreen`
- `TeamDetailsScreen`
- `OnboardingScreen`
- `SearchScreen`

## Rappel E2E

- Les parcours cross-feature restent dans Maestro.
- La suite `smoke` doit rester déterministe et rapide pour les PR.
- La suite `full` complète les parcours détaillés hors PR ou en déclenchement manuel.
