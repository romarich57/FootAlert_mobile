# QA visuelle guidée — SQLite local-first

## Objectif
Valider le gate final SQLite local-first sur Android et iOS avec:
- warm-up online
- rendu cold start depuis SQLite
- fallback offline cohérent
- background refresh déterministe via trigger debug
- preuve télémétrique exploitable

## Préflight technique (obligatoire)
Depuis `Mobile_Foot`:

```bash
npm run qa:sqlite-local-first:preflight
```

La passe manuelle ne démarre que si ce préflight est vert.

## Pré requis
- [ ] Build debug Android et build debug iOS disponibles
- [ ] BFF démarré et joignable depuis l'app
- [ ] Flags actifs dans le build:
  - [ ] `mobileEnableSqliteLocalFirst`
  - [ ] `mobileEnableBffTeamFull`
  - [ ] `mobileEnableBffPlayerFull`
  - [ ] `mobileEnableBffCompetitionFull`
  - [ ] `mobileEnableBffMatchFull`
- [ ] Moyen de couper le réseau rapidement (mode avion, simulateur, proxy, ou Wi-Fi off)
- [ ] Logs/télémétrie consultables pendant le test
- [ ] Device menu développeur accessible

## Matrice minimale
- [ ] Android debug
- [ ] iOS debug
- [ ] Langue FR
- [ ] Langue EN

## Événements attendus
- [ ] `db.bootstrap.complete`
- [ ] `db.hydration.complete`
- [ ] `db.local_first.read`
- [ ] `background.refresh.registered`
- [ ] `background.refresh.completed`
- [ ] `background.refresh.skipped` quand l'OS ne donne pas la main
- [ ] `db.gc.complete`
- [ ] Absence de `db.sqlite_write.failed`

## Scénarios bloquants

### 1. Warm-up online puis cold start offline
- [ ] Ouvrir online la home matches du jour
- [ ] Ouvrir online un détail `team`
- [ ] Ouvrir online un détail `player`
- [ ] Ouvrir online un détail `competition`
- [ ] Ouvrir online un détail `match`
- [ ] Fermer complètement l'app
- [ ] Couper le réseau
- [ ] Relancer l'app
- [ ] Vérifier que les surfaces déjà visitées s'affichent immédiatement depuis SQLite
- [ ] Vérifier que la liste des matchs du jour s'affiche au cold start sans attente réseau

### 2. Warm-cache offline
- [ ] Avec le réseau toujours coupé, revisiter les surfaces réchauffées
- [ ] Vérifier le rendu immédiat
- [ ] Vérifier la bannière/état offline attendu
- [ ] Vérifier l'absence de crash, boucle de retry visible, ou écran vide

### 3. Offline sans cache
- [ ] Supprimer les données locales ou utiliser une entité jamais visitée
- [ ] Couper le réseau
- [ ] Ouvrir un détail non préchauffé
- [ ] Vérifier l'état `offline/no-cache` correct

### 4. Prefetch avant navigation
- [ ] Revenir online
- [ ] Déclencher un parcours qui fait le prefetch avant navigation
- [ ] Couper ensuite le réseau
- [ ] Ouvrir la destination déjà préfetchée
- [ ] Vérifier que la lecture offline suivante utilise bien SQLite

### 5. Trigger debug background refresh
- [ ] Ouvrir le menu développeur
- [ ] Lancer `Run SQLite Background Refresh`
- [ ] Vérifier l'émission de `background.refresh.debug_triggered`
- [ ] Vérifier une exécution complète du pipeline réel: prefetch, persistence SQLite, GC, telemetry
- [ ] Vérifier `background.refresh.completed`
- [ ] Vérifier `db.gc.complete`

## Scénarios smoke complémentaires

### 6. Enregistrement natif de la tâche
- [ ] Android: vérifier que la tâche est enregistrée
- [ ] iOS: vérifier que la tâche est enregistrée
- [ ] Confirmer `background.refresh.registered`

### 7. Scheduling OS natif
- [ ] Laisser l'app dans un état compatible avec le refresh
- [ ] Tenter une observation d'exécution native si l'OS la déclenche pendant la session
- [ ] Si aucune exécution native n'arrive pendant la session, accepter la preuve combinée:
  - [ ] `background.refresh.registered`
  - [ ] `background.refresh.skipped` documenté si l'OS refuse ou diffère l'exécution
  - [ ] le trigger debug couvre la preuve fonctionnelle bloquante

## Go / No-Go
Go si:
- [ ] préflight vert
- [ ] Android validé
- [ ] iOS validé
- [ ] rendu offline instantané confirmé après un seul warm-up online
- [ ] background refresh debug confirmé
- [ ] doc et télémétrie cohérentes

No-Go si:
- [ ] une surface préchauffée ne relit pas SQLite au cold start
- [ ] un état offline/no-cache est incohérent
- [ ] `db.sqlite_write.failed` apparaît
- [ ] le trigger debug ne parcourt pas le pipeline réel

## Template de report
```text
Contexte:
- Build/commit:
- Plateforme:
- Device:
- OS:
- Langue:

Résultat:
- Préflight: PASS/FAIL
- Checklist: PASS/FAIL

Observabilité:
- Events vus:
- Events manquants:

Bugs:
1) [Sévérité] [Surface] [Étapes] [Attendu] [Observé]
2) ...
```
