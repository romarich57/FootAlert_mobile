# A/B Test Plan - FootAlert

## Objectif

Ameliorer la conversion store (impression -> install) apres publication initiale des metadata.

## Sequence des tests

1. Screenshot #1 (impact le plus fort sur conversion)
2. Icone app (impact branding + CTR listing)
3. Short description Google Play (copy iteration)

Eviter les tests paralleles sur plusieurs variables pour garder une attribution claire.

## Test 1 - Screenshot #1

- **Hypothese**: un hero visuel "Live Scores + Follow Players" augmente la conversion.
- **Variant A (control)**: screenshot actuel.
- **Variant B**: screenshot avec promesse claire:
  - "Live Soccer Scores"
  - "Follow Teams & Players"
  - signal "No account required"
- **Metrique primaire**: CVR store listing.
- **Metriques secondaires**: CTR listing, installs absolues.
- **Duree cible**: 14 jours minimum ou seuil de significativite atteint.

## Test 2 - Icone

- **Hypothese**: une icone plus lisible avec contraste fort augmente le CTR.
- **Variant A (control)**: icone actuelle.
- **Variant B**: icone simplifiee, ballon + signal live, lisibilite petite taille.
- **Metrique primaire**: CTR listing.
- **Metrique secondaire**: CVR listing.
- **Duree cible**: 14 a 21 jours.

## Test 3 - Google short description

- **Hypothese**: une copy plus orientee benefice live + alerts augmente la conversion.
- **Variant A (control)**: short description actuelle.
- **Variant B**: version orientee action immediate (scores live + alerts).
- **Metrique primaire**: CVR listing Google.
- **Duree cible**: 14 jours.

## Guardrails

- Ne pas lancer un test en periode de panne API ou regression UX.
- Ne pas changer pricing/monetisation pendant un test de conversion listing.
- Logger date de debut/fin et contexte release.

## Template de resultat

- Test:
- Variable:
- Fenetre:
- Traffic A / B:
- CVR A / B:
- Delta:
- Significatif (oui/non):
- Decision:
- Next step:
