# Mobile Runtime Ownership

## Bootstrap
- Owner: `src/ui/app/hooks/useAppBootstrap.ts`
- Responsibility: cold-start sequencing, startup attestation health, consent sync kickoff, review prompt gating, and background refresh registration handoff.

## Navigation Telemetry
- Owner: `src/ui/app/hooks/useNavigationTelemetry.ts`
- Responsibility: root navigation readiness and route-change telemetry only.

## Preferences
- Owner: `src/ui/app/providers/AppPreferencesProvider.tsx`
- Responsibility: hydrate persisted preferences, expose mutations, apply i18n, and publish user-context telemetry fields derived from preferences.

## Notifications Runtime
- Owner: `src/ui/app/providers/NotificationsRuntimeProvider.tsx`
- Responsibility: push token sync, notification runtime start/stop, and deferred network handling for notification registration.

## Background Refresh
- Owner: `src/data/background/backgroundRefresh.ts`
- Responsibility: `shared-package` registration policy for Android+iOS, runtime eligibility checks, dev-only deterministic trigger, and low-cost cache warming for top-level mobile data.
- Fallback contract: if the OS does not execute the task, the accepted behavior is `skip + telemetry`, without any platform-specific parallel path.

## Security
- Owner: `src/data/security/*`
- Responsibility: attestation startup health, session auth, SSL pinning, and device integrity checks.

## Performance Guardrails
- Owner: `package.json`, `.github/workflows/mobile-quality.yml`, `scripts/perf/*`
- Responsibility: mobile typecheck boundary, test/contract/perf entrypoints, Android perf smoke thresholds, and perf artifact capture.
