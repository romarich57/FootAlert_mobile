# Store Assets Manifest

Ce dossier versionne les visuels de publication stores utilisés pour App Store Connect et Google Play.

## Structure

- `apple/en-US/*`
- `apple/fr-FR/*`
- `google/en-US/*`
- `google/fr-FR/*`
- `manifest.json` (source de vérité pour validation automatique)

## Contraintes couvertes

- Apple:
  - iPhone 6.7"
  - iPhone 5.5"
  - iPad 12.9"
- Google:
  - screenshots phone (min 2)
  - feature graphic `1024x500`

## Validation

Utiliser:

```bash
npm run aso:validate:assets
```

Le script vérifie:
- présence de chaque fichier déclaré
- dimensions exactes
- conformité au `manifest.json`

