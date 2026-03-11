# Guide De Localisation Mobile

## Portée
- Runtime cible: `Mobile_Foot`
- Source canonique: anglais uniquement
- Langue cible existante à revalider: français
- Politique produit:
  - `released`: visible dans le sélecteur et éligible à l’auto-détection device
  - `hidden`: traduite mais non exposée produit
  - `coming_soon`: pipeline prêt, livraison produit bloquée tant que la traduction réelle n’est pas importée et validée

## Workflow Repo
1. Geler le corpus anglais pendant la vague.
2. Générer le pack source:
   - `npm run i18n:mobile:export`
3. Envoyer le CSV au vendor avec ce guide, le glossaire et les captures annotées.
4. Importer une langue:
   - `npm run i18n:mobile:import -- --language=es --input=<csv>`
5. Valider les locales:
   - `npm run i18n:mobile:validate`
   - `npm run i18n:mobile:validate -- --strict-all`
6. Changer le statut de la langue dans `src/shared/i18n/languages.ts` seulement après validation linguistique et QA UI.

## Fichiers Et Scripts
- Export CSV: `scripts/i18n/mobile-export-translations.ts`
- Import CSV vers modules TS: `scripts/i18n/mobile-import-translations.ts`
- QA de complétude: `scripts/i18n/mobile-validate-translations.ts`
- Registre des langues et disponibilité: `src/shared/i18n/languages.ts`

## Schéma CSV
Colonnes source exportées:
- `namespace`: `translation`, `common`, `matches`, `settings`, `teams`
- `key`: clé aplatie, par exemple `more.rows.language`
- `en`: texte anglais canonique
- `context`: contexte UI court
- `placeholders`: placeholders à préserver, séparés par `|`
- `notes`: contraintes produit
- `max_length`: contrainte de longueur si connue
- `screen_ref`: zone produit principale

Colonnes attendues à l’import:
- `namespace`
- `key`
- une colonne valeur cible parmi:
  - le code langue, par exemple `es`
  - `translation`
  - `target`

## Règles Traduction
- Ne jamais traduire les placeholders `{{count}}`, `{{home}}`, `{{away}}`, `{{opponent}}`, `{{value}}`.
- Ne jamais renommer les clés.
- Ne jamais traduire les données dynamiques API: noms d’équipes, joueurs, compétitions, stades, chaînes TV.
- Respecter les chaînes courtes sur:
  - tabs
  - badges
  - statuts
  - labels d’action
- Conserver les majuscules produit quand elles sont intentionnelles, par exemple `LIVE`.

## Glossaire Produit Football
- Match: utiliser le terme match local naturel, pas une paraphrase marketing.
- Fixture: traduire comme rencontre ou match planifié selon la langue.
- Lineup: composition
- Kick-off / Match start: coup d’envoi / début du match
- Full time / FT: fin du match / abréviation locale courte
- Extra time: prolongation
- Penalties: tirs au but
- Postponed: reporté
- Cancelled: annulé
- Suspended: suspendu
- Abandoned: arrêté
- Walkover: forfait
- Clean sheet: garder le terme football local le plus naturel, pas une traduction littérale générique
- Transfer: transfert
- Assist: passe décisive
- Red card / Yellow card: carton rouge / carton jaune

## Guide De Ton
- `en`: direct, compact, produit sportif.
- `fr`: naturel, mobile-first, éviter les formulations trop administratives.
- `es`, `pt`, `it`: privilégier le vocabulaire football local standard.
- `de`, `nl`, `pl`: compacter les labels, attention aux mots longs.
- `ja`, `ko`, `zh_CN`: éviter les translittérations inutiles si un terme UI naturel existe déjà.
- `ar`: produire la traduction complète, mais la langue reste `hidden` tant que le chantier RTL global n’est pas validé.
- `hi`, `bn`, `sw`, `id`, `vi`, `th`, `tr`, `ru`: viser la clarté produit avant la littéralité.

## Captures À Fournir Au Vendor
Captures annotées obligatoires:
- `matchDetails`
- `competitionDetails`
- `playerDetails`
- `teamDetails`
- `more`
- `follows`

Pour chaque capture, annoter:
- la zone UI
- la contrainte de place si elle est serrée
- les placeholders présents
- si le texte apparaît dans un bouton, une card, un chip, une modal ou un tab

## Politique De Release
- `en` reste la source canonique.
- `fr` reste livrée mais doit repasser dans le même pipeline QA.
- `ar` peut être importée et validée linguistiquement, mais reste `hidden` jusqu’au chantier `I18nManager`.
- Une langue ne passe en `released` que si:
  - le validateur ne remonte aucune clé manquante ou placeholder divergent
  - les namespaces source non vides ne sont pas vides dans la cible
  - la revue linguistique est validée
  - la QA screenshot mobile est validée

## Plan Par Vagues
- Vague 0:
  - freeze anglais
  - export CSV
  - glossaire
  - screenshots annotées
  - revue du français existant
- Vague 1:
  - `en`, `es`, `zh_CN`, `ar`, `pt`, `fr`, `id`, `ja`, `de`, `ru`
  - exposition produit après QA pour `es`, `zh_CN`, `pt`, `fr`, `id`, `ja`, `de`, `ru`
- Vague 2:
  - `it`, `tr`, `hi`, `ko`, `vi`, `th`, `pl`, `nl`, `sw`, `bn`
- Vague RTL:
  - activation produit de `ar` après validation globale RTL

## Vérifications Minimales Avant Merge
- `npm run typecheck`
- `npm test -- --runInBand src/shared/i18n`
- `npm run i18n:mobile:validate`
