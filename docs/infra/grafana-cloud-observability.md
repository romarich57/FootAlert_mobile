# Managed Observability Baseline

## Goal

Standardiser l'observabilite `100K-ready` sans pile ELK/Loki autohebergee sur VPS.

## Default Stack

1. logs JSON structures via Fastify/Pino
2. agrégation logs vers Loki managé ou équivalent Grafana Cloud
3. métriques Prometheus-compatibles scrapées sur `/metrics`
4. dashboards et alertes centralisés hors VPS

## Required Log Fields

Chaque requête critique doit exposer au minimum:

1. `requestId`
2. `route`
3. `cacheStatus`
4. `upstreamFamily`
5. `quotaState`
6. `queueLag`
7. `nodeRole`

## Metrics Collection Contract

1. `/metrics` n'est pas un endpoint public.
2. Le scrape doit venir du réseau d'exploitation uniquement.
3. Les nœuds PM2 gardent des logs locaux courts, mais la source de vérité opérationnelle est centralisée.

## Minimum Dashboards

1. p95 routes critiques
2. hit/miss/stale cache
3. consommation minute du quota API-Football
4. circuit breaker par famille upstream
5. `notifications_queue_lag_ms`
6. ratio d'échec delivery
7. saturation Redis et PostgreSQL

## Minimum Alerts

### API-Football budget

1. warning a `70%`
2. high a `85%`
3. critical a `95%`

### Read API

1. p95 `> 1200 ms` sur routes critiques

### Notifications

1. `notifications_queue_lag_ms` p95 `>= 60 000 ms`
2. ratio d'echec `>= 5%` sur 15 min

### Data services

1. Redis memoire/CPU au-dessus des seuils documentes
2. PostgreSQL CPU/connexions/latence au-dessus des seuils documentes

## Validation Before Production Enablement

1. dashboards valides en staging
2. alertes testees avec un faux incident controle
3. correlation d'une requete via `requestId` entre logs et métriques
