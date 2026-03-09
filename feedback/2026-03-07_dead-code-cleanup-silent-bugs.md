# Silent Bugs Found During Dead Code Cleanup

Date: 2026-03-07

This file is a findings ledger only. No fix from this list was mixed into the dead-code cleanup branch.

## Mobile

### `src/shared/i18n/language.ts`

- Risk: fallback language resolution only checks `getLocales()[0]`
- Silent impact: devices with first locale unsupported and second locale supported can silently fall back to `fr` instead of the supported secondary locale
- Suggested validation:
  - add unit tests for locale arrays such as `['es-ES', 'en-US']`

### `src/ui/app/navigation/linking.ts`

- Risk: invalid deep-link identifiers are coerced to `''`
- Silent impact: navigation reaches a valid screen path with an empty id, then fails later in screen-model logic instead of rejecting early
- Suggested validation:
  - add deep-link parsing tests for invalid ids like `abc`, `0`, `001`

### `src/ui/features/onboarding/hooks/useOnboardingModel.ts`

- Risk: `handleSkip()` delegates to the same advancement logic as continue
- Silent impact: tapping Skip advances one step instead of completing onboarding
- Suggested validation:
  - assert `handleSkip()` marks onboarding complete and triggers `onDone`

### `src/ui/features/follows/hooks/useFollowsScreenModel.ts`
### `src/ui/features/follows/hooks/useFollowsSearch.ts`

- Risk: local merged search sources can contain duplicates before API deduplication runs
- Silent impact: users may see the same team/player repeated in follows search
- Suggested validation:
  - add tests with identical ids present in `followed` and `trends`

## BFF

### `footalert-bff/src/server.ts`

- Risk: several mounted GET routes are absent from `CACHE_CONTROL_BY_ROUTE`
- Silent impact: routes behave inconsistently under CDN/browser caching policies with no obvious functional failure
- Observed missing paths during audit:
  - `/v1/competitions/:id/bracket`
  - `/v1/competitions/:id/totw`
  - `/v1/follows/players/cards`
  - `/v1/follows/search/competitions`
  - `/v1/follows/teams/cards`
  - `/v1/follows/trends/competitions`
  - `/v1/notifications/metrics`
  - `/v1/notifications/subscriptions`
  - `/v1/players/:id/overview`
  - `/v1/players/:id/stats-catalog`
  - `/v1/teams/:id/advanced-stats`
  - `/v1/teams/:id/overview-leaders`
  - `/v1/teams/standings`

## Web / Shared

### `web/vite.config.ts`
### `web/tsconfig.json`

- Risk: web resolves `@app-core` directly to `../packages/app-core/src`
- Silent impact: web can bypass the packaged export surface and diverge from what downstream consumers actually ship
- Suggested validation:
  - switch to package-consumer resolution on a dedicated branch and rerun web parity/build checks
