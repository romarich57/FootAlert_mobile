# ASO Package - FootAlert

Ce dossier centralise les metadonnees ASO de FootAlert pour Apple App Store et Google Play.

## Fichiers

- `docs/aso/metadata.json` : source unique des textes store EN-US et FR-FR.
- `docs/aso/ab-tests.md` : plan A/B test post-publication.
- `scripts/aso/validate-metadata.mjs` : validation locale des limites de caracteres.

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

## Process de publication metadata

1. Mettre a jour `docs/aso/metadata.json`.
2. Executer `npm run aso:validate`.
3. Ouvrir App Store Connect et Google Play Console.
4. Coller les champs par locale.
5. Lancer relecture QA linguistique finale.
6. Soumettre la version.

## Checklist operationnelle avant soumission

### Branding et identifiants

- Nom visible app = `FootAlert` (iOS + Android).
- IDs techniques prod = `com.footalert.app` (iOS + Android).
- Aucune occurrence publique de `Mobile_Foot`.

### Qualite metadata

- Validation locale OK (`npm run aso:validate`).
- Titre + short description alignes sur l'intent "live scores".
- EN-US et FR-FR presentes pour Apple et Google.
- Mots-cles Apple sans depassement de 100 caracteres.

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
