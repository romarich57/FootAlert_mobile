# QA visuelle guidée — Compétitions > Stats équipes

## Objectif
Valider la refonte de `Compétitions > Stats équipes` sur:
- petits écrans
- thème dark
- fluidité du scroll
- chargement lazy de la section avancée
- cohérence des états (loading, partiel, indisponible)

## Préflight technique (obligatoire)
Depuis `Mobile_Foot`:

```bash
npm run qa:competitions:team-stats:preflight
```

La passe visuelle ne démarre que si ce préflight est vert.

## Matrice de test manuelle
- Device A (petit écran): Android ~5.5" (ou iPhone SE/équivalent)
- Device B (écran standard): Android ~6.7" ou iPhone Pro Max
- Theme: Dark
- Orientation: Portrait
- Langues: FR puis EN

## Données de test recommandées
- Compétition/saison avec standings complets
- Compétition/saison où certaines métriques avancées manquent
- Compétition/saison où la section avancée renvoie peu/pas de données

## Checklist écran par écran

### 1) Navigation et entrée onglet
- [ ] Ouvrir `Compétitions` puis un détail compétition
- [ ] Aller sur l’onglet `Stats équipes`
- [ ] Vérifier présence des 3 sections: `Synthèse`, `Domicile / Extérieur`, `Avancé`
- [ ] Vérifier affichage stable (pas de saut visuel) à l’ouverture

### 2) Section Synthèse
- [ ] Chips métriques visibles et pressables
- [ ] Changer de métrique met à jour le chart sans glitch
- [ ] Valeurs formatées correctement:
  - `%` pour win rate
  - décimales pour métriques par match
  - entier pour indice de forme
- [ ] Classement top 10 cohérent (ordre selon métrique)

### 3) Section Domicile / Extérieur
- [ ] Toutes les chips home/away visibles
- [ ] Les deltas changent correctement quand on change de métrique
- [ ] Tri ascendant sur buts encaissés, descendant sur performances
- [ ] Les logos absents basculent vers fallback visuel propre

### 4) Section Avancé (lazy)
- [ ] Avant activation: bouton `Charger les stats avancées` visible
- [ ] Au clic: chargement local section avancée (pas de blocage global écran)
- [ ] État loading dédié visible pendant le fetch
- [ ] Si données partielles: message `Certaines métriques avancées sont indisponibles`
- [ ] Si aucune donnée exploitable: état indisponible clair
- [ ] Badge `Top 10 analysé` visible

### 5) Scroll et responsive
- [ ] Scroll vertical fluide du haut vers le bas sur petit écran
- [ ] Pas de clipping du texte/chips/cards
- [ ] Les bar charts restent lisibles et alignés
- [ ] Aucune zone interactive difficile à toucher (chips/bouton)

### 6) Thème et i18n
- [ ] En dark mode: contrastes lisibles (titres, chips, valeurs)
- [ ] Basculer FR -> EN: labels traduits, pas de texte dur
- [ ] Aucun overflow majeur après changement de langue

### 7) Non-régression compétition
- [ ] Onglets détail compétition toujours navigables
- [ ] `Totw` conditionnel inchangé
- [ ] Sélecteur saison continue de fonctionner

## Critères Go / No-Go
Go si:
- 0 bug bloquant
- 0 bug majeur UI/UX sur les 3 sections
- préflight technique vert

No-Go si:
- lazy load avancé bloque l’écran
- tri/format de métriques incorrect
- régression de navigation compétition

## Template de report rapide
```text
Contexte:
- Build/commit:
- Device:
- OS:
- Langue:
- Thème:

Résultat:
- Préflight: PASS/FAIL
- Checklist: PASS/FAIL

Bugs:
1) [Sévérité] [Écran] [Étapes] [Résultat attendu] [Résultat observé]
2) ...
```
