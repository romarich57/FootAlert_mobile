# Android Release Signing (FootAlert)

Le build `release` lit les variables suivantes :

- `FOOTALERT_UPLOAD_STORE_FILE`
- `FOOTALERT_UPLOAD_STORE_PASSWORD`
- `FOOTALERT_UPLOAD_KEY_ALIAS`
- `FOOTALERT_UPLOAD_KEY_PASSWORD`

Si une variable manque et qu'une tâche `release` est lancée, Gradle échoue immédiatement avec un message explicite.

## Configuration locale

Ajouter les propriétés dans `android/gradle.properties` local (non versionné) :

```properties
FOOTALERT_UPLOAD_STORE_FILE=../keystores/footalert-upload.jks
FOOTALERT_UPLOAD_STORE_PASSWORD=***
FOOTALERT_UPLOAD_KEY_ALIAS=footalert-upload
FOOTALERT_UPLOAD_KEY_PASSWORD=***
```

Ou injecter en variables d'environnement shell avant le build.

## Configuration CI

Déclarer les 4 secrets CI avec les mêmes noms `FOOTALERT_UPLOAD_*`, puis lancer :

```bash
cd android
./gradlew :app:assembleRelease
```

## Vérifications

- Sans variables: `./gradlew :app:assembleRelease` doit échouer (fail-fast signing).
- Avec variables valides: `./gradlew :app:assembleRelease` doit produire l'APK release signé.
