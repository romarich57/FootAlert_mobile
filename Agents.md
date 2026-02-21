# Agents.md - Contexte & Règles de Développement

## 1. Contexte du Projet : FootAlert ⚽️

**FootAlert** est une application mobile **React Native** (iOS & Android) dédiée aux fans de football.
- **Objectif** : Fournir les scores en direct, calendriers, classements et statistiques (via **API-FOOTBALL**, source officielle : [https://dashboard.api-football.com/](https://dashboard.api-football.com/)) sans friction.
- **Particularités** :
    - **Pas de compte utilisateur** (No login).
    - **Favoris stockés en local** (Device storage).
    - **Notifications hybrides** (Push + Local).
    - **Monétisation** : Publicités uniquement.
    - **Multilingue** : FR / EN dès le départ.
    - **Base de données backend** : **PostgreSQL**.

## 2. Documents de Référence (IMPÉRATIF)

Tout développement ou conception DOIT respecter scrupuleusement les directives contenues dans ces deux fichiers :

1.  **Bonnes Pratiques Techniques (CODE OWNER)** :
    -   📁 `react-native-bonnes-pratiques.md`
    -   ⚠️ **Règle d'or** : Architecture Feature-First, Typage strict, React Query, React Hook Form + Zod, FlashList. Ce fichier fait loi sur la qualité du code.

2.  **Product Requirements Document (PRD)** :
    -   📁 `PRD_ FootScores Mobile App _React Native _ API-FOOTBALL_.md`
    -   Contient : Les fonctionnalités, le user flow, les règles de gestion (cache, notifications, pub).

## 3. Workflow d'Itération & Feedback

À chaque itération ou implémentation d'une fonctionnalité, l'Agent doit suivre ce processus :

1.  **Implémenter** la fonctionnalité ou le changement.
2.  **Créer un Feedback** :
    -   Créer un fichier Markdown dans le dossier `feedback/`.
    -   Nommage : `YYYY-MM-DD_Nom-Feature.md`.
    -   Contenu : Ce qui a été fait, les choix techniques, les difficultés rencontrées, ce qui reste à faire.
3.  **Mettre à jour ce fichier (`Agents.md`)** :
    -   Mettre à jour la section "État actuel du projet" ci-dessous si le périmètre ou le contexte global change.

---

## 4. État Actuel du Projet

*(Cette section doit être mise à jour par l'Agent à chaque évolution majeure)*

- **Phase actuelle** : Implémentation V1 de la page Matchs.
- **Dernière action** : Implémentation V1 complète de la page Suivis (onglets Equipes/Joueurs, recherche API dédiée, follow/unfollow persistant, tendances, cache/TTL, route FollowsSearch) + synchronisation immédiate avec l'onglet Matchs via rechargement des suivis au focus.
