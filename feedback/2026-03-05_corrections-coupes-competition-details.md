# Feedback - Corrections Compétitions (Coupes + TOTW)

Date: 2026-03-05

## Ce qui a été fait

- Corrigé l'affichage TOTW:
  - Suppression du badge logo club superposé sur les joueurs.
  - La carte TOTW affiche désormais uniquement la photo joueur (ou fallback initiales).
  - Alignement des props et tests (`PitchFormation`, `CompetitionTotwTab`, `CompetitionDetailsScreen`).

- Corrigé la logique d'onglets pour les compétitions de coupe:
  - Ajout d'une logique dynamique dans `useCompetitionDetailsScreenModel` basée sur `competitionKind` (bracket endpoint).
  - Masquage de l'onglet `teamStats` pour les compétitions `cup` (fallback demandé quand stats non disponibles).
  - Renommage dynamique de l'onglet `standings` en `bracket` pour les compétitions `cup`.
  - Fallback d'onglet actif: si un onglet devient indisponible, bascule automatique vers le premier onglet disponible.

- Corrigé le tri des matchs pour les coupes:
  - Remplacement du tri naïf par extraction d'un nombre brut (`/\d+/`) par un parsing de round multi-formats.
  - Prise en charge des formats coupe FR/EN:
    - `Round of X`, `Last X`, `1/X`, `Xth Finals`, `Xe de finale`, `Quarter`, `Semi`, `Final`.
  - Tri round ascendant rendu cohérent avec les compétitions à élimination directe (tours précoces -> finale).
  - Ajout de test dédié pour vérifier l'ordre des rounds de coupe.

- Amélioration du mapping et affichage des rounds:
  - `formatMatchRound` enrichi pour traductions cohérentes des rounds 16/32/64/128/256.
  - `KnockoutBracketView` corrigé pour éviter la fausse détection `final` sur des rounds comme `8th Finals`.
  - Ajout de clés i18n FR/EN:
    - `competitionDetails.tabs.bracket`
    - rounds supplémentaires (`roundOf32/64/128/256`, `round_of_64/128/256`)
    - libellés de tri round généricisés (non limités à "Journée").

- Renforcement backend bracket (BFF):
  - Refactor de `bracketMapper` avec normalisation des rounds et parsing robuste FR/EN.
  - Détection de type de compétition (`league`/`cup`/`mixed`) plus fiable sur les coupes.
  - Ordonnancement des rounds knockout amélioré pour tableaux étendus.
  - Tests unitaires enrichis (classification et ordre des rounds de coupe).

## Choix techniques

- Conserver la clé d'onglet `standings` côté code pour limiter l'impact, mais surcharger dynamiquement son label (`bracket`) selon le type de compétition.
- Utiliser `useCompetitionBracket` comme signal principal pour le comportement "coupe vs championnat".
- Implémenter un parser round localement là où nécessaire (tri matchs, affichage bracket, formatting) pour sécuriser rapidement le comportement utilisateur attendu.

## Difficultés rencontrées

- Variabilité des formats round API-FOOTBALL selon compétitions/pays/langues (EN/FR + conventions historiques).
- Risque de faux positifs autour du mot `final` (ex: `8th Finals`) qui cassait la lisibilité du bracket.
- Exécution du script test BFF via `npm run test` bloquée par un `pretest` qui tente d'écrire hors zone sandbox; contourné avec exécution directe Node test.

## Ce qu'il reste à faire

- Optionnel: factoriser le parsing de round dans un util partagé unique pour éviter la duplication front/BFF.
- Optionnel: ajouter des tests UI dédiés pour `KnockoutBracketView` sur rounds FR (`16e`, `8e`, etc.).
- Optionnel: étendre la logique de masquage d'onglet à d'autres cas de données indisponibles hors compétitions `cup` si besoin produit.
