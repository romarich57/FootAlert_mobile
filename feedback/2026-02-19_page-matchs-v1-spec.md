# FootAlert — Spécification V1 (Page Matchs + Navbar)

## 1) Objectifs UX par page

### Matchs
- Offrir une lecture instantanée des matchs par date.
- Filtrer rapidement par statut (`Live`, `À venir`, `Terminé`).
- Regrouper par compétition avec sections repliables.
- Mettre en avant les matchs liés aux suivis (section dédiée en tête).
- Ouvrir le détail match en un tap.
- Permettre le réglage rapide des notifications par match.
- Insérer une bannière sponsor entre sections sans casser le flux de lecture.

### Compétitions
- Accessible depuis la navbar.
- En V1: écran placeholder explicite "Section en cours d’implémentation".

### Suivis
- Accessible depuis la navbar.
- En V1: écran placeholder explicite "Section en cours d’implémentation".

### Plus
- Accessible depuis la navbar.
- En V1: écran placeholder explicite "Section en cours d’implémentation".

## 2) Liste des écrans + composants principaux

### Écrans
- `MatchesScreen`
- `CompetitionsScreen` (placeholder)
- `FollowsScreen` (placeholder)
- `MoreScreen` (placeholder)
- `SearchPlaceholderScreen`

### Composants Matchs
- `MatchesHeader`
- `DateChipsRow`
- `StatusFiltersRow`
- `CompetitionSection`
- `MatchCard`
- `LiveBadge`
- `PartnerBannerCard`
- `MatchNotificationModal`
- `ScreenStateView`

### Data / logique Matchs
- `useMatchesQuery`
- `useMatchesRefresh`
- `useMatchesOfflineCache`
- `matchesApi.fetchFixturesByDate`
- `fixturesMapper`
- `matchPreferencesStorage`

## 3) Actions utilisateur -> Résultat

| Action | Résultat |
|---|---|
| Tap match | Navigation vers `MatchDetails` |
| Tap header compétition | Replie / déplie la section |
| Pull-to-refresh | `refetch` immédiat de la date courante |
| Tap notif match | Ouvre le modal des notifications match |
| Enregistrer dans modal notif | Sauvegarde locale (`match_notifications_<fixtureId>`) |
| Tap recherche (header) | Navigation vers `SearchPlaceholder` |
| Tap Compétitions / Suivis / Plus | Affiche "Section en cours d’implémentation" |

## 4) États (loading/empty/error/offline/slow) -> comportement UI

| État | Comportement |
|---|---|
| Loading | Skeleton list + message de chargement |
| Empty | Message "Aucun match" pour date/filtre courant |
| Error | Message explicite (API down, quota, réseau) + bouton retry |
| Offline | Affiche cache + "Dernière mise à jour : ..." |
| Slow network | Message d’info + réduction de fréquence de refresh |

## 5) Règles refresh / cache / notifs / ads

## Refresh
- Live refresh nominal: `10s` en production.
- Actif uniquement si:
  - écran Matchs visible,
  - app en foreground,
  - au moins un match live.
- Backoff sur erreurs: `10s -> 20s -> 40s -> max 60s`.
- Slow network: bascule temporaire en `30s`.

## Cache
- Portée V1 implémentée: cache Matchs par date (`matches_cache_<YYYY-MM-DD>`).
- Utilisation:
  - lecture cache en offline,
  - fallback cache en cas d’erreur réseau/API.
- Métadonnée persistée: `lastUpdatedAt`.

### Cibles TTL (spécification produit)
- Live: `15s`
- Standings: `1h`
- Profils équipe/joueur: `24h`

### Politique de purge (spécification produit)
- Stratégie LRU + limite taille cache (à finaliser en implémentation multi-écrans).

## Notifications
- V1 implémentée: préférences locales par match.
- Clé de stockage: `match_notifications_<fixtureId>`.
- Options: `goal`, `redCard`, `start`, `end`.
- Push backend live: hors scope V1 écran Matchs.

## Ads
- V1 implémentée: slot sponsor placeholder entre sections.
- SDK pub réel: hors scope V1.

## 6) Questions ouvertes

1. Quelle source métier finale pour les IDs suivis (clé storage unique et contrat exact)?
2. Doit-on exposer un date picker natif en plus des chips de date?
3. Quel SDK pub sera retenu (et règles de capping exactes)?
4. Faut-il ajouter un écran global de réglages notifications dès V2?
5. Quelle stratégie de retry produit sur erreurs quota API-Football (cooldown UI dédié)?

## 7) Risques

- Clé API exposée côté mobile (risque de fuite/abus de quota).
- Variabilité du payload API-Football selon compétitions/statuts.
- Dépendance réseau forte pour le live (expérience dégradée hors connexion sans cache riche).
- Placeholders tabs non implémentées peuvent créer une frustration si laissées trop longtemps.
