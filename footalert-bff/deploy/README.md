# FootAlert BFF Deployment Artifacts

Ce dossier contient les artefacts "Kubernetes-ready" pour la cible `100K users`, sans imposer Kubernetes comme runtime de production actuel.

## Contenu

1. `helm/footalert-bff/`
   - chart Helm minimal pour déployer `api` et `worker` séparément.
   - probes HTTP alignées sur `/liveness` et `/readiness` pour l'API.
2. `Dockerfile`
   - image unique réutilisable pour l'API et le worker.

## Build image

Le `Dockerfile` est prévu pour un build depuis `Mobile_Foot/footalert-bff` avec un contexte BuildKit additionnel pour `packages/app-core`.

```bash
cd Mobile_Foot/footalert-bff
DOCKER_BUILDKIT=1 docker build \
  --build-context app_core=../packages/app-core \
  -t ghcr.io/footalert/footalert-bff:0.1.0 .
```

## Runtime visé

1. Phase 100K:
   - production officielle sur `PM2 + VPS multi-node + Cloudflare LB`.
   - Redis et PostgreSQL managés, hors VPS.
2. Phase de préparation Kubernetes:
   - chart Helm prêt.
   - même image pour `api` et `worker`.
   - mêmes probes de santé qu'en PM2/Cloudflare.

## Pré-requis secrets

Le chart suppose un secret Kubernetes existant contenant au minimum:

1. `API_FOOTBALL_KEY`
2. `REDIS_URL`
3. `DATABASE_URL`
4. `MOBILE_SESSION_JWT_SECRET`
5. `PAGINATION_CURSOR_SECRET`
6. `NOTIFICATIONS_INGEST_TOKEN`
7. `PUSH_TOKEN_ENCRYPTION_KEY`
8. éventuels secrets Firebase si l'envoi push est activé
