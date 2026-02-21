# PRD: FootAlert Mobile App (React Native + API-FOOTBALL)

# Nom de mon app : FootAlert

### TL;DR

FootAlert est une application mobile React Native (iOS & Android) dédiée au football, affichant scores live, calendrier, classements, et statistiques équipes/joueurs grâce à l’API-FOOTBALL. Aucun compte requis ; monétisation uniquement par publicité. Utilisateurs peuvent suivre joueurs/équipes (stockage local), recevoir notifications hybrides (push/local). FR/EN dès le lancement.

---

## Goals

### Business Goals

* Atteindre 30 000+ DAU dans les 6 premiers mois via la viralité des suivis / notifications.

* Générer un CPM moyen de 2 $+ (remplissage 85%) par l’intégration multi-réseaux publicitaires.

* Retenir au moins 35% des utilisateurs à 7 jours (D7 Retention).

* Minimiser coûts backend grâce au cross-plateforme et stockage majoritairement local.

### User Goals

* Accès immédiat aux scores et détails en direct (latence <2s).

* Suivi simple (et anonyme) des joueurs et équipes préférés, sans création de compte.

* Couvre toutes les compétitions connues (ligues et coupes) dans le monde.

* Notifications pertinentes (buts, cartons, débuts/fins de match) configurables.

* Interface rapide et simple ; compatibilité totale hors connexion pour historique.

### Non-Goals

* Pas de compte / login utilisateur.

* Pas d’abonnement, dons ou contenu payant.

* Pas de fonction de partage de contenu, chat, ou réseau social.

* Pas de création ou édition de contenu éditorial (actualité et TOTW uniquement via API/partenaires).

---

## User Stories

### Personas

1\. Le Fan Occasionnel

* Cherche résultats et horaires rapidement, suit 1-2 clubs/joueurs.

* A besoin de scores live, alertes simples.

* Préfère ne rien configurer.

2\. Le Stat-Geek

* Parcourt stats avancées, historique des joueurs, xG, comparaisons.

* Suit 10+ joueurs et 5+ équipes, souhaite filtrer et trier les données.

* Veut personnaliser les notifications.

3\. Le Globe-Fan

* S’intéresse à plusieurs championnats (Ligue 1, Premier League, Copa Libertadores…).

* Utilise la recherche de compétitions et le suivi multi-ligues.

* A besoin d’un catalogue exhaustif et d’une app rapide, même hors-ligne.

### User Stories

* En tant que Fan Occasionnel, je veux voir les matches du jour dès l’ouverture, pour savoir rapidement ce qui se joue.

* En tant que Globe-Fan, je veux filtrer la liste par compétition pour retrouver mes ligues préférées.

* En tant que Stat-Geek, je veux accéder à la page d’un joueur suivi et afficher sa timeline match par match.

* En tant que Fan Occasionnel, je veux « suivre » un joueur pour recevoir une notif s’il marque.

* En tant que Globe-Fan, je veux pouvoir changer la langue de l’app sans redémarrer.

* En tant que Stat-Geek, je veux consulter les classements avancés (xG, forme, home/away).

* En tant que Fan Occasionnel, je veux recevoir une alerte 15min avant un match que j’ai suivi.

* En tant que Globe-Fan, je veux pouvoir consulter les matchs terminés d’hier ou la semaine dernière, même sans connexion.

* En tant que Stat-Geek, je veux trier la liste des joueurs par buts / xG / minutes jouées.

* En tant que Fan Occasionnel, je veux comprendre facilement quand la data n’est pas à jour (timestamp affiché).

* En tant que Globe-Fan, je veux accéder au détail d’une compétition : calendrier, classement, actus, TOTW.

* En tant que Stat-Geek, je veux afficher la compo et les stats avancées d’un match live.

* En tant que Fan Occasionnel, je veux pouvoir vider le cache depuis les paramètres pour économiser espace/data.

* En tant que Globe-Fan, je veux naviguer d’un match vers la fiche d’une équipe, puis revoir son calendrier ou effectif.

* En tant que Fan Occasionnel, je veux désactiver globalement les notifications la nuit (quiet hours).

---

## Functional Requirements

* **Tab 1: Matches** (Priority: P0)

  * Sélecteur de date (horizontal + picker)

  * Filtres : statut, compétition, prioriser suivis

  * Affichage groupé par compétition

  * Pull-to-refresh & auto-refresh (10s)

  * MatchCard (noms, logo, score, statut/minute, heure locale, signaux)

* **Tab 2: Competitions** (Priority: P0)

  * Catalogue toutes compétitions (recherche)

  * Page compétition avec tabs internes : Matchs, Classement, Stats, Actus (P2), TOTW (P2)

  * Classement (points, forme, home/away)

  * Stats (buteurs, passeurs, cartons, xG/xA)

* **Tab 3: Follows (Suivis)** (Priority: P0)

  * Segmented control Joueurs | Équipes

  * Suivre / ne plus suivre | recherche | tri | filtres

  * Fiche joueur (stats, timeline, vue match à match, comparatif P1)

  * Fiche équipe (overview, prochain/dernier match, classement, stats, effectif)

* **Notifications hybrides** (Priority: P0)

  * Push (backend minimal en TypeScript/Express, FCM)

  * Notifications locales (pré-match, fallback)

  * Paramètres globaux/par entité; quiet hours.

* **Settings / Plus** (Priority: P0)

  * Langue FR/EN, Thème clair/foncé

  * Notifications: global/per-entity, quiet hours

  * Cache: taille, vider, date maj.

  * Legal/privacy: consentement pubs, tracking

* **Ads Integration** (Priority: P0)

  * Banner, interstitial, native

  * Capping, capping, frequency, UX-rules

* **Widgets, Partage, Comparaison, Alertes personnalisées** (Priority: P1)

  * Home personnalisable, widgets scores, partage carte, comparatif stats

* **Actus, TOTW, Insights, Mode spoiler-free, Live Activities** (Priority: P2)

  * Intégration NewsAPI, ratings API, analytics de forme, Dynamic Island

---

## User Experience

**Entry Point & First-Time User Experience**

* Arrivée directe sur Matches, date du jour, sans configuration ni login.

* Suggestion de suivre équipe/joueur en tapant sur étoile sur fiche joueur/équipe.

* Tutoriel ultra-court (tooltips sur suivi, paramètres, notifications).

**Core Experience**

* **Step 1:** Ouvrir Matches → Voir tous les matchs du jour, triés/groupe par compétition.

  * UI: barre date, filtres, rafraîchissement auto/pull.

  * Si offline : affichage dernière maj, pull = toast ‘No connection’.

* **Step 2:** Tap match → Détail Match : scoreboard, timeline (buts, actions), compos, stats (xG, etc.).

* **Step 3:** Tap joueur ou équipe → page dédiée (stats, calendrier). Suivre via Étoile.

* **Step 4:** Accès Compétitions via tab → recherche/sélection, tabs internes : Matches/Classements/Stats/(Actus/TOTW si dispo).

* **Step 5:** Tab Suivis → liste suivis Joueurs/Équipes, stats rapides, tri/filtre, navigation rapide vers fiche.

* **Step 6:** Tab Plus → accès réglages, langue/thème, gestion notifs, cache, privacy.

* **Step 7:** Notifications live, configurable par préférences globale/entité : réception push (événements) ou local (pré-match).

**Advanced Features & Edge Cases**

* Pas de data dispo : fallback loading/error state clairement affiché (ex: « Plus de quota d’API »)

* Fallback image/logo si ressource absente.

* Actions désactivées offline sauf consultation du cache.

* Filtres et recherches désactivés/vides si pas de data ou filtre trop restrictif.

* Synchronisation préférences/follows lors d’une reconnexion.

**UI/UX Highlights**

* Bottom bar fixe, accessibilité WCAG AA (contraste, tailles, VoiceOver/TalkBack).

* Format heures/dates auto (timezone téléphone).

* Animations subtiles (ex: badge LIVE clignotant).

* Indicateur de cache (‘données du xx/xx/xxxx à xxhxx’).

* Input réactif, listes virtualisées (FlatList), scroll perfo sur vieux devices.

* Tous textes extraits fichiers trad ; switch dynamique langue.

* Composants tactiles min 44x44pt.

---

## Narrative

Marco adore le foot — il suit la Ligue 1 et la Premier League, avec ses idoles Mbappé et Haaland. Mais il en a assez : chaque appli impose un login, les pubs bloquent l’interface ou les scores arrivent en retard, les stats avancées sont payantes. Un soir, il installe FootAlert. Pas de compte : il choisit dès l’accueil ses équipes/joueurs en un clic (étoile), l’app lui affiche instantanément scores et calendrier, pull-to-refresh fluide, notifications précises (buts, cartons, temps forts), avec une interface light/dark automatique et changement de langue à la volée. Deux jours plus tard : pas de réseau ? Il retrouve tout son historique ; il reçoit la notification 30 min avant PSG-Man City. À chaque match, stats xG/xA complètes, timeline claires, et jamais d’intersticiel pendant l’action. Marco a enfin trouvé son app : rapide, simple, fiable, sans friction… et il la recommande à ses potes fans de foot.

---

## Success Metrics

* **User-Centric**

  * DAU/MAU Ratio > 35%

  * Nombre moyen de suivis par user (>4)

  * Taux d’activation des notifications > 70%

  * Retention D1 > 45%, D7 > 35%

* **Business**

  * Impressions pub/session 8–12

  * eCPM moyen > 2$

  * Taux de remplissage pubs > 85%

* **Technical**

  * Crash free users >99.5%

  * Latence 95p < 2s sur affichage matchs

  * Taux de cache ‘hit’ offline > 30%

  * Utilisation API sous 80% du quota quotidien

* **Tracking Plan**

  * `match_viewed`

  * `player_followed` / `team_followed`

  * `notification_received`

  * `competition_browsed`

  * `ad_impression`

  * `settings_changed`

  * `offline_cache_used`

---

## Technical Considerations

### Technical Needs

* Front: React Native (iOS/Android), TypeScript, React-Navigation (bottom tabs)

* API: API-FOOTBALL (librairies REST/HTTPS pour quotas/dev/prod)

* Backend: Node.js + Express + TypeScript (minimale, pour stockage tokens et orchestration push via FCM)

* Base de données backend: PostgreSQL (persistences tokens device, préférences notifs serveur, journaux techniques)

* Stockage local: AsyncStorage (follows/préférences UI), SQLite (cache structuré matchs, standings, stats)

* Modules: i18n (react-i18next), Ads SDK (multi-network mediation)

* Analytics: Firebase, Amplitude ou custom event log

### Integration Points

* API-FOOTBALL REST endpoints (quasi totalité disponibles hors éditorial)

* Firebase FCM (Push notifications)

* Mediateur pubs (AdMob, FAN, AppLovin)

* Module consentement pub (UMP CMP)

* NewsAPI (pour P2 Actus, TOTW à brancher dès dispo data)

### Data Storage & Privacy

* Pas de compte, aucun PII.

* Stockage local non chiffré (aucune donnée sensible)

* Tokens device anonymisés pour notifs push

* Consentement pubs/analytic conforme RGPD/CCPA/ATT (via SDK Google)

* Purge cache auto après 30j inactif

* Retrait total (suivis, prefs) à désinstallation

### Scalability & Performance

* Ciblage 50 000+ utilisateurs (charge minime serveurs, asynchrone uniquement pour notifs)

* Charge API dynamique : throttlé côté client, priorisation actions utilisateur, batch API si possible, monitoring quota (alerte 80%)

* Auto-purge LRU cache > 50Mo, offline optimisé, TTL variable

### Potential Challenges

* Quota API-FOOTBALL (développements en mock, fallback cache)

* Sécurité clés API (jamais embarquées client)

* Taux de remplissage pubs

* UX sur devices basiques (Android Go, iPhone SE)

* Compliance licences images/logos, ToS API

---

## Milestones & Sequencing

### Project Estimate

* Large (P0: 6–8 semaines, P1: +4 semaines, P2: +4 semaines)

### Team Size & Composition

* Orchestrateur unique (Romaric)

* Teams agents IA autonomes : Frontend, Backend, QA

* Product Owner/QA/UX Process piloté centralement

### Suggested Phases

**Phase 1: MVP (6–8 semaines)**

* Navigation bottom tab ; Matches (date + filtres + live + détails); Competitions (catalogue/matches/classement/stats); Follows (suivis, recherche, stats, écrans équipes/joueurs); Notifications hybrides (push/backend minimal, locales); Settings complet; Monétisation ads (UX rules, mediation, consentement); Local storage & cache offline; i18n FR/EN.

* Dépendances: API-FOOTBALL free tier dev.

**Phase 2: V1 (+4 semaines)**

* Widgets scores suivis, partage cards, personnalisation Home, comparatif stats joueurs/équipes, alertes personnalisées.

* Dépendances: deep linking OS, modules social sharing, UI compare

**Phase 3: V2 (+4 semaines)**

* Tab Actus (NewsAPI, fallback si null), TOTW, mode spoiler-free, Live Activities (Dynamic Island/locksreen), insights data avancés

* Dépendances: NewsAPI, ratings API, monitoring backend.

---

## Information Architecture & Navigation

* **Bottom Tab Bar**:

  1. **Matches** : Liste jour/filtre/MatchCard → détail match

  2. **Competitions** : Catalogue, recherche → fiche compet (tabs matches/classement/stats/actus/TOTW)

  3. **Follows** : Segmented Joueurs/Equipes → search/list/detail → suivi/unfollow

  4. **More** : Settings, langue, cache, perf, privacy

* **Navigation cross-tabs** :

  * Match → équipe, joueur, compétition

  * Team → compétition, calendrier, joueur

  * Joueur → équipe, matches, comparaisons

  * Compétition → matches, classements, équipe, joueur

  * Maintien du contexte de tab à chaque nav (back logique)

---

## Data & Models

---

## API & Provider Strategy

* **API-FOOTBALL usage** : 100 calls/jour (dev free), passage paid en prod.

* **Endpoints** : fixtures, events, lineups, stats (incl. xG), standings, top scorers, leagues, players/topsassists.

* **Polling** : live auto-refresh 10s, screen actif uniquement; matches finis TTL 24h; standings TTL 1h.

* **Quotas** : monitoring usage & fallback (alerte 80%, degradation s’il reste 10%)

* **Rate Limiting** : backoff exponentiel sur 429, request queue, user-action prioritaire.

* **Fallback** : affichage cache (timestamp visible « dernière maj... »), retry, offline full UX si cache local.

* **News/TOTW** : NewsAPI (free, 100/jour; fallback P2), ratings API à plugger pour joueurs.

---

## Notifications Hybrid Strategy

* **Push (backend minimal)** : but/passe/carton joueurs suivis; début/fin matchs; score suivi en live.

  * Node.js + Express + TypeScript

  * Utilisation FCM pour délivrer push; device tokens anonymes stockés/actualisés.

  * Mapping prefs: chaque device = liste suivis, prefs notifs (on/off, quiet hours).

* **Notifications locales** : rappels pré-match (30/60 min), fallback push offline.

* **Paramètres** : global on/off, toggle par entité (joueur, équipe, match); plage silent; respect fuseau/permissions OS.

* **Edge cases** : refresh token FCM, unfollow = opt-out auto, opt-in/out simple.

* **Backend** : orchestrateur unique avec batch push pour limiter couts infra, monitoring erreur.

---

## Local Storage & Offline

* Stockage :

  * AsyncStorage : followedPlayers\[\], followedTeams\[\], userPreferences {langue, thème, notifs}

  * SQLite/WatermelonDB : cache structuré (matchs, standings, stats), avec TTL par type

* Limite cache: 50Mo, purge LRU.

* UX offline: affichage timestamp (‘dernière maj’), empty state & message, pull-to-refresh active toast ‘connexion requise’.

* Sync automatique des suivis/préférences au retour online.

* Optimistic update : suivi instantané, sync différée.

---

## Performance & Battery Optimization

* Auto-refresh : polling toutes 10s écran live ONLY, suspendu background, throttling batterie <20%.

* Batch API, gzip, images lazy (cache logo, photos), FlatList virtualisée, pagination.

* Débounce inputs (recherche 300ms).

* Monitoring calls/session, battery drain: objectif < 5%/heure active.

* LRU images: max 100, purge anciens.

---

## Advertisements & UX Rules

* **Emplacements** : Banner bas Matches (persistent), native insérée toutes 5-7 cards matchs, interstitial (switch tab, cap 1/3min, jamais pendant action critique).

* **Mediation multi-réseaux** : AdMob (1), FAN (2), AppLovin (3), waterfall + timeout 5s.

* **UX rules** : pas d’interstitial pendant but/match lancement, call-to-action non bloqué, loading state pub max 2s, skip bouton après 5s.

* **Privacy** : GDPR/CCPA/ATT compliance (SDK dialog), opt-out ok.

* **Capping** : max 1 interstitial (user neuf), +users cap dynamique.

* **Metrics** : 8–12 impressions/session, fill rate 85%+, eCPM 2-4$.

---

## Internationalization & Accessibility

* **i18n** : react-i18next/fr.json/en.json (clés structurées, ex: matches.filters.live, player.stats.goals)

* **NO HARD CODED TEXTS** : tout string importée

* **Switcheur langue runtime, pas de restart**

* **Plural / formats** : ICU MessageFormat, date-fns locale, nombre (1 234 vs 1 234), xG: décimal fr/en

* **Accessibilité** : contrastes AA, VoiceOver/TalkBack, touch ≥44x44, focus visible

* **Font scaling** : support iOS/Android max 200%

* **Reduced motion** : animation désactivable si setting OS.

---

## Security & Privacy

* **Aucune donnée sensible (no PII)**

* Device tokens anonymes FCM (backend)

* Analytics usage anonymisé

* Clés API jamais dans le client (proxy/backend, env_vars/obfuscation)

* HTTPS only, certif SSL validé (option: pinning P1)

* Politique vie privée, droit suppression, ToS et attribution API-FOOTBALL/logos

* Consentement pubs/tracking (CMP), compliance RGPD/CCPA/ATT, aucune collecte <13 ans

---

## Roadmap

* **P0 : 6–8 semaines**

  * Bottom nav; Matches (filtre, refresh, detail, xG, links), Compets (catalogue, matches, classements, stats), Suivis, Settings/Plus, Notifs (push/local, prefs, silent), Ads (multi-network, consent), Cache offline, i18n

* **P1 : +4 semaines**

  * Widgets, partages, Home custom, comparaisons, alertes avancées

* **P2 : +4 semaines**

  * Actus (NewsAPI/équipes), TOTW (ratings API), mode spoiler-free, Live Activities, insights stats

---

## Risks & Mitigations

* API-FOOTBALL quota épuisé dev : use mocks, heavy caching, passage pro en prod.

* Rate limit prod : backoff, queue, priorité actions utilisateur, monitoring 80%.

* Coût infra backend/push : orchestrateur stateless, batch push, usage FCM

* Taux pubs faible : mediation multi-network, fallback house ads, AB test placements.

* Rejet AppStore (licences...) : vérif ToS, attribution claire, privacy policy complète.

* Perfo bas devices : tests Android Go/iPhone SE, optim images/lists.

* Perte suivis si uninstall : accepté (MVP), cloud backup P1 opt

* Nav complexe : onboarding/tutoriel, back cohérent, breadcrumb contextuel

* Données xG/xA absentes : fallback « N/A », ou section masquée si null

* News/TOTW API cher/non fiable : report P2, test tiers free, contournement/fallback

---

## Open Questions

1. Quel plan prod API-FOOTBALL choisir (Basic/Pro/Ultra) selon DAU ? En dev le gratuit , puis en prod le Pro .

2. Backend notifs : AWS Lambda/API Gateway/DB ou Firebase Functions/Firestore ou VPS ? VPS

3. Politique ad mediation : AdMob tjrs primaire ou dynamique selon fill/ecpm ? dynamique ( peu importe l'objetcif est l'argent gagné )

4. Doit-on limiter le nombre de suivis (50 joueurs/équipes max) ? Non pas pour l'instant 

5. Stratégie anti-spam notifs: throttling/digest mode/batch ? oui


7. Stats joueurs : saison par défaut ou sélecteur multi-saisons ? selecteur multi -saisons

8. Timeline match : suffisant polling 10s ou websocket à prévoir (ressenti live) ? websocket à prévoir pour un ressenti live

9. Cache offline : pré-cache forçé suivi (ex: load compo avant match) ? oui

10. Thème : light/dark ou couleur custom/accent possible ? Se référer au mockup qui seront crées et renseignés 

11. Analytics : Firebase/Mixpanel/Amplitude ou custom event store ? Quels events clés ? A déterminer

12. PR app store : screenshots, keywords, listing FR/EN ? A déterminer

13. Algorithme TOTW : ratings API ou calcul arbitraire (buts/assist/xG) ? Rating APi

14. NewsAPI free tier (100/jour) suffit ou besoin premium ? suffit pour le mode dev

15. Messagerie erreur: ‘Erreur inconnue’ ou messagerie détaillée (ex: quota épuisé) ? Gestion d'erreurs propres et détaillés 

16. Single onboarding nécessaire : mini tutoriel obligatoire ou en option ? En option dans les paramètres ( qui se situeront dans le plus)

17. UI filtres compets Matches: chips inline, modal multi-select, autre ? oui

18. Badge match live: animé (pulse), label rouge, ui “sobre” ? oui

---

## Annexes

### Tableau features

### QA Checklist (25+)

1. Ouverture instantanée (latence <2s)

2. Rafraîchissement auto/pull (matches)

3. Navigation match→équipe→compétition

4. Timeline match live en direct

5. Suivi joueur/équipe ajoute bien au localstorage

6. Unfollow retire notifs sur entité

7. Résilience offline: affichage cache

8. Statistiques xG visibles si dispo, fallback sinon

9. Passage FR/EN instantané

10. Police scalable sur tous écrans

11. Consentement pubs sur premier lancement

12. Skip/cta pubs toujours visibles

13. Purge cache libère espace et UI actualisée

14. Notifications silence en ‘quiet hours’

15. Paramètres sauvegardés offline

16. Composants inaccessibles inactifs désactivés

17. Icône badge LIVE animé en live

18. Barre nav accès rapide tabs fonctionnels

19. Recherche joueurs efficace (tri/filtre)

20. Gestion quota API: error propre

21. Taux crash <0.5%

22. Ads non affichées en live critique

23. Badge “new” sur features P1/P2 à rollout

24. Plug module analytics/trackers ok

25. Affichage “dernière maj” visible cache

26. Sécurité: clé API jamais côté client

### Edge Cases Critiques

* Free tier API épuisée (fallback cache, msg user)

* Data stats xG non dispo pour match/compétition/joueur

* Logo/cache image indisponible

* Perte réseau durant match live

* Notification d’unfollow pas supprimée backend

* Switch device (pas de recup suivis)

* Erreur parsing données / API changement

* Consentement pubs refusé (pas de tracking, UX OK)

* Réactivation d’un match fini (refresh data, page stable)

* Blocage bug langue (fallback EN)

### API-FOOTBALL Endpoints Mapping

* `GET /fixtures?date=...` — matches jour

* `GET /fixtures/events?fixture=...` — timeline

* `GET /fixtures/lineups?fixture=...` — compos

* `GET /fixtures/statistics?fixture=...` — stats avancées

* `GET /teams?league=...` — équipes compète

* `GET /players?team=...` — effectif/infos joueur

* `GET /standings?league=...` — classement

* `GET /players/topscorers?league=...` — buteurs

* `GET /players/topassists?league=...` — passeurs

### Data Models (TypeScript Simplifié)

```typescript
interface Match { id: string; homeTeam: Team; awayTeam: Team; datetime: Date; score: Score; events: Event\[\]; stats: StatBlock; }
interface Team { id: string; name: string; logo: string; country: string; squad: Player\[\]; fixtures: Match\[\]; }
interface Player { id: string; name: string; photo: string; position: string; team: Team; statsBySeason: StatBlock\[\]; }
interface Competition { id: string; name: string; country: string; logo: string; standings: Standing\[\]; fixtures: Match\[\]; }
interface Standing { team: Team; rank: number; points: number; form: string; goalsFor: number; goalsAgainst: number; xG: number; }
interface Event { type: 'GOAL'|'YELLOW'|'RED'|'SUB'; minute: number; player: Player; assist?: Player; }
interface FollowedPlayer { id: string; timestamp: number; }
interface NotificationPref { entityId: string; entityType: 'team'|'player'|'match'; enabled: boolean; quietHours?: \[string, string\]; }
```

### Mock data, localizations, ad/notification payloads

* Fourni sur demande selon feature (ex: `matches.filters.live`, notification FCM JSON, placement native ad wireframes, etc.)

---
