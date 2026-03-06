# Mobile Telemetry Taxonomy

## Bootstrap
- `bootstrap.phase`
  - Emitted when the mobile app advances through `blocking`, `deferred`, and `opportunistic`.
- `privacy.mobile_consent.synced`
  - Records consent sync status and source after bootstrap.

## Navigation
- `navigation.ready`
  - First route resolved by the root navigation container.
- `navigation.route_change`
  - Route transition tracked with throttle protection.

## Background Refresh
- `background.refresh.registered`
  - Background refresh registered with policy metadata.
- `background.refresh.skipped`
  - Registration skipped because of platform, hydration, network, power, or recent-run constraints.
- `background.refresh.completed`
  - Refresh task finished for the current date/timezone.

## Notifications
- `notifications.sync.deferred`
  - Push token sync postponed because the network is unavailable.
- `notifications.push.synced`
  - Push token registration is aligned with backend state.

## Security
- `security.mobile_attestation.startup_ready`
  - Startup attestation provider is available and ready.
- `security.mobile_attestation.startup_degraded`
  - Startup attestation degraded in non-strict mode.
- `security.mobile_attestation.provider_unavailable`
  - Provider unavailable during attestation proof resolution.
- `security.device_integrity.signal`
  - Device integrity signals captured during startup or foreground refresh.

## Network
- `network.payload_validation_failed`
  - Runtime contract validation failed and fallback parsing was used.

## Ownership Rules
- Bootstrap and navigation events live under `src/ui/app`.
- Notification lifecycle events live under `src/ui/app/providers/NotificationsRuntimeProvider.tsx`.
- Security events live under `src/data/security/*`.
- Background refresh events live under `src/data/background/backgroundRefresh.ts`.
