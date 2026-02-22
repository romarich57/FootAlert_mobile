# ASO Package - FootAlert

Ce dossier centralise les metadonnees ASO de FootAlert pour Apple App Store et Google Play.

## Fichiers

- `docs/aso/metadata.json` : source unique des textes store EN-US et FR-FR.
- `docs/aso/ab-tests.md` : plan A/B test post-publication.
- `docs/aso/positioning.md` : stratégie de positionnement/catégories (Apple + Google).
- `docs/aso/assets/` : assets store versionnés (screenshots + feature graphic).
- `scripts/aso/validate-metadata.mjs` : validation locale des limites de caracteres.
- `scripts/aso/validate-assets.mjs` : validation présence/dimensions des assets store.
- `scripts/aso/validate-icon-ios.mjs` : validation AppIcon iOS (slots + dimensions).

## Mapping des champs vers consoles store

### Apple App Store Connect

- `apple.<locale>.title` -> App Name (max 30)
- `apple.<locale>.subtitle` -> Subtitle (max 30)
- `apple.<locale>.promotional_text` -> Promotional Text (max 170)
- `apple.<locale>.keywords` -> Keywords (max 100)
- `apple.<locale>.description` -> Description (max 4000)

### Google Play Console

- `google.<locale>.title` -> App name (max 50)
- `google.<locale>.short_description` -> Short description (max 80)
- `google.<locale>.full_description` -> Full description (max 4000)
- `store_strategy.apple.primary_category` -> Primary Category (`SPORTS`)
- `store_strategy.google.category` -> Google Play category (`SPORTS`)

## Process de publication metadata

1. Mettre a jour `docs/aso/metadata.json`.
2. Mettre a jour `docs/aso/assets/` si la release impacte les captures.
3. Executer `npm run aso:validate`.
4. Ouvrir App Store Connect et Google Play Console.
5. Coller les champs par locale.
6. Lancer relecture QA linguistique finale.
7. Soumettre la version.

## Checklist operationnelle avant soumission

### Branding et identifiants

- Nom visible app = `FootAlert` (iOS + Android).
- IDs techniques prod = `com.footalert.app` (iOS + Android).
- Aucune occurrence publique de `Mobile_Foot`.

### Qualite metadata

- Validation locale OK (`npm run aso:validate`).
- Titre + short description alignes sur l'intent "live scores".
- EN-US et FR-FR presentes pour Apple et Google.
- Mots-cles Apple sans depassement de 100 caracteres, sans doublons et sans overlap title/subtitle.
- `store_strategy` present et aligne avec le positionnement Sports.
- Assets store complets (Apple 6.7 / 5.5 / iPad 12.9 + Google screenshots + feature graphic).

### Release readiness

- `npm run lint` OK
- `npm run typecheck` OK
- `npm test` OK

### Provisioning / certificats

- Verifier que l'App ID `com.footalert.app` existe cote Apple Developer.
- Verifier keystore / signing config Android pour `com.footalert.app`.
- Regenerer provisioning profiles iOS si necessaire.

## Note importante

Le nom interne de projet Xcode/Gradle peut rester inchange. Le scope vise le nom public, les IDs prod, et le package ASO versionne.
