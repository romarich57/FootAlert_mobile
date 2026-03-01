# Multi-Platform Parity Matrix (Mobile / Web / Desktop)

## Scope v1 (read-only)

This matrix tracks the expected parity target for the first multi-platform rollout.

| Feature | iOS/Android (RN) | Web (Vite+React) | Desktop (Tauri 2) | Notes |
|---|---|---|---|---|
| Matches listing | ✅ | ✅ | ✅ | `/v1/matches` |
| Team details / fixtures / standings | ✅ | ✅ | ✅ | `/v1/teams/*` |
| Player details / trophies / matches | ✅ | ✅ | ✅ | `/v1/players/*` |
| Competitions list / standings / matches | ✅ | ✅ | ✅ | `/v1/competitions/*` |
| Follows trends | ✅ | ✅ | ✅ | `/v1/follows/trends/*` |
| Follows search | ✅ | ✅ | ✅ | `/v1/follows/search/*` |
| Push token registration | ✅ | 🚫 | 🚫 | mobile-only signed endpoint |
| Mobile telemetry endpoints | ✅ | 🚫 | 🚫 | mobile-only signed endpoint |

## Parity Baseline v2 (machine-readable)

- Journey contract: `docs/architecture/parity-journeys.v2.json`
- Platform route surfaces: `docs/architecture/platform-route-manifests.v1.json`
- OpenAPI endpoint scoping: `x-platform-scope` on every `/v1/*` path and `/health`.

Canonical journeys enforced in v2:

1. Matches list + match details
2. Team details + fixtures + standings
3. Player details + trophies + matches
4. Competition standings + matches
5. Follows search + trends

## Offline behavior

- All platforms: `networkMode: 'offlineFirst'` in query defaults.
- Mobile: AsyncStorage query persistence.
- Web: localStorage query persistence.
- Desktop: inherits web cache behavior (frontend shell).

## Runtime contract safeguards

- API contract source: `packages/api-contract/openapi/footalert.v1.yaml`.
- Generated types: `packages/api-contract/generated/types.ts`.
- Shared runtime validation and read services: `packages/app-core/src`.
- Platform-scope validator: `packages/api-contract/scripts/check-platform-scope.mjs`.

## Validation scenarios

1. Open web while offline with warm cache: last known data is rendered.
2. Restore network: queries refetch and UI updates.
3. Desktop shell uses the same web endpoints and payload shapes.
4. Signed technical endpoints reject unsigned requests (web/desktop).

## Quality goals

- Functional parity target: **>=95%** for scope v1 read flows.
- Blocking crash target: **0** in offline/reconnect scenarios.
- Contract drift target: **0** undocumented endpoint/query changes.
- Desktop parity policy: `tauri2-web-shell` must keep web route surface parity.
