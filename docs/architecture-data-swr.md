# Architecture des Couches de Données & Stale-While-Revalidate (SWR) — FootAlert

> Document technique exhaustif couvrant la communication entre l'app mobile React Native,
> le BFF Fastify, la base PostgreSQL distante (read-store), le cache SQLite local,
> et l'implémentation du pattern Stale-While-Revalidate à travers toute la stack.

---

## Table des matières

1. [Vue d'ensemble de l'architecture](#1-vue-densemble-de-larchitecture)
2. [Les 3 couches de cache (L1 / L2 / L3)](#2-les-3-couches-de-cache-l1--l2--l3)
3. [Couche L1 — Cache in-memory BFF](#3-couche-l1--cache-in-memory-bff)
4. [Couche L2 — Read-Store PostgreSQL (BFF)](#4-couche-l2--read-store-postgresql-bff)
5. [Couche L3 — Cache mobile (SQLite + React Query)](#5-couche-l3--cache-mobile-sqlite--react-query)
6. [Classes de fraîcheur et fréquences de refresh](#6-classes-de-fraîcheur-et-fréquences-de-refresh)
7. [Cycle de vie d'un match et impact sur le cache](#7-cycle-de-vie-dun-match-et-impact-sur-le-cache)
8. [Le pattern SWR en détail](#8-le-pattern-swr-en-détail)
9. [Flux complet : l'utilisateur clique sur "Barcelone"](#9-flux-complet--lutilisateur-clique-sur-barcelone)
10. [Prefetch et warm loading](#10-prefetch-et-warm-loading)
11. [Bootstrap et hydratation au cold start](#11-bootstrap-et-hydratation-au-cold-start)
12. [Sync middleware : React Query ↔ SQLite](#12-sync-middleware--react-query--sqlite)
13. [Persistance MMKV et déshydratation sélective](#13-persistance-mmkv-et-déshydratation-sélective)
14. [Worker BFF : refresh continu en arrière-plan](#14-worker-bff--refresh-continu-en-arrière-plan)
15. [Métadonnées de fraîcheur (`_meta`)](#15-métadonnées-de-fraîcheur-_meta)
16. [Mode offline et mutation queue](#16-mode-offline-et-mutation-queue)
17. [Récapitulatif des fichiers clés](#17-récapitulatif-des-fichiers-clés)
18. [Implémentation pas-à-pas du SWR mobile](#18-implémentation-pas-à-pas-du-swr-mobile)

---

## 1. Vue d'ensemble de l'architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        APP MOBILE                                │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────────────┐ │
│  │  SQLite  │←──│ React Query  │──→│    Écran UI (FlashList)  │ │
│  │  (L3a)   │──→│   (L3b)      │   │    placeholderData       │ │
│  └──────────┘   └──────┬───────┘   └──────────────────────────┘ │
│                        │ fetch réseau (si stale)                  │
└────────────────────────┼─────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BFF (Fastify 5)                          │
│  ┌──────────────┐   ┌────────────────┐   ┌──────────────────┐  │
│  │  Cache L1    │──→│  Read-Store L2 │──→│  API-Football    │  │
│  │  (mémoire/   │   │  (PostgreSQL)  │   │  (source)        │  │
│  │   Redis)     │   │                │   │                  │  │
│  └──────────────┘   └───────┬────────┘   └──────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────┴────────────────────────────────┐  │
│  │              Worker (boucle maintenance)                    │  │
│  │  Bootstrap warm │ Calendar scheduler │ Refresh queue │ GC  │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Principe fondamental** : l'`API_FOOTBALL_KEY` ne quitte JAMAIS le BFF. Le mobile ne contacte
jamais API-Football directement. Toute donnée transite par `BFF → Mobile`.

**Flux simplifié** :
1. Le mobile demande `/v1/teams/529/full?timezone=Europe/Paris`
2. Le BFF vérifie son cache L1 (mémoire), puis L2 (PostgreSQL)
3. Si les données sont fraîches → réponse instantanée
4. Si stale → retourne les données stale + refresh en arrière-plan
5. Si miss → appelle API-Football, persiste, et retourne
6. Le mobile écrit la réponse en SQLite et dans React Query

---

## 2. Les 3 couches de cache (L1 / L2 / L3)

| Couche | Emplacement | Technologie | Durée de vie typique | Rôle |
|--------|-------------|-------------|---------------------|------|
| **L1** | BFF (processus Node) | `MemoryCache` (ou Redis) | Secondes → minutes | Protection contre les appels API-Football répétés |
| **L2** | BFF (PostgreSQL) | Read-Store (snapshots) | Heures → jours | Source de vérité serveur, SWR, refresh par worker |
| **L3a** | Mobile (SQLite) | `entityStore` via op-sqlite | Heures → jours | Affichage instantané hors-ligne (lecture synchrone) |
| **L3b** | Mobile (React Query) | Cache mémoire + MMKV | Secondes → heures | SWR côté client, `staleTime`, `gcTime` |

**Hiérarchie de confiance** : API-Football > L2 (PostgreSQL) > L1 (mémoire) > L3a (SQLite) > L3b (React Query)

---

## 3. Couche L1 — Cache in-memory BFF

**Fichier** : `footalert-bff/src/lib/cache.ts`

### Fonctionnement

Le cache L1 est un cache LRU en mémoire avec une option Redis pour les déploiements multi-instances.

```typescript
// Deux fonctions principales :

// 1. Cache classique (cache-aside)
withCache<T>(key, ttlMs, producer, options)
// → Vérifie le cache frais → sinon appelle producer() → met en cache

// 2. Stale-While-Revalidate
withCacheStaleWhileRevalidate<T>(key, ttlMs, producer, options)
// → Vérifie le cache frais → vérifie le stale → retourne le stale
//   + lance un refresh en arrière-plan → sinon appelle producer()
```

### Configuration

```typescript
// Constantes par défaut
DEFAULT_CACHE_MAX_ENTRIES     = 1_000       // max entrées LRU
DEFAULT_CACHE_STALE_GRACE_MS  = 60_000      // 1min de grâce pour le stale
DEFAULT_CACHE_TTL_JITTER_PCT  = 15          // ±15% de jitter sur les TTL
DEFAULT_CACHE_LOCK_TTL_MS     = 3_000       // verrou Redis 3s
DEFAULT_CACHE_COALESCE_WAIT_MS = 750        // fenêtre de coalescence 750ms
```

### Mécanismes anti-stampede

1. **In-flight deduplication** : si un fetch est en cours pour une clé, les requêtes suivantes attendent la même promesse
2. **Redis distributed lock** : `SET key token PX ttl NX` — un seul processus fait le fetch
3. **Coalesce wait** : les autres processus attendent 750ms que le cache se remplisse avant de tenter eux-mêmes
4. **Stale fallback** : si API-Football retourne 429/5xx, le cache stale est retourné au lieu de propager l'erreur

```typescript
// Exemple concret dans une route BFF
const payload = await withCacheStaleWhileRevalidate<TeamFullPayload>(
  buildCanonicalCacheKey('team:full', { teamId, timezone }),
  TEAM_POLICY.freshMs,  // 6h
  () => fetchTeamFullPayload({ teamId, timezone, ... }),
);
```

### Clé de cache canonique

```typescript
// buildCanonicalCacheKey trie les paramètres alphabétiquement
buildCanonicalCacheKey('team:full', { teamId: '529', timezone: 'Europe/Paris' })
// → 'team:full:teamId=529&timezone=Europe%2FParis'

// Si la clé > 120 caractères, elle est hashée en SHA-256
// → 'sha256:a1b2c3d4...'
```

---

## 4. Couche L2 — Read-Store PostgreSQL (BFF)

**Fichiers** :
- `footalert-bff/src/lib/readStore/runtime.ts` — interface `ReadStore`
- `footalert-bff/src/lib/readStore/readThrough.ts` — logique SWR
- `footalert-bff/src/lib/readStore/policies.ts` — politiques de fraîcheur

### Le concept de "Snapshot"

Chaque entité (team_full, player_full, competition_full, match_full) est stockée dans PostgreSQL
sous forme de **snapshot** avec des fenêtres de fraîcheur :

```
    generatedAt              staleAt                   expiresAt
        │                      │                          │
        ▼                      ▼                          ▼
   ─────┤══════════════════════┤──────────────────────────┤─────────→ temps
        │      FRESH           │        STALE             │  EXPIRED
        │   (retour immédiat)  │  (retour + refresh bg)   │  (re-fetch)
```

### Interface ReadStore

```typescript
interface ReadStore {
  // Lecture
  getEntitySnapshot<T>(kind, id, scope): Promise<ReadStoreSnapshot<T>>
  getBootstrapSnapshot<T>(scope): Promise<ReadStoreSnapshot<T>>
  getMatchLiveOverlay<T>(matchId): Promise<ReadStoreSnapshot<T>>

  // Écriture
  upsertEntitySnapshot(params): Promise<void>
  upsertBootstrapSnapshot(params): Promise<void>
  upsertMatchLiveOverlay(params): Promise<void>

  // Queue de refresh
  enqueueRefresh(params): Promise<void>    // ajoute un job de refresh
  claimRefreshJobs(params): Promise<Job[]> // le worker réclame des jobs
  completeRefreshJob(params): Promise<void>
  failRefreshJob(params): Promise<void>
  countRefreshBacklog(): Promise<BacklogCounts>

  // GC
  deleteExpiredSnapshots(now): Promise<number>
  deleteStaleHeartbeats(staleBefore): Promise<number>
}
```

### ReadStoreSnapshot — Les 4 états possibles

```typescript
type ReadStoreSnapshot<T> =
  | { status: 'miss' }                           // pas de données
  | { status: 'fresh'; payload: T; ... }          // données fraîches
  | { status: 'stale'; payload: T; ... }          // données périmées mais utilisables
  | { status: 'expired'; payload: T; ... }        // données très vieilles
```

### Read-Through : la logique SWR serveur

```typescript
// readThroughSnapshot() — le cœur du SWR côté BFF
async function readThroughSnapshot<T>(input) {
  // 1. Lire le snapshot existant
  const snapshot = await input.getSnapshot();

  // 2. FRESH → retour instantané, pas de réseau
  if (snapshot.status === 'fresh') {
    return { payload: snapshot.payload, freshness: 'fresh' };
  }

  // 3. STALE ou EXPIRED → retourner les données stale
  //    + lancer un refresh en arrière-plan (non-bloquant)
  if (snapshot.status === 'stale' || snapshot.status === 'expired') {
    if (!inFlightRefreshes.has(cacheKey)) {
      // Refresh en arrière-plan — ne bloque PAS la réponse
      const bgRefresh = async () => {
        const freshPayload = await input.fetchFresh();
        const window = buildSnapshotWindow({
          staleAfterMs: input.staleAfterMs,
          expiresAfterMs: input.expiresAfterMs,
        });
        await input.upsertSnapshot({ payload: freshPayload, ...window });
      };
      registerInFlightRefresh(cacheKey, bgRefresh());
    }
    // Enqueue aussi un job pour le worker (persistant)
    if (input.queue) {
      input.queue.store.enqueueRefresh({ ... });
    }
    return { payload: staleSnapshot.payload, freshness: 'stale' };
  }

  // 4. MISS → fetch frais, persister, retourner
  const payload = await input.fetchFresh();
  await input.upsertSnapshot({ payload, ...buildSnapshotWindow(...) });
  return { payload, freshness: 'miss' };
}
```

### Scope Key — identification unique d'un snapshot

Chaque snapshot est identifié par un triplet `(entityKind, entityId, scopeKey)`.
Le `scopeKey` encode les paramètres de contexte de manière canonique :

```typescript
buildReadStoreScopeKey({ timezone: 'Europe/Paris', season: '2025' })
// → 'season=2025&timezone=Europe%2FParis'
// Les clés sont triées alphabétiquement pour garantir l'unicité
```

---

## 5. Couche L3 — Cache mobile (SQLite + React Query)

### L3a — SQLite (op-sqlite)

**Fichiers** :
- `src/data/db/database.ts` — singleton DB
- `src/data/db/entityStore.ts` — CRUD synchrone
- `src/data/db/localFirstAdapter.ts` — logique local-first
- `src/data/db/useLocalFirstQuery.ts` — hook React Query intégré

#### Base de données locale

```typescript
// database.ts — ouverture avec pragmas d'optimisation
const db = open({ name: 'footalert_local.sqlite' });
db.executeSync('PRAGMA journal_mode = WAL');     // lectures non-bloquantes
db.executeSync('PRAGMA synchronous = NORMAL');    // bon compromis perf/durabilité
db.executeSync('PRAGMA cache_size = -2000');      // 2MB de cache mémoire
db.executeSync('PRAGMA page_size = 4096');        // pages 4KB
db.executeSync('PRAGMA foreign_keys = ON');

// Migrations automatiques au premier appel getDatabase()
runMigrations(db, allMigrations);
```

#### Entity Store — CRUD synchrone

```typescript
// entityStore.ts — lectures synchrones (< 5ms)

// Écriture d'une entité (INSERT OR REPLACE)
upsertEntity<T>({ entityType: 'team', entityId: '529', data: teamPayload });

// Lecture synchrone (pour placeholderData)
const cached = getEntityById<T>('team', '529');
// → { data: T, updatedAt: number, etag: string | null } | null

// Batch write (transactionnel)
upsertEntities('team', [
  { entityId: '529', data: barcaData },
  { entityId: '541', data: realData },
]);

// Query avec tri par date de mise à jour
const recent = queryEntityRows<T>({
  entityType: 'team',
  limit: 100,
  orderByUpdatedAt: 'desc',
});
```

#### Types d'entité

```typescript
type EntityType = 'team' | 'player' | 'competition' | 'match';
```

#### ID composites pour les entités multi-scope

```typescript
// fullEntityIds.ts — construction d'ID uniques

buildTeamFullEntityId('529')           // → '529'
buildPlayerFullEntityId('276', 2025)   // → '276:2025'
buildCompetitionFullEntityId('39', 2025) // → '39:2025'
buildCompetitionFullEntityId('39', null)  // → '39:base'
buildMatchFullEntityId('1234567')      // → '1234567'
```

### L3b — React Query (TanStack Query)

**Fichiers** :
- `src/data/query/queryOptions.ts` — profils de fraîcheur
- `src/data/query/queryCachePolicyMatrix.ts` — matrice complète
- `src/ui/shared/query/queryPersistence.ts` — persistance MMKV
- `src/ui/app/providers/QueryProvider.tsx` — provider principal

#### Configuration globale du QueryClient

```typescript
// queryOptions.ts
const defaultQueryOptions = {
  retry: 2,
  staleTime: 30_000,           // 30s par défaut
  gcTime: 30 * 60_000,         // 30min garbage collection
  refetchOnReconnect: true,     // re-fetch à la reconnexion
  refetchOnMount: false,        // PAS de re-fetch au mount si cache valide
  refetchOnWindowFocus: false,  // PAS de re-fetch au retour d'app
  networkMode: 'offlineFirst',  // tenter le cache d'abord
};
```

#### Profils de fraîcheur

```typescript
// 4 classes de fraîcheur avec des timings différents
const QUERY_FRESHNESS_PROFILES = {
  live: {        // données temps réel (score en direct)
    staleTime: 15_000,       // 15 secondes
    retry: 2,
    gcTime: 5 * 60_000,     // 5 minutes
  },
  interactive: { // données interactives (liste de matchs)
    staleTime: 60_000,       // 1 minute
    retry: 2,
    gcTime: 30 * 60_000,    // 30 minutes
  },
  stable: {      // données stables (classement, effectif)
    staleTime: 60 * 60_000,  // 1 heure
    retry: 1,
    gcTime: 60 * 60_000,    // 1 heure
  },
  static: {      // données immuables (palmarès, carrière)
    staleTime: Infinity,      // jamais stale
    retry: 1,
    gcTime: 7 * 24 * 60 * 60_000, // 7 jours
  },
};
```

#### Matrice de politique complète

```typescript
// queryCachePolicyMatrix.ts — chaque feature a sa politique

teams: {
  full:       { freshness: 'stable', overrides: { staleTime: 6h, gcTime: 24h } },
  details:    { freshness: 'static' },              // nom, logo → Infinity
  leagues:    { freshness: 'static' },              // ligues → Infinity
  overview:   { freshness: 'stable', overrides: { staleTime: 30min } },
  matches:    { freshness: 'interactive', overrides: { staleTime: 5min } },
  standings:  { freshness: 'stable', overrides: { staleTime: 30min } },
  transfers:  { freshness: 'stable', overrides: { staleTime: 24h } },
  squad:      { freshness: 'stable', overrides: { staleTime: 12h } },
},

players: {
  full:       { freshness: 'stable', overrides: { staleTime: 12h, gcTime: 36h } },
  details:    { freshness: 'static' },
  career:     { freshness: 'static' },
  trophies:   { freshness: 'static' },
  matches:    { freshness: 'interactive', overrides: { staleTime: 5min } },
},

competitions: {
  full:       { freshness: 'stable', overrides: { staleTime: 4h, gcTime: 24h } },
  catalog:    { freshness: 'static' },
  fixtures:   { freshness: 'interactive', overrides: { staleTime: 5min } },
  standings:  { freshness: 'stable', overrides: { staleTime: 30min } },
},

matches: {
  full:       { freshness: 'interactive', overrides: { staleTime: 1min, gcTime: 30min } },
  events:     { freshness: 'live' },                 // 15s
  statistics: { freshness: 'live' },                 // 15s
  lineups:    { freshness: 'interactive', overrides: { staleTime: 1min } },
  headToHead: { freshness: 'stable', overrides: { staleTime: 24h } },
},
```

---

## 6. Classes de fraîcheur et fréquences de refresh

### Vue synoptique des TTL sur les 3 couches

| Entité | L1 BFF (mémoire) | L2 BFF (PostgreSQL) | L3 Mobile (SQLite+RQ) |
|--------|-------------------|---------------------|----------------------|
| **team_full** | `TEAM_POLICY.freshMs` = 6h | fresh: 6h / stale: 24h | staleTime: 6h / maxAgeMs: 6h |
| **player_full** | `PLAYER_POLICY.freshMs` = 12h | fresh: 12h / stale: 36h | staleTime: 12h / maxAgeMs: 12h |
| **competition_full** | `COMPETITION_POLICY.freshMs` = 4h | fresh: 4h / stale: 24h | staleTime: 4h / maxAgeMs: 4h |
| **match_full** (par défaut) | `MATCH_DEFAULT_POLICY.freshMs` = 5min | fresh: 5min / stale: 30min | staleTime: 1min / maxAgeMs: 5min |
| **match_full** (live) | `MATCH_LIVE_POLICY.freshMs` = 2min | fresh: 2min / stale: 10min | staleTime: 15s (events) |
| **match_full** (terminé) | `MATCH_FINISHED_POLICY.freshMs` = 7j | fresh: 7j / stale: 30j | staleTime: 1min |
| **bootstrap** | — | fresh: 5min / stale: 30min | — |

### Politiques BFF (policies.ts)

```typescript
// Politiques par classe de fraîcheur
STATIC_LIFETIME_POLICY   = { freshMs: 30j,  staleMs: 90j,  refreshIntervalMs: 7j }
POST_MATCH_POLICY        = { freshMs: 6h,   staleMs: 24h,  refreshIntervalMs: 6h }
WEEKLY_POLICY            = { freshMs: 24h,  staleMs: 7j,   refreshIntervalMs: 24h }

// Politiques par entité (payload complet)
TEAM_POLICY              = { freshMs: 6h,   staleMs: 24h,  refreshIntervalMs: 6h }
PLAYER_POLICY            = { freshMs: 12h,  staleMs: 36h,  refreshIntervalMs: 12h }
COMPETITION_POLICY       = { freshMs: 4h,   staleMs: 24h,  refreshIntervalMs: 4h }
MATCH_DEFAULT_POLICY     = { freshMs: 5min, staleMs: 30min, refreshIntervalMs: 5min }
MATCH_LIVE_POLICY        = { freshMs: 2min, staleMs: 10min, refreshIntervalMs: 2min }
MATCH_FINISHED_POLICY    = { freshMs: 7j,   staleMs: 30j,  refreshIntervalMs: 7j }
MATCH_LIVE_OVERLAY_POLICY = { freshMs: 30s, staleMs: 2min, refreshIntervalMs: 30s }
```

### Classification des données par volatilité

```
┌──────────────────────────────────────────────────────────────────┐
│                    STATIC (staleTime: Infinity)                   │
│  Nom d'équipe, logo, pays, palmarès, carrière joueur,            │
│  catalogue compétitions, saisons disponibles                      │
│  → Ne change jamais en cours de saison                           │
├──────────────────────────────────────────────────────────────────┤
│                    WEEKLY (staleTime: 24h)                        │
│  Transferts, TOTW (Team of the Week), prédictions                │
│  → Change au maximum une fois par semaine                        │
├──────────────────────────────────────────────────────────────────┤
│                    POST_MATCH (staleTime: 6h)                    │
│  Classement, effectif, forme récente, stats saison,              │
│  overview équipe, overview joueur, stats avancées                │
│  → Change après chaque journée de championnat                    │
├──────────────────────────────────────────────────────────────────┤
│                    LIVE (staleTime: 15s)                          │
│  Score en direct, événements (buts, cartons), statistiques       │
│  temps réel, compositions confirmées                             │
│  → Change à chaque action de jeu                                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. Cycle de vie d'un match et impact sur le cache

**Fichier** : `footalert-bff/src/worker/match-calendar-scheduler.ts`

Le worker BFF surveille les matchs du jour et adapte sa stratégie de refresh selon l'état du match :

```
          ┌─────────────┐    ┌──────────┐    ┌────────┐    ┌───────────┐    ┌─────────┐
temps ──→ │  PRE_MATCH  │───→│ IMMINENT │───→│  LIVE  │───→│ POST_MATCH│───→│ SETTLED │
          │   (>1h)     │    │  (<1h)   │    │        │    │  (<2h)    │    │  (>2h)  │
          └─────────────┘    └──────────┘    └────────┘    └───────────┘    └─────────┘
           priorité: 150      priorité: 200   priorité: 250  priorité: 100   pas de
           warm: match_full   warm: match +   refresh: max   refresh: match  refresh
                              team_full×2     fréquence      + team×2
```

### Détail des états

```typescript
// match-calendar-scheduler.ts

const PRIORITY_LIVE = 250;        // Plus haute priorité — traité en premier
const PRIORITY_IMMINENT = 200;    // Warm proactif avant le coup d'envoi
const PRIORITY_PRE_MATCH = 150;   // Warm normal
const PRIORITY_POST_MATCH = 100;  // Refresh des stats après le match

// Statuts API-Football → état lifecycle
LIVE_SHORT_STATUSES     = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'SUSP', 'LIVE']
FINISHED_SHORT_STATUSES = ['FT', 'AET', 'PEN']
```

### Actions par état

| État | Actions du worker | Politique de cache |
|------|-------------------|--------------------|
| **pre_match** (>1h) | Enqueue match_full avec notBefore = kickoff - 1h | MATCH_DEFAULT_POLICY (5min) |
| **imminent** (<1h) | Enqueue match_full immédiat + warm team_full pour les 2 équipes | MATCH_DEFAULT_POLICY (5min) |
| **live** | Enqueue match_full immédiat, priorité max | MATCH_LIVE_POLICY (2min) |
| **post_match** (<2h) | Enqueue match_full + team_full pour les 2 équipes | MATCH_DEFAULT_POLICY (5min) |
| **settled** (>2h) | Aucune action — données figées | MATCH_FINISHED_POLICY (7j) |

### Résolution dynamique de la politique

```typescript
// policies.ts
function resolveMatchSnapshotPolicy(lifecycleState: string): SnapshotPolicy {
  if (lifecycleState === 'live')     return MATCH_LIVE_POLICY;     // 2min
  if (lifecycleState === 'finished') return MATCH_FINISHED_POLICY; // 7j
  return MATCH_DEFAULT_POLICY;                                     // 5min
}
```

---

## 8. Le pattern SWR en détail

### SWR = Stale-While-Revalidate

Le SWR est un pattern de cache qui dit : **"Retourne immédiatement les données en cache (même si elles sont périmées), puis rafraîchis en arrière-plan"**.

L'utilisateur voit les données **instantanément** (0ms de latence perçue), et l'interface se met à jour silencieusement quand les données fraîches arrivent.

### SWR sur les 3 couches

#### Couche L1 — `withCacheStaleWhileRevalidate()` (BFF mémoire)

```typescript
// cache.ts — SWR en mémoire ou Redis
async function withCacheStaleWhileRevalidate<T>(key, ttlMs, producer) {
  // 1. Cache frais → retour direct
  const fresh = await getFreshCachedValue<T>(key);
  if (fresh !== null) return fresh;

  // 2. Cache stale → retour + refresh non-bloquant en arrière-plan
  const stale = await getStaleCachedValue<T>(key);
  if (stale !== null) {
    triggerBackgroundCacheRefresh(key, ttlMs, producer);  // fire-and-forget
    return stale;  // ← l'utilisateur reçoit ça immédiatement
  }

  // 3. Pas de cache → fetch synchrone (bloquant)
  return createCacheFillPromise(key, ttlMs, producer);
}
```

#### Couche L2 — `readThroughSnapshot()` (BFF PostgreSQL)

```typescript
// readThrough.ts — SWR sur les snapshots PostgreSQL
async function readThroughSnapshot<T>(input) {
  const snapshot = await input.getSnapshot();

  if (snapshot.status === 'fresh')
    return { payload: snapshot.payload, freshness: 'fresh' };

  if (snapshot.status === 'stale' || snapshot.status === 'expired') {
    // Refresh en arrière-plan (fire-and-forget + dedup)
    if (!inFlightSnapshotRefreshes.has(cacheKey)) {
      registerInFlightRefresh(cacheKey, backgroundRefresh());
    }
    // + enqueue un job worker pour garantir le refresh
    input.queue?.store.enqueueRefresh({ ... });

    return { payload: stalePayload, freshness: 'stale' };
  }

  // Miss → fetch frais bloquant
  const payload = await input.fetchFresh();
  await input.upsertSnapshot({ payload, ...buildSnapshotWindow(...) });
  return { payload, freshness: 'miss' };
}
```

#### Couche L3 — `createLocalFirstQueryFn()` (Mobile SQLite)

```typescript
// localFirstAdapter.ts — SWR côté mobile
async function queryFn({ signal }) {
  // 1. Lecture synchrone SQLite (< 5ms)
  const cached = getEntityById<T>(entityType, entityId);
  const lastSync = getLastSyncTimestamp(entityType, entityId);
  const cacheAgeMs = lastSync ? Date.now() - lastSync : null;
  const fresh = cacheAgeMs !== null && cacheAgeMs < maxAgeMs;

  // 2. Cache frais → retour immédiat, PAS de réseau
  if (cached && fresh) return cached.data;

  // 3. Offline → retour du cache même stale
  if (!online && cached) return cached.data;
  if (!online && !cached) throw new LocalFirstOfflineError(...);

  // 4. Online + stale → fetch réseau
  //    React Query affiche le placeholderData pendant ce temps
  try {
    const networkData = await fetchFn(signal);
    upsertEntity({ entityType, entityId, data: networkData });
    setLastSyncTimestamp(entityType, entityId);
    return networkData;
  } catch (error) {
    // 5. Erreur réseau + cache stale → fallback gracieux
    if (cached) return cached.data;
    throw error;
  }
}
```

#### Couche L3 — `useLocalFirstQuery()` (React Query + SQLite)

```typescript
// useLocalFirstQuery.ts — le hook qui lie tout
function useLocalFirstQuery<T>(params) {
  // Lecture synchrone SQLite pour le placeholderData
  const localCache = useMemo(() => {
    if (!enabled || !entityId) return null;
    return getEntityById<T>(entityType, entityId);
  }, [enabled, entityType, entityId]);

  const query = useQuery<T, Error>({
    queryKey,
    queryFn: ({ signal }) => createLocalFirstQueryFn<T>({
      entityType, entityId, maxAgeMs, fetchFn,
    })({ signal }),
    enabled: enabled && Boolean(entityId),
    // ↓↓↓ C'est ici que la magie du SWR opère côté mobile ↓↓↓
    placeholderData: (prev) => prev ?? localCache?.data ?? undefined,
    // L'utilisateur voit les données SQLite INSTANTANÉMENT
    // pendant que le queryFn local-first fait son travail
    staleTime: queryOptions.staleTime,   // ex: 6h pour team_full
    gcTime: queryOptions.gcTime,         // ex: 24h pour team_full
  });

  return {
    ...query,
    isFromLocalCache: query.isPlaceholderData && localCache !== null,
    localUpdatedAt: localCache?.updatedAt ?? null,
  };
}
```

---

## 9. Flux complet : l'utilisateur clique sur "Barcelone"

Voici le parcours complet d'une requête `team_full` pour l'équipe du FC Barcelone (teamId=529) :

### Chronologie détaillée

```
┌─────────────────────────────────────────────────────────────────────────┐
│ T=0ms  │ L'utilisateur appuie sur "Barcelone"                          │
│        │ → Navigation vers TeamDetailsScreen                           │
│        │ → useTeamLocalFirst({ teamId: '529', timezone: 'Europe/Paris'})│
├────────┼───────────────────────────────────────────────────────────────┤
│ T=1ms  │ useLocalFirstQuery se monte                                   │
│        │ → useMemo : getEntityById('team', '529')                      │
│        │ → SQLite lit l'entité en 2-4ms (synchrone via op-sqlite)      │
│        │ → localCache = { data: {...}, updatedAt: 1741700000000 }      │
├────────┼───────────────────────────────────────────────────────────────┤
│ T=3ms  │ useQuery se monte avec placeholderData = localCache.data      │
│        │ → React rend l'écran IMMÉDIATEMENT avec les données SQLite    │
│        │ → isPlaceholderData = true, isFromLocalCache = true           │
│        │ → L'utilisateur VOIT le classement, l'effectif, les stats    │
├────────┼───────────────────────────────────────────────────────────────┤
│ T=5ms  │ React Query lance le queryFn (createLocalFirstQueryFn)        │
│        │ → Lit SQLite à nouveau : cached existe                        │
│        │ → lastSync = il y a 3h (< maxAgeMs de 6h)                    │
│        │ → FRESH → retourne cached.data directement                    │
│        │ → PAS de réseau déclenché !                                   │
│        │ → isPlaceholderData = false (les données "vraies" = même data)│
├────────┼───────────────────────────────────────────────────────────────┤
│ T=7ms  │ ✅ Affichage final stable — 0 appel réseau                   │
└────────┴───────────────────────────────────────────────────────────────┘
```

### Si le cache SQLite est stale (dernière sync > 6h)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ T=0ms  │ L'utilisateur appuie sur "Barcelone"                          │
├────────┼───────────────────────────────────────────────────────────────┤
│ T=3ms  │ placeholderData = données SQLite (vieilles de 8h)             │
│        │ → Affichage INSTANTANÉ du classement d'il y a 8h             │
│        │ → Pas de spinner, pas de skeleton !                           │
├────────┼───────────────────────────────────────────────────────────────┤
│ T=5ms  │ queryFn démarre :                                             │
│        │ → lastSync = 8h (> maxAgeMs de 6h) → STALE                   │
│        │ → online = true → fetch réseau                                │
│        │ → fetchTeamFull({ teamId: '529', timezone }) part             │
├────────┼───────────────────────────────────────────────────────────────┤
│        │ ┌─── CÔTÉ BFF ─────────────────────────────────────────────┐ │
│ T=10ms │ │ Requête GET /v1/teams/529/full?timezone=Europe/Paris      │ │
│        │ │ 1. L1 withCache → getFreshCachedValue('team:full:529')    │ │
│        │ │    → Cache L1 stale (>6h) → fallback getStaleCachedValue  │ │
│        │ │    → triggerBackgroundCacheRefresh() (fire-and-forget)     │ │
│        │ │    → RETOURNE les données stale L1 immédiatement          │ │
│        │ │                                                            │ │
│        │ │ OU si L1 miss :                                           │ │
│        │ │ 2. L2 readThroughSnapshot('team_full', '529', scopeKey)   │ │
│        │ │    → PostgreSQL : snapshot.status = 'stale'                │ │
│        │ │    → Lance refresh background vers API-Football           │ │
│        │ │    → enqueueRefresh() pour le worker                      │ │
│        │ │    → RETOURNE payload stale immédiatement                 │ │
│        │ └──────────────────────────────────────────────────────────┘ │
│ T=50ms │ Réponse BFF reçue (données stale mais valides)              │
├────────┼───────────────────────────────────────────────────────────────┤
│ T=52ms │ Mobile reçoit la réponse :                                   │
│        │ → upsertEntity({ entityType: 'team', entityId: '529', ... }) │
│        │ → setLastSyncTimestamp('team', '529')                        │
│        │ → React Query met à jour le cache                            │
│        │ → isPlaceholderData = false                                  │
│        │ → SI les données ont changé : l'UI se re-rend en douceur    │
│        │   (React diffing → seuls les éléments modifiés bougent)     │
├────────┼───────────────────────────────────────────────────────────────┤
│ T=55ms │ ✅ Affichage mis à jour — transition invisible pour l'user  │
├────────┼───────────────────────────────────────────────────────────────┤
│        │ ┌─── EN ARRIÈRE-PLAN (BFF) ────────────────────────────────┐│
│ T=2s   │ │ Le worker traite le job enqueueRefresh :                  ││
│        │ │ → Appelle API-Football /teams, /standings, /fixtures...   ││
│        │ │ → Génère un nouveau snapshot team_full frais               ││
│        │ │ → upsertEntitySnapshot() avec generatedAt = maintenant    ││
│        │ │ → staleAt = maintenant + 6h                               ││
│        │ │ → La prochaine requête aura un snapshot FRESH             ││
│        │ └──────────────────────────────────────────────────────────┘│
└────────┴───────────────────────────────────────────────────────────────┘
```

### Si pas de cache du tout (premier accès)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ T=0ms  │ L'utilisateur appuie sur "Barcelone" (première fois)          │
├────────┼───────────────────────────────────────────────────────────────┤
│ T=3ms  │ SQLite : getEntityById('team', '529') → null                  │
│        │ placeholderData = undefined                                   │
│        │ → Affichage du SKELETON (TeamDetailsSkeleton)                 │
├────────┼───────────────────────────────────────────────────────────────┤
│ T=5ms  │ queryFn démarre → pas de cache SQLite → fetch réseau         │
│        │ → fetchTeamFull() vers le BFF                                 │
├────────┼───────────────────────────────────────────────────────────────┤
│ T=500ms│ BFF répond (après L1 miss → L2 miss → API-Football)          │
│        │ → Mobile écrit en SQLite + React Query                       │
│        │ → Skeleton → données complètes (transition en ~500ms)        │
├────────┼───────────────────────────────────────────────────────────────┤
│ T=510ms│ ✅ Affichage final — les prochaines fois seront instantanées │
└────────┴───────────────────────────────────────────────────────────────┘
```

---

## 10. Prefetch et warm loading

**Fichier** : `src/data/bootstrap/bootstrapHydration.ts`

### Prefetch proactif au boot

Après le chargement du bootstrap, le mobile pré-charge les entités "chaudes" identifiées
par le BFF (équipes suivies, matchs du jour, compétitions favorites).

```typescript
// bootstrapHydration.ts
const WARM_PREFETCH_MAX = 30;         // max 30 entités
const WARM_PREFETCH_CONCURRENCY = 3;  // 3 en parallèle

// staleTime alignés sur les BFF policies (Sprint 2 → Sprint 6)
const PREFETCH_STALE_TIME = {
  team: 6 * 60 * 60_000,        // 6h — TEAM_POLICY
  player: 12 * 60 * 60_000,     // 12h — PLAYER_POLICY
  competition: 4 * 60 * 60_000, // 4h — COMPETITION_POLICY
  match: 60_000,                  // 1min — MATCH_DEFAULT_POLICY
};
```

### Comment fonctionne le prefetch

```typescript
function prefetchWarmEntityRefs(input) {
  const refsToWarm = refs.slice(0, WARM_PREFETCH_MAX);  // max 30

  // Exécution APRÈS les animations (ne bloque pas le rendu)
  InteractionManager.runAfterInteractions(() => {
    const processBatch = async (batch) => {
      await Promise.allSettled(batch.map(async ref => {
        if (signal?.aborted) return;

        switch (ref.kind) {
          case 'team': {
            const key = queryKeys.teams.full(ref.id, timezone);
            // Skip si déjà en cache
            if (queryClient.getQueryData(key)) { skipped++; return; }
            // Prefetch avec le bon staleTime
            await queryClient.prefetchQuery({
              queryKey: key,
              queryFn: () => fetchTeamFull({ teamId: ref.id, timezone }, signal),
              staleTime: PREFETCH_STALE_TIME.team,  // 6h
            });
            break;
          }
          // ... player, competition, match
        }
      }));
    };

    // Traitement par lots de 3
    for (let i = 0; i < refsToWarm.length; i += 3) {
      const batch = refsToWarm.slice(i, i + 3);
      await processBatch(batch);
    }
  });
}
```

### Différence fetch vs prefetch

| | **fetch** (queryFn) | **prefetch** (prefetchQuery) |
|---|---|---|
| **Quand** | Au mount du composant | Au boot de l'app, en idle |
| **Bloquant** | Oui (affiche skeleton en attendant) | Non (fire-and-forget) |
| **Déclenché par** | `useQuery` / `useLocalFirstQuery` | `prefetchWarmEntityRefs()` |
| **staleTime** | Via `featureQueryOptions` | Via `PREFETCH_STALE_TIME` |
| **Résultat** | Affiché immédiatement | Pré-remplit le cache pour plus tard |
| **Réseau** | Seulement si cache stale/miss | Seulement si pas déjà en cache |

---

## 11. Bootstrap et hydratation au cold start

**Fichiers** :
- `src/data/bootstrap/bootstrapHydration.ts`
- `src/data/db/hydrationBridge.ts`
- `src/ui/app/providers/QueryProvider.tsx`

### Séquence de démarrage complète

```
┌─ App Launch ─────────────────────────────────────────────────────────┐
│                                                                       │
│  1. QueryProvider monte                                               │
│     ├── registerOnlineManagerIfNeeded() — NetInfo bridge              │
│     └── shouldBootstrapSqlite ? → bootstrapSqlite()                   │
│                                                                       │
│  2. bootstrapSqlite()                                                 │
│     ├── await getDatabase()                                           │
│     │   ├── open('footalert_local.sqlite')                            │
│     │   ├── applyPragmas(WAL, NORMAL, 2MB cache, 4KB pages)          │
│     │   └── runMigrations(allMigrations) — automatique                │
│     │                                                                 │
│     ├── runGarbageCollection()                                        │
│     │   ├── deleteStaleEntities — garde max N par type                │
│     │   ├── deleteEntitiesOlderThan — supprime > 7j                   │
│     │   ├── cleanupMatchesByDate — supprime > 3j                      │
│     │   └── VACUUM si DB > 50MB                                       │
│     │                                                                 │
│     ├── hydrateQueryClientFromSqlite(client, mappings)                │
│     │   ├── Pour chaque type (team, player, competition, match) :    │
│     │   │   ├── Lire les entités prioritaires (follows)               │
│     │   │   ├── Lire les entités récentes (ORDER BY updated_at DESC)  │
│     │   │   ├── Jusqu'à HYDRATION_LIMITS[type] entités               │
│     │   │   └── queryClient.setQueryData(queryKey, data, {updatedAt}) │
│     │   └── Retourne { hydratedCounts, durationMs }                   │
│     │                                                                 │
│     ├── setupQueryCacheSyncMiddleware(queryCache)                     │
│     │   └── S'abonne aux événements 'updated'+'success'              │
│     │       → Écrit automatiquement en SQLite                         │
│     │                                                                 │
│     ├── registerMutationExecutor('follow_event', handler)             │
│     │                                                                 │
│     └── drainMutationQueue() — traite les mutations offline en attente│
│                                                                       │
│  3. isSqliteReady = true → les children se rendent                    │
│                                                                       │
│  4. PersistQueryClientProvider restaure le cache MMKV                 │
│     ├── Désérialise le blob depuis MMKV                               │
│     ├── shouldDehydrateQuery filtre les queries SQLite-canonical       │
│     └── maxAge: 24h, buster: 'v6'                                    │
│                                                                       │
│  5. L'app est prête — l'utilisateur voit ses données instantanément  │
└───────────────────────────────────────────────────────────────────────┘
```

### Limites d'hydratation

```typescript
// hydrationBridge.ts
const HYDRATION_LIMITS = {
  team: 100,        // max 100 équipes hydratées au boot
  player: 100,      // max 100 joueurs
  competition: 50,  // max 50 compétitions
  match: 200,       // max 200 matchs
};
```

### Priorité d'hydratation

```typescript
// Les entités suivies sont hydratées EN PREMIER
const priorityIds = mapping.priorityEntityIds?.() ?? [];
// Typiquement : followedTeamIds, followedPlayerIds

// Puis les entités les plus récentes (most recently updated)
const recentEntities = queryEntityRows({
  entityType, limit, orderByUpdatedAt: 'desc',
});
```

---

## 12. Sync middleware : React Query ↔ SQLite

**Fichier** : `src/data/db/queryCacheSyncMiddleware.ts`

Le middleware écoute **toutes les mises à jour réussies** du QueryCache et écrit
automatiquement les résultats dans SQLite :

```typescript
// queryCacheSyncMiddleware.ts
function setupQueryCacheSyncMiddleware(queryCache) {
  return queryCache.subscribe(event => {
    // Uniquement les mises à jour réussies
    if (event.type !== 'updated' || event.action.type !== 'success') return;

    const queryKey = event.query.queryKey;
    const data = event.query.state.data;

    // Chercher la règle de sync qui correspond
    for (const rule of rules) {
      if (!rule.match(queryKey)) continue;
      const entityId = rule.extractEntityId(queryKey);
      if (!entityId) break;

      // Écrire en SQLite
      upsertEntity({ entityType: rule.entityType, entityId, data });
      setLastSyncTimestamp(rule.entityType, entityId);
      break;
    }
  });
}
```

### Règles de sync configurées

```typescript
const defaultSyncRules = [
  {
    match: (key) => key[0] === 'teams' && key[1] === 'full',
    entityType: 'team',
    extractEntityId: (key) => buildTeamFullEntityId(key[2]),
  },
  {
    match: (key) => key[0] === 'players' && key[1] === 'full',
    entityType: 'player',
    extractEntityId: (key) => buildPlayerFullEntityId(key[2], key[3]),
  },
  {
    match: (key) => key[0] === 'competitions' && key[1] === 'full',
    entityType: 'competition',
    extractEntityId: (key) => buildCompetitionFullEntityId(key[2], key[3]),
  },
  {
    match: (key) => key[0] === 'match_details_full',
    entityType: 'match',
    extractEntityId: (key) => buildMatchFullEntityId(key[1]),
  },
];
```

**Résultat** : chaque fois qu'un fetch réseau ramène des données fraîches dans React Query,
elles sont automatiquement persistées en SQLite. Au prochain lancement de l'app,
ces données seront disponibles instantanément via l'hydration bridge.

---

## 13. Persistance MMKV et déshydratation sélective

**Fichier** : `src/ui/shared/query/queryPersistence.ts`

### Double persistance

Le mobile utilise **deux systèmes de persistance** complémentaires :

| Système | Cible | Format | Avantage |
|---------|-------|--------|----------|
| **SQLite** (entityStore) | Entités `/full` | DB relationnelle | Lectures synchrones, queries, GC granulaire |
| **MMKV** (PersistQueryClient) | Autres queries | Blob JSON | Facile, intégré à React Query |

### Déshydratation sélective

Toutes les queries ne sont pas persistées. Le filtre `shouldDehydrateQuery` décide :

```typescript
function shouldDehydrateQuery(query) {
  // Seulement les queries réussies
  if (query.state.status !== 'success') return false;

  // Si SQLite est activé, NE PAS persister les queries /full en MMKV
  // (elles sont déjà dans SQLite)
  if (appEnv.mobileEnableSqliteLocalFirst) {
    const key = query.queryKey;
    const isSqliteCanonical =
      (key[0] === 'teams' && key[1] === 'full') ||
      (key[0] === 'players' && key[1] === 'full') ||
      (key[0] === 'competitions' && key[1] === 'full') ||
      key[0] === 'match_details_full';
    if (isSqliteCanonical) return false;  // ← pas de doublon
  }

  // Vérifier la cachePolicy dans la matrice
  return isPersistableQueryKey(query.queryKey);
}
```

### Budget de persistance MMKV

```typescript
const MAX_PERSIST_BYTES = 512 * 1024;  // 512 KB max

// Si le blob sérialisé dépasse 512 KB, il n'est PAS écrit
// → Protège contre le bloat de stockage
```

---

## 14. Worker BFF : refresh continu en arrière-plan

**Fichiers** :
- `footalert-bff/src/worker/maintenance.ts` — boucle principale
- `footalert-bff/src/worker/read-store-refresh.ts` — traitement des jobs
- `footalert-bff/src/worker/match-calendar-scheduler.ts` — planification par match

### Boucle de maintenance

```typescript
// maintenance.ts — boucle infinie
async function runReadStoreMaintenanceLoop(input) {
  while (!input.isShuttingDown()) {
    const now = Date.now();

    // 1. Bootstrap warm (toutes les 5 minutes)
    if (now - lastBootstrapWarmAt >= 5 * 60_000) {
      await warmBootstrapSnapshot();
      lastBootstrapWarmAt = now;
    }

    // 2. Calendar scheduler (toutes les 2 minutes)
    if (now - lastCalendarAt >= 2 * 60_000) {
      await runCalendarScheduleCycle({ readStore, timezone });
      lastCalendarAt = now;
    }

    // 3. Garbage collection (toutes les 10 minutes)
    if (now - lastGcAt >= 10 * 60_000) {
      await deleteExpiredSnapshots();
      await deleteStaleHeartbeats();
      lastGcAt = now;
    }

    // 4. Traitement de la queue de refresh (toutes les 30 secondes)
    await processSnapshotRefreshQueue();

    // 5. Attente avec backoff exponentiel en cas d'erreur
    const waitMs = consecutiveErrors > 0
      ? Math.min(30_000 * 2^consecutiveErrors, 5 * 60_000)
      : 30_000;
    await wait(waitMs);
  }
}
```

### Traitement d'un job de refresh

```typescript
// read-store-refresh.ts
async function refreshSnapshotForJob(job) {
  switch (job.entityKind) {
    case 'team_full':
      await readStore.upsertEntitySnapshot({
        entityKind: 'team_full',
        entityId: job.entityId,
        scopeKey: job.scopeKey,
        payload: await fetchTeamFullPayload({ teamId: job.entityId, ... }),
        ...policyWindow(TEAM_POLICY),  // 6h fresh, 24h stale
      });
      break;

    case 'player_full':
      // ... idem avec PLAYER_POLICY (12h fresh, 36h stale)

    case 'competition_full':
      // ... idem avec COMPETITION_POLICY (4h fresh, 24h stale)

    case 'match_full':
      const payload = await buildMatchFullResponse(job.entityId, timezone);
      await readStore.upsertEntitySnapshot({
        ...policyWindow(MATCH_DEFAULT_POLICY),  // 5min fresh, 30min stale
      });
      // + overlay pour le live
      await persistWorkerMatchOverlay({ readStore, matchId, payload });
      break;

    case 'bootstrap':
      await readStore.upsertBootstrapSnapshot({
        scopeKey: job.scopeKey,
        payload: await buildBootstrapPayload({ ... }),
        ...buildSnapshotWindow({
          staleAfterMs: 5 * 60_000,   // 5min
          expiresAfterMs: 30 * 60_000, // 30min
        }),
      });
      break;
  }
}
```

### Queue de refresh avec priorités

```typescript
// Le worker claim 10 jobs à la fois, triés par priorité décroissante
const claimedJobs = await readStore.claimRefreshJobs({
  limit: 10,            // READ_STORE_REFRESH_CLAIM_LIMIT
  workerId: 'worker-PID',
});

// Priorités : LIVE(250) > IMMINENT(200) > PRE_MATCH(150) > POST_MATCH(100)
// → Les matchs live sont TOUJOURS traités en premier
```

---

## 15. Métadonnées de fraîcheur (`_meta`)

**Fichiers** :
- `footalert-bff/src/lib/freshnessMeta.ts` — construction côté BFF
- `src/domain/contracts/freshnessMeta.types.ts` — types partagés
- `src/data/query/freshnessMeta.ts` — exploitation côté mobile

### Concept

Chaque payload `/full` contient un champ `_meta` qui indique la fraîcheur de chaque sous-section :

```json
{
  "details": { "name": "FC Barcelona", "logo": "..." },
  "standings": { "rank": 1, "points": 72, ... },
  "transfers": [ ... ],
  "_meta": {
    "generatedAt": "2026-03-12T14:30:00.000Z",
    "fields": {
      "details":    { "freshness": "static",     "ttlSeconds": 2592000 },
      "standings":  { "freshness": "post_match",  "ttlSeconds": 21600 },
      "transfers":  { "freshness": "weekly",      "ttlSeconds": 86400 },
      "squad":      { "freshness": "post_match",  "ttlSeconds": 21600 },
      "matches":    { "freshness": "post_match",  "ttlSeconds": 21600 }
    }
  }
}
```

### Hints par entité

```typescript
// Team Full
_meta: buildFreshnessMeta({
  details:      freshnessHints.static,      // 30 jours
  leagues:      freshnessHints.static,
  trophies:     freshnessHints.static,
  squad:        freshnessHints.postMatch,    // 6 heures
  overview:     freshnessHints.postMatch,
  standings:    freshnessHints.postMatch,
  matches:      freshnessHints.postMatch,
  statistics:   freshnessHints.postMatch,
  statsPlayers: freshnessHints.postMatch,
  advancedStats: freshnessHints.postMatch,
  transfers:    freshnessHints.weekly,       // 24 heures
})

// Match Full — adaptatif selon le lifecycle
const isLive = lifecycleState === 'live';
const isFinished = lifecycleState === 'finished';
_meta: buildFreshnessMeta({
  fixture:    isFinished ? freshnessHints.static : freshnessHints.live,
  events:     isLive ? freshnessHints.live : isFinished ? freshnessHints.static : ...,
  statistics: isLive ? freshnessHints.live : ...,
  lineups:    freshnessHints.postMatch,
  predictions: freshnessHints.postMatch,
})
```

### Utilisation côté mobile

```typescript
// freshnessMeta.ts — utilitaires mobile

// Mapper FreshnessClass → staleTime React Query
const FRESHNESS_STALE_TIME_MS = {
  static:     Infinity,
  post_match: 6 * 60 * 60_000,  // 6h
  weekly:     24 * 60 * 60_000,  // 24h
  live:       15_000,             // 15s
};

// Obtenir le staleTime pour un champ spécifique
getFieldStaleTime(meta, 'standings')  // → 21600000 (6h)
getFieldStaleTime(meta, 'details')    // → Infinity
getFieldStaleTime(meta, 'events')     // → 15000 (si match live)

// Vérifier si le payload entier est encore frais
// (basé sur le champ le plus volatile)
isPayloadFresh(meta)  // → true si le champ le plus court est encore valide
```

---

## 16. Mode offline et mutation queue

**Fichier** : `src/data/db/offlineMutationQueue.ts`

### Principe

Quand l'utilisateur effectue une action (ex: suivre une équipe) alors qu'il est offline,
la mutation est enregistrée dans SQLite et exécutée à la reconnexion.

```typescript
// Enregistrement d'un executor au boot
registerMutationExecutor('follow_event', async (payload) => {
  await postFollowEvent(payload);
});

// Quand l'utilisateur suit une équipe en offline
try {
  await postFollowEvent(payload);
} catch {
  await enqueueMutation('follow_event', payload);
}

// À la reconnexion (via NetInfo listener)
onlineManager.setEventListener(setOnline => {
  return NetInfo.addEventListener(state => {
    const isOnline = state.isConnected && state.isInternetReachable;
    setOnline(isOnline);
    if (isOnline && !wasOnline) {
      drainMutationQueue().catch(() => undefined);
    }
    wasOnline = isOnline;
  });
});
```

---

## 17. Récapitulatif des fichiers clés

### BFF (footalert-bff/)

| Fichier | Rôle |
|---------|------|
| `src/lib/cache.ts` | Cache L1 in-memory + Redis + SWR |
| `src/lib/readStore/runtime.ts` | Interface ReadStore (PostgreSQL) |
| `src/lib/readStore/readThrough.ts` | SWR L2, read-through, dedup |
| `src/lib/readStore/policies.ts` | Politiques de fraîcheur (TTL) |
| `src/lib/freshnessMeta.ts` | Métadonnées `_meta` par champ |
| `src/worker/maintenance.ts` | Boucle principale du worker |
| `src/worker/read-store-refresh.ts` | Traitement des jobs de refresh |
| `src/worker/match-calendar-scheduler.ts` | Planification par match lifecycle |
| `src/worker/read-store-refresh-support.ts` | Constantes + services du worker |
| `src/routes/teams/fullRoute.ts` | Route `/v1/teams/:id/full` |
| `src/routes/teams/fullService.ts` | Aggrégation des 10+ appels team |
| `scripts/db/seed-read-store.ts` | Seed initial PostgreSQL |

### Mobile (src/)

| Fichier | Rôle |
|---------|------|
| `data/db/database.ts` | Singleton SQLite + migrations |
| `data/db/entityStore.ts` | CRUD synchrone SQLite |
| `data/db/localFirstAdapter.ts` | Logique SWR local-first |
| `data/db/useLocalFirstQuery.ts` | Hook React Query + SQLite |
| `data/db/queryCacheSyncMiddleware.ts` | Sync RQ → SQLite automatique |
| `data/db/hydrationBridge.ts` | SQLite → React Query au cold start |
| `data/db/offlineMutationQueue.ts` | Queue de mutations offline |
| `data/db/fullEntityIds.ts` | Builders d'ID composites |
| `data/bootstrap/bootstrapHydration.ts` | Bootstrap + prefetch warm |
| `data/query/queryOptions.ts` | Profils de fraîcheur, featureQueryOptions |
| `data/query/queryCachePolicyMatrix.ts` | Matrice complète (staleTime/gcTime) |
| `data/query/freshnessMeta.ts` | Exploitation `_meta` côté mobile |
| `domain/contracts/freshnessMeta.types.ts` | Types `_meta` partagés |
| `ui/app/providers/QueryProvider.tsx` | Provider principal |
| `ui/shared/query/queryPersistence.ts` | Persistance MMKV sélective |
| `ui/features/teams/hooks/useTeamLocalFirst.ts` | Hook local-first team |
| `ui/features/players/hooks/usePlayerLocalFirst.ts` | Hook local-first player |
| `ui/features/competitions/hooks/useCompetitionLocalFirst.ts` | Hook local-first competition |
| `ui/features/matches/details/hooks/useMatchLocalFirst.ts` | Hook local-first match |

---

## 18. Implémentation pas-à-pas du SWR mobile

### Ce qui est déjà en place

1. **SQLite local store** complet (entity store, migrations, GC)
2. **Local-first adapter** (`createLocalFirstQueryFn`) avec SWR
3. **4 hooks local-first** (team, player, competition, match) avec `maxAgeMs` alignés sur les BFF policies
4. **Sync middleware** : React Query → SQLite automatique
5. **Hydration bridge** : SQLite → React Query au cold start
6. **Prefetch warm** avec `staleTime` alignés
7. **Persistance MMKV** sélective (évite les doublons SQLite)
8. **QueryProvider** qui orchestre tout au boot
9. **Worker BFF** avec calendar scheduler + refresh queue
10. **Métadonnées `_meta`** dans tous les payloads `/full`

### Comment ça marche concrètement pour competition_full et team_full

#### competition_full — L'utilisateur clique sur "Ligue 1"

```typescript
// useCompetitionLocalFirst.ts
const COMPETITION_FULL_MAX_AGE_MS = 4 * 60 * 60_000; // 4h

useLocalFirstQuery<CompetitionFullPayload>({
  queryKey: queryKeys.competitions.full('61', season),
  entityType: 'competition',
  entityId: buildCompetitionFullEntityId('61', season),  // '61:2025'
  maxAgeMs: COMPETITION_FULL_MAX_AGE_MS,                 // 4h
  fetchFn: (signal) => fetchCompetitionFull(61, season, signal),
  enabled: fullEnabled,
  queryOptions: featureQueryOptions.competitions.full,
  //          → { staleTime: 4h, gcTime: 24h, retry: 1 }
});
```

**Résultat** :
1. SQLite retourne le snapshot Ligue 1 stocké il y a 2h → **affichage instantané** (classement, matchs, stats)
2. Le `localFirstAdapter` vérifie : 2h < 4h (maxAgeMs) → **FRAIS, pas de réseau**
3. Si c'était > 4h : fetch BFF en arrière-plan, l'UI montre les anciennes données pendant ce temps
4. Le BFF vérifie son L2 PostgreSQL (COMPETITION_POLICY.freshMs = 4h) → mêmes fenêtres
5. Quand la réponse réseau arrive, `queryCacheSyncMiddleware` écrit en SQLite automatiquement

#### team_full — L'utilisateur clique sur "Barcelone"

```typescript
// useTeamLocalFirst.ts
const TEAM_FULL_MAX_AGE_MS = 6 * 60 * 60_000; // 6h

useLocalFirstQuery<TeamFullData>({
  queryKey: queryKeys.teams.full('529', 'Europe/Paris'),
  entityType: 'team',
  entityId: '529',
  maxAgeMs: TEAM_FULL_MAX_AGE_MS,        // 6h
  fetchFn: (signal) => fetchTeamFull({ teamId: '529', timezone }, signal)
    .then(p => p.response),
  enabled: fullEnabled,
  queryOptions: featureQueryOptions.teams.full,
  //          → { staleTime: 6h, gcTime: 24h, retry: 1 }
});
```

**Le cycle complet SWR pour "Barcelone"** :

```
  PREMIER ACCÈS (T=0)
  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐
  │ SQLite   │ →  │ skeleton │ →  │ BFF fetch│ →  │ Données OK   │
  │ MISS     │    │ affiché  │    │ L1→L2→API│    │ SQLite+RQ    │
  └──────────┘    └──────────┘    └──────────┘    └──────────────┘

  DEUXIÈME ACCÈS (T=+3h, cache frais car < 6h)
  ┌──────────┐    ┌──────────────────────┐
  │ SQLite   │ →  │ Données INSTANTANÉES │  ← 0 appel réseau
  │ HIT (3h) │    │ isFromLocalCache=true│
  └──────────┘    └──────────────────────┘

  TROISIÈME ACCÈS (T=+8h, cache stale car > 6h)
  ┌──────────┐    ┌─────────────┐    ┌──────────┐    ┌────────────┐
  │ SQLite   │ →  │ Placeholder │ →  │ BFF fetch│ →  │ UI update  │
  │ HIT (8h) │    │ (données 8h)│    │ silencieux│    │ en douceur │
  │ STALE    │    │ INSTANTANÉ  │    │ en arrplan│    │ si changé  │
  └──────────┘    └─────────────┘    └──────────┘    └────────────┘

  ACCÈS OFFLINE
  ┌──────────┐    ┌──────────────────────┐
  │ SQLite   │ →  │ Données INSTANTANÉES │  ← cache même stale
  │ HIT      │    │ pas de réseau tenté  │
  └──────────┘    └──────────────────────┘

  ACCÈS OFFLINE SANS CACHE
  ┌──────────┐    ┌──────────────────────┐
  │ SQLite   │ →  │ LocalFirstOfflineError│  ← skeleton + message
  │ MISS     │    │ "Pas de connexion"    │
  └──────────┘    └──────────────────────┘
```

### La mise à jour "en douceur"

Quand le fetch réseau ramène des données plus récentes :

1. React Query remplace le `placeholderData` par les données réseau
2. `isPlaceholderData` passe de `true` à `false`
3. React fait un **diff** entre l'ancien et le nouveau rendu
4. **Seuls les composants dont les données ont changé** sont re-rendus
5. L'utilisateur voit le score passer de 2-0 à 2-1, par exemple
6. **Aucun spinner, aucun flash, aucun skeleton** — transition invisible

C'est le cœur du SWR : **affichage instantané + mise à jour invisible**.

---

## Diagramme de synthèse final

```
┌─────────────────────── MOBILE ────────────────────────────────┐
│                                                                │
│  useTeamLocalFirst({ teamId: '529', timezone })                │
│       │                                                        │
│       ▼                                                        │
│  ┌────────────────────────────────────────────┐                │
│  │        useLocalFirstQuery()                 │                │
│  │                                             │                │
│  │  ┌─ useMemo ──────────────────────────────┐ │                │
│  │  │ getEntityById('team','529')             │ │ ← synchrone  │
│  │  │ → placeholderData (affichage 0ms)       │ │   (<5ms)     │
│  │  └─────────────────────────────────────────┘ │                │
│  │                                             │                │
│  │  ┌─ queryFn (localFirstAdapter) ───────────┐ │                │
│  │  │ 1. Lire SQLite                           │ │                │
│  │  │ 2. Si frais (< 6h) → retour immédiat    │ │                │
│  │  │ 3. Si stale → fetch BFF                  │ │                │
│  │  │ 4. Écrire réponse en SQLite              │ │                │
│  │  │ 5. React Query met à jour l'UI           │ │                │
│  │  └──────────────────────────────────────────┘ │                │
│  │                                             │                │
│  │  staleTime: 6h  (via featureQueryOptions)   │                │
│  │  gcTime: 24h                                │                │
│  └────────────────────────────────────────────┘                │
│                    │                                            │
│  ┌─ syncMiddleware │────────────────────────────────────────┐  │
│  │ QueryCache.subscribe('updated'+'success')                │  │
│  │ → upsertEntity() + setLastSyncTimestamp()                │  │
│  │ → Chaque résultat réseau est automatiquement sauvé SQLite│  │
│  └──────────────────────────────────────────────────────────┘  │
│                    │ fetch réseau (si stale)                     │
└────────────────────┼────────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌────────────────── BFF ──────────────────────────────────────────┐
│                                                                  │
│  GET /v1/teams/529/full?timezone=Europe/Paris                    │
│       │                                                          │
│       ▼                                                          │
│  ┌── L1 : withCacheStaleWhileRevalidate ──────────────────────┐ │
│  │  1. getFreshCachedValue() → HIT/MISS                        │ │
│  │  2. getStaleCachedValue() → retour stale + bg refresh       │ │
│  │  3. createCacheFillPromise() → fetch L2                     │ │
│  └─────────────────────────┬──────────────────────────────────┘ │
│                             │                                    │
│                             ▼                                    │
│  ┌── L2 : readThroughSnapshot ────────────────────────────────┐ │
│  │  1. getEntitySnapshot('team_full', '529', scopeKey)         │ │
│  │  2. Si FRESH → retour immédiat                              │ │
│  │  3. Si STALE → retour + enqueueRefresh() pour le worker     │ │
│  │  4. Si MISS → fetchTeamFullPayload() → API-Football         │ │
│  │  5. upsertEntitySnapshot() avec TEAM_POLICY window          │ │
│  │     (generatedAt → +6h=staleAt → +24h=expiresAt)           │ │
│  └─────────────────────────┬──────────────────────────────────┘ │
│                             │                                    │
│  ┌── Worker (arrière-plan) ┼──────────────────────────────────┐ │
│  │  • claimRefreshJobs() toutes les 30s                        │ │
│  │  • Traite les jobs par priorité (LIVE=250 en premier)       │ │
│  │  • Appelle API-Football et met à jour le snapshot           │ │
│  │  • Calendar scheduler : enqueue selon le cycle de vie match │ │
│  └─────────────────────────┴──────────────────────────────────┘ │
│                             │                                    │
│                             ▼                                    │
│  ┌── API-Football (source externe) ──────────────────────────┐  │
│  │  /v3/teams?id=529                                          │  │
│  │  /v3/teams/statistics?team=529&league=140&season=2025      │  │
│  │  /v3/standings?league=140&season=2025                      │  │
│  │  /v3/fixtures?team=529&season=2025&last=10                 │  │
│  │  /v3/transfers?team=529                                    │  │
│  │  ... (~10 appels agrégés en 1 payload "full")              │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

**Ce document reflète l'état de l'architecture au 12 mars 2026, après les Sprints 1→6 d'optimisation.**
