# Helm Chart `footalert-bff`

Chart minimal pour préparer un déploiement Kubernetes sans changer la cible de production actuelle.

## Ce que le chart déploie

1. un `Deployment` API avec `replicaCount=2`
2. un `Deployment` worker séparé avec `replicaCount=1`
3. un `Service` `ClusterIP` pour l'API
4. un `ConfigMap` pour les variables non sensibles
5. un `ServiceAccount`

## Probes

1. `livenessProbe` HTTP sur `/liveness`
2. `readinessProbe` HTTP sur `/readiness`

Le worker ne porte pas de probe HTTP car il n'expose pas d'endpoint réseau dans cette phase.

## Installation

```bash
helm upgrade --install footalert-bff ./deploy/helm/footalert-bff \
  --namespace footalert \
  --create-namespace \
  --set image.repository=ghcr.io/footalert/footalert-bff \
  --set image.tag=0.1.0 \
  --set secretName=footalert-bff-secrets
```

## Valeurs à surcharger

1. `image.repository`
2. `image.tag`
3. `secretName`
4. `globalEnv.APP_ENV`
5. `api.replicaCount`
6. `worker.replicaCount`

## Contrats attendus côté runtime

1. `/health` reste disponible pour compatibilité.
2. `/liveness` doit rester un check process simple.
3. `/readiness` doit refléter la disponibilité réelle Redis/PostgreSQL/queue/upstream guard.
4. `/metrics` doit être scrapable depuis le réseau d'exploitation uniquement.
