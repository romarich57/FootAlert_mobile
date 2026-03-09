# Managed Redis and PostgreSQL Runbook

## Goal

Retirer l'etat critique des VPS pour la cible `100K users` en externalisant Redis et PostgreSQL, tout en gardant une feuille de route explicite vers `1M`.

## 100K Posture

1. Redis managé unique pour:
   - cache distribué,
   - garde-fou quota upstream,
   - BullMQ.
2. PostgreSQL managé unique pour:
   - persistance notifications,
   - sauvegardes,
   - failover fournisseur,
   - pooler de connexions.
3. Pas de Redis Cluster ni de read replica PostgreSQL dans cette itération.

## Runtime Contracts

Variables à imposer dans tous les environnements API/worker:

1. `REDIS_URL`
2. `DATABASE_URL`
3. `UPSTREAM_GLOBAL_RPM_LIMIT`
4. `UPSTREAM_CIRCUIT_BREAKER_WINDOW_MS`

## Readiness Expectations

`/readiness` doit passer a `503` si l'une des dependances requises devient indisponible:

1. Redis requis si `CACHE_BACKEND=redis`
2. PostgreSQL requis si `NOTIFICATIONS_PERSISTENCE_BACKEND=postgres`
3. backend queue non initialise
4. garde-fou upstream non fonctionnel dans un contexte qui empeche de servir le trafic

## Managed Redis

### Role in 100K

1. cache distribue et stale fallback
2. bucket quota minute pour le budget API-Football
3. BullMQ pour les workers notifications

### Minimum provider features

1. persistence activee
2. failover fournisseur ou redondance de zone
3. TLS en transit
4. metrics CPU/memoire/exportables

### Trigger to move to Redis Cluster

Basculer vers Redis Cluster si l'un de ces seuils dure `15 min` en staging ou production:

1. `redis_used_memory_ratio >= 0.70`
2. `redis_cpu_ratio >= 0.65`
3. debit cumule cache + queue `>= 10 000 ops/min`
4. `notifications_queue_lag_ms` p95 depasse la cible alors que les workers sont deja au niveau prevu pour 100K

## Managed PostgreSQL

### Role in 100K

1. stockage notifications et deliveries
2. requetes de lecture BFF sensibles a la latence
3. sauvegardes et failover hors VPS

### Minimum provider features

1. sauvegardes automatiques et PITR
2. failover fournisseur
3. pooler de connexions
4. metrics CPU/IO/connections exportables

### Trigger to add a read replica

Ajouter une read replica si l'un de ces seuils dure `15 min`:

1. latence de lecture p95 `> 250 ms`
2. connexions actives `> 80%` de la capacite du pool
3. `postgres_cpu_ratio >= 0.70`
4. contention lecture affectant la cible p95 route critique `<= 1200 ms`

## Runbook Operations

### Planned maintenance

1. vider le trafic vers un seul noeud API si necessaire
2. verifier `/readiness` avant retour en rotation
3. verifier `notifications_queue_lag_ms` avant toute reduction de worker

### Incident posture

1. Redis down:
   - Cloudflare retire les noeuds `not ready`
   - aucun basculement manuel de cache local comme nouvelle source de verite en production
2. PostgreSQL down:
   - les noeuds dependent de `postgres` passent `not ready`
   - pas de fail-open silencieux sur la persistance notifications
