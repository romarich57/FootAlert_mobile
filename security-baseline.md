# Security Baseline Snapshot

Date: 2026-02-28  
Scope: `Mobile_Foot` mobile app + `footalert-bff`

## Initial Findings (Before Hardening)
1. Shared request-signing secret exposed in mobile configuration (`MOBILE_REQUEST_SIGNING_KEY`).
2. Sensitive BFF routes accepted only HMAC request headers (replay-protected but forgeable if key leaked).
3. No SSL public key pinning initialization for mobile network stack.
4. No runtime root/jailbreak/hook gating for sensitive mobile flows.
5. Minimal release hardening in native layers (anti-debug/signature checks absent).

## Baseline Threats
1. Forged sensitive requests after APK/IPA reverse engineering.
2. MITM interception risk on hostile networks when trust chain is manipulated.
3. Compromised runtime execution on rooted/jailbroken devices.

## Hardening Targets
1. Replace shared-key HMAC auth with attestation + short-lived bearer session token.
2. Enforce SPKI pinning with primary/backup pins.
3. Block sensitive operations on compromised runtime signals.
4. Add native anti-debug and signature validation checks for release builds.
