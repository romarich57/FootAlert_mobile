# Feedback - API refresh et fallback configurables

## Contexte
Le besoin était de mieux contrôler la consommation API-FOOTBALL pendant la phase de développement (quota journalier), tout en gardant la possibilité de tester un mode réel sans fallback démo automatique.

## Ce qui a été fait
- Ajout de variables d'environnement pour piloter la fréquence des appels :
  - `MATCHES_QUERY_STALE_TIME_MS`
  - `MATCHES_LIVE_REFRESH_INTERVAL_MS`
  - `MATCHES_SLOW_REFRESH_INTERVAL_MS`
  - `MATCHES_MAX_REFRESH_BACKOFF_MS`
- Ajout d'une variable d'environnement pour piloter le fallback démo sur erreurs API :
  - `MATCHES_API_ERROR_FALLBACK_ENABLED`
- Intégration de ces variables dans :
  - `src/data/config/env.ts`
  - `src/ui/features/matches/hooks/useMatchesQuery.ts`
  - `src/ui/features/matches/hooks/useMatchesRefresh.ts`
  - `src/ui/features/matches/screens/MatchesScreen.tsx`
- Mise à jour des types `react-native-config` pour éviter les erreurs TypeScript.
- Mise à jour de `.env.example` et `README.md` pour documenter le comportement et les profils possibles.
- Mise à jour de `.env` local avec une cadence plus économique pour le dev.

## Choix techniques
- Centralisation des réglages dans `appEnv` pour éviter des constantes codées en dur.
- Garde-fous sur les valeurs numériques (fallback sur valeurs par défaut + cohérence lenteur/backoff).
- Comportement de fallback démo désormais explicite et contrôlable via env, au lieu d'être toujours actif sur `401/403/429`.

## Validation
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm test -- useMatchesQuery.test.ts useMatchesRefresh.test.ts MatchesScreen.test.tsx` ✅

## Reste à faire
- Ajouter un mini écran/debug panel dans l'app (tab Plus) pour afficher la config active (`staleTime`, `refresh interval`, mode fallback) sans ouvrir le code.
- Ajuster éventuellement la stratégie par écran/feature quand les tabs Competitions/Suivis seront branchées à l'API.
