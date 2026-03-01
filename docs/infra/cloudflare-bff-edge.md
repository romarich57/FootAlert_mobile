# Cloudflare Edge Runbook for BFF

## Objective

Place Cloudflare in front of the BFF origin to offload cacheable GET traffic while preserving API behavior and health checks.

## 1. DNS and TLS

1. Create/verify `api.<domain>` DNS record pointing to BFF origin.
2. Set proxy mode to **Proxied** (orange cloud).
3. SSL/TLS mode: **Full (strict)**.
4. Enforce TLS 1.2+ and enable HSTS at zone level.

## 2. Edge Cache Rules

Apply in Cloudflare Cache Rules (ordered):

1. **Bypass health**
   - Condition: `http.request.uri.path eq "/health"`
   - Action: Bypass cache
2. **Bypass non-GET**
   - Condition: `http.request.method ne "GET"`
   - Action: Bypass cache
3. **Cache API GET with origin controls**
   - Condition: `http.request.uri.path starts_with "/v1/"`
   - Action: Eligible for cache
   - Cache key: path + full query string
   - Honor origin `Cache-Control` headers

## 3. Validation Checklist

Run smoke checks:

```bash
curl -I "https://api.<domain>/v1/matches?date=2026-02-21&timezone=Europe/Paris"
curl -I "https://api.<domain>/v1/matches?date=2026-02-21&timezone=Europe/Paris"
curl -I "https://api.<domain>/health"
curl -X POST -I "https://api.<domain>/v1/telemetry/events"
```

Expected:

- first cacheable GET: `CF-Cache-Status: MISS`
- second cacheable GET: `CF-Cache-Status: HIT` (or `REVALIDATED`)
- `/health`: no cached response
- POST endpoints: cache bypass

## 4. Observability

Track:

- `CF-Cache-Status` distribution (MISS/HIT/BYPASS/REVALIDATED),
- origin request volume before/after cutover,
- p95 latency at edge and origin.

Enable Cloudflare Logs (HTTP requests) and forward to your log sink.

## 5. Asset Proxy Phase (Worker)

Goal: front `media.api-sports.io` with `assets.<domain>`.

1. Deploy Worker on `assets.<domain>`.
2. Worker behavior:
   - accept GET only,
   - proxy upstream to `https://media.api-sports.io`,
   - preserve path/query,
   - set cache-friendly headers for static media.
3. Keep rewrite disabled by default in clients:
   - `ASSET_CDN_REWRITE_ENABLED=false`
   - `ASSET_CDN_BASE_URL=https://assets.<domain>`
4. Enable flag progressively per environment/cohort.

## 6. Rollback

1. Disable problematic cache rule (or move to bypass).
2. Keep DNS proxied but bypass `/v1/*` cache globally if needed.
3. For media migration incident, set `ASSET_CDN_REWRITE_ENABLED=false`.
