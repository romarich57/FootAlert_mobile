# Android Perf Baseline

Ce dossier contient la baseline officielle utilisee par `npm run perf:android:compare-baseline`.

Regles:
- `audit-summary.txt` doit provenir d'un audit benchmark valide, avec vraies metriques runtime et journey.
- `metadata.txt` doit decrire le commit, l'emulateur, `ANDROID_SERIAL`, la date et la commande utilisee.
- La baseline officielle doit etre regeneree uniquement sur un emulateur Android API 34 aligne CI.
- Une run locale diagnostique sur un autre device ne doit pas remplacer cette baseline.
