# Bonnes pratiques React Native (code propre, scalable, performant, sécurisé)

> Objectif : une base **maintenable**, **réutilisable**, **testable**, **performante** et **sûre** pour une app iOS/Android en React Native.

---

## 1) Principes directeurs (à garder en tête tout le temps)

### 1.1 Single Responsibility partout
- **Un fichier = une responsabilité claire** (un composant UI, un hook, un service API, un modèle, etc.).
- Évite les fichiers “fourre-tout” (ex : `utils.ts` géant, `HomeScreen.tsx` de 1500 lignes).
- Si un fichier dépasse **200–300 lignes**, c’est souvent le signal qu’il faut **extraire** : sous-composants, hooks, helpers, services.

### 1.2 SOLID appliqué à React Native
**S — Single Responsibility**
- Composants UI simples, hooks dédiés, services isolés.

**O — Open/Closed**
- Ajouter des features sans modifier tout le code : via **composition**, **props**, **adapters**, **feature flags**.

**L — Liskov**
- Remplace un composant par un autre compatible sans casser : respecter le contrat des props, types stricts.

**I — Interface Segregation**
- Ne pas créer des props “géantes” ; préférer des **interfaces petites** et spécifiques.

**D — Dependency Inversion**
- Le code haut niveau (screens / use cases) dépend d’**abstractions** (ex : `AuthRepository`) plutôt que d’implémentations (`FirebaseAuth`/`Axios`).

---

## 2) Organisation de projet (structure recommandée)

### 2.1 Structure “data / ui layers” (scalable)

Le `src/` est organisé en deux couches distinctes :
- **`data/`** — tout ce qui touche aux données : API, storage, mappers, config
- **`ui/`** — tout ce qui touche à la présentation : écrans, composants, navigation, thème

Exemple :

```
src/
  data/                          # ← Couche données
    api/
      http/client.ts             #   Client HTTP (Axios/fetch)
    endpoints/
      matchesApi.ts              #   Points d’entrée API
    mappers/
      fixturesMapper.ts          #   DTO → Domain Model
    storage/
      asyncStorage.ts            #   Persistance locale
      secureStorage.ts           #   Stockage sécurisé (tokens)
    config/
      env.ts                     #   Variables d’environnement

  ui/                            # ← Couche présentation
    app/                         #   bootstrap, providers, navigation root
      App.tsx
      providers/
        QueryProvider.tsx
        ThemeProvider.tsx
      navigation/
        RootNavigator.tsx
        linking.ts               #   Deep linking config
        types.ts                 #   Global navigation types
    features/                    #   features organisées par domaine
      auth/
        components/
          LoginForm.tsx
        hooks/
          useLogin.ts
        screens/
          LoginScreen.tsx
        types/
          auth.types.ts
        schemas/                 #   Validation Zod
          loginSchema.ts
        index.ts                 #   exports publics de la feature
    shared/
      components/                #   composants UI génériques (Button, Card…)
      hooks/                     #   hooks réutilisables (useDebounce…)
      i18n/                      #   internationalisation
      theme/                     #   thème, couleurs, tokens

  shared/                        # ← Partagé entre data et ui
    constants.ts

  types/                         # Global ambient types (d.ts)
```

### 2.2 Aliases TypeScript

| Alias | Cible | Usage |
|---|---|---|
| `@data/*` | `src/data/*` | Imports couche données |
| `@ui/*` | `src/ui/*` | Imports couche présentation |
| `@/*` | `src/*` | Imports partagés (legacy) |

### 2.3 Naming & conventions
- Fichiers composants : `PascalCase.tsx` (ex : `MatchCard.tsx`)
- Hooks : `useXxx.ts` (ex : `useMatchDetails.ts`)
- Services : `xxxService.ts` / `xxxClient.ts`
- Types : `xxx.types.ts`
- Tests : `*.test.ts(x)`
- Exports : **explicites** (pas d’exports implicites cachés partout)

---

## 3) Règles de composants (UI) : “propre + réutilisable”

### 3.1 Composants “dumb” (présentation) vs “smart” (logique)
- **Présentation** : reçoit des props, affiche, aucun effet de bord.
- **Logique** : gère state/data, appelle hooks/services, compose des composants UI.

Ex :
- `MatchCard.tsx` (dumb)
- `MatchCardContainer.tsx` ou directement `MatchListScreen.tsx` (smart)

### 3.2 Composition > héritage
- Utilise des “slots” via `children`, des props de rendu (`renderItem`) et des composants composés.
- Évite les composants ultra-configurables incompréhensibles.

### 3.3 Props stables et petites
- 6–10 props max idéalement.
- Quand ça grossit : regrouper en objet typé (`match: Match`) + callbacks spécifiques.
- Évite les booléens multiples (`isA`, `isB`, `isC`) → préférer un `variant: 'A'|'B'|'C'`.

### 3.4 Styles : Un fichier Global & Thème
- **Fichier unique de style global** : Centralise tout le design system (couleurs, espacements, fonts) dans un seul fichier (ex: `src/shared/theme/theme.ts` ou `globalStyles.ts`).
  - *Pourquoi ?* Si tu veux changer le "bleu principal" ou la "police du titre", tu ne modifies qu'une seule ligne et toute l'app se met à jour.
- Utilise des variables/tokens : `colors.primary`, `spacing.m`, `fontSize.xl`.
- Évite les valeurs magiques (`#3498db`, `16px`) éparpillées dans les composants.

---

## 4) Navigation : Typée et Scalable (React Navigation)

### 4.1 Choix de la librairie
- **React Navigation** avec Native Stack (`createNativeStackNavigator`).
- C'est le standard performant et maintenable.

### 4.2 Typage Strict (Indispensable)
- Ne jamais utiliser `navigation.navigate('UnknownRoute')`.
- Centraliser les types dans `navigation/types.ts` :

```typescript
export type RootStackParamList = {
  Home: undefined;
  Details: { id: string; title?: string };
  Settings: undefined;
};

// Augmentation globale pour l'auto-complétion partout
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

### 4.3 Deep Linking
- Configurer `linking.ts` dès le début pour supporter les urls `myapp://details/123` et les Universal Links.

---

## 5) State management : règles simples qui évitent le chaos

### 5.1 Stratégie recommandée (pragmatique)
- **Server state** (API, cache) : `@tanstack/react-query`
- **Client/UI state global** (auth, thème) : `zustand` ou `redux-toolkit` (au choix)
- **State local** (inputs, toggles) : `useState`, `useReducer`

### 5.2 Séparer “données” et “UI”
- Exemple : `matchesQuery` (données) ≠ `isFilterOpen` (UI)
- Les données API ne vivent pas dans Redux si tu as React Query.

### 5.3 Un “Use Case” par action métier
- `useLogin()`, `useFollowTeam()`, `useUpdateProfile()`
- Le screen appelle le hook, le hook appelle les services.

---

## 6) Gestion des Formulaires (Performante & Clean)

### 6.1 React Hook Form
- Abandonner la gestion manuelle (`useState` par champ).
- Utiliser **`react-hook-form`** :
  - Uncontrolled components (meilleure perf, moins de re-renders).
  - Gestion facile des erreurs et du focus.

### 6.2 Validation Schema avec Zod
- Découpler la validation de l'UI.
- Utiliser **`zod`** (ou `yup`) pour définir le schéma.
- Inferrer les types TypeScript directement du schéma Zod (Single Source of Truth).

```typescript
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
type LoginFormInputs = z.infer<typeof loginSchema>;
```

---

## 7) Data fetching / API : propre et testable

### 7.1 Un client HTTP unique
- Un wrapper (ex : axios/fetch) dans `services/http/client.ts`
- Interceptors (auth, refresh token), timeouts, retry, logs, mapping d’erreurs.

### 7.2 DTO → Domain Model
- Ne pas propager les réponses brutes API partout.
- Mapper :
  - `MatchDto` (API) → `Match` (domaine)
- Avantage : tu peux changer l’API sans casser l’app.

### 7.3 Gestion d’erreurs cohérente
- Définir une hiérarchie simple :
  - `NetworkError`, `AuthError`, `ValidationError`, `UnknownError`
- UI : messages i18n + fallback clair + bouton “Réessayer”.

---

## 8) Performance : règles indispensables en mobile

### 8.1 Listes (Le nerf de la guerre)
- **FlashList (Shopify)** : Préférer `FlashList` à `FlatList` pour les listes longues ou complexes (recyclage de vues plus efficace).
- Toujours utiliser `estimatedItemSize`.
- Clés stables `keyExtractor`.
- Composants de liste `React.memo` si nécessaire.

### 8.2 Renders
- `useCallback`, `useMemo` **seulement** si utile (éviter l’optimisation prématurée), mais systématique pour les props passées des items de liste.
- Découper les écrans : header, body, footer.

### 8.3 Images
- Utiliser `expo-image` ou `react-native-fast-image` pour une gestion avancée du cache.
- Toujours définir `width/height`.
- Préférer des formats optimisés (WebP).

### 8.4 Animations
- Utiliser **`react-native-reanimated`** pour des animations 60 FPS exécutées sur le thread UI (Native).
- Éviter `Animated` API classique de React Native pour les animations complexes ou liées aux gestes.

### 8.5 Bundle & startup
- Activer Hermes (moteur JS optimisé).
- Lazy-load sur des écrans secondaires (require ou dynamic imports).

---

## 9) Sécurité (mobile) : pratiques essentielles

### 9.1 Secrets & configuration
- **Jamais** de secrets en dur dans le repo.
- Utiliser **`react-native-config`** (ou `expo-constants`) pour gérer les variables d'environnement (`.env.dev`, `.env.prod`).

### 9.2 Stockage
- Tokens sensibles : **Secure Storage** (Keychain iOS / Keystore Android) via `expo-secure-store` ou `react-native-keychain`.
- Éviter `AsyncStorage` pour les JWT ou mots de passe.

### 9.3 Auth robuste
- Access token court + refresh token.
- Rotation, révocation, détection d’anomalies.
- Gérer les erreurs 401 proprement (déconnexion automatique).

### 9.4 Réseau
- HTTPS obligatoire.
- Pinning TLS si besoin (selon niveau de menace).

### 9.5 Logs
- Pas de logs contenant email, token, téléphone en Prod.
- Utiliser un Logger custom qui filtre en Prod.

---

## 10) Tests & qualité (pour scaler sans régressions)

### 10.1 Pyramide de tests
- **Unit** : utils, mappers, hooks, logique métier (Jest).
- **Integration** : screens + providers + navigation partielle (React Native Testing Library).
- **E2E** : flows critiques (Maestro ou Detox). *Maestro est souvent plus simple à maintenir aujourd'hui.*

### 10.2 Lint, format, types
- TypeScript strict (`noImplicitAny: true`, `strictNullChecks: true`).
- ESLint + Prettier.
- Imports absolus : configurer les **Path Aliases** (`@/components/...`) pour éviter `../../../../components`.

### 10.3 CI/CD
- Pipeline minimum : lint -> typecheck -> tests -> build.
- Automatiser la génération de versions (Fastlane).

---

## 11) Patterns utiles (au-delà de SOLID)

### 11.1 MVVM “light”
- `Screen` = View
- `useXxxViewModel()` = logique + state dérivé + actions
- `Services/Repositories` = data access

### 11.2 Pattern "Compound Components"
- Pour les composants complexes (ex: Accordion, Modal via Context).

### 11.3 Error Boundaries
- Envelopper l'application (et les zones critiques) avec des `<ErrorBoundary>` pour ne pas crasher toute l'app sur une erreur JS mineure.
- Afficher un écran "Oups" sympa.

---

## 12) Developer Experience (DX)

- **Path Aliases** : Configurer `tsconfig.json` et babel pour utiliser `@data/`, `@ui/` et `@/` au lieu de chemins relatifs longs.
- **Flipper (si compatible)** ou **Reactotron** pour le debugging réseau/state.
- **Husky** : Pre-commit hooks pour empêcher le commit de code cassé (lint/test).

---

## 13) i18n : **tous les textes dans un seul fichier**

### 13.1 Objectif
- Aucun texte “en dur”.
- Ajouter une langue = dupliquer un fichier JSON/TS et traduire.

### 13.2 Structure simple
```
src/ui/shared/i18n/
  locales/
    fr.ts
    en.ts
  index.ts
```

### 13.3 Règles
- Clés stables : `auth.login.title`.
- Interpolation : `t('matches.kickoffAt', { time })`.
- Détecter langue système, persister le choix utilisateur.

### 13.4 Unités & Conversion (Séparer Stockage vs Affichage)
- **Stockage & Logique** : Toujours utiliser le système métrique/international standard (SI) dans le code et la DB (ex: mètres pour la taille, kg pour le poids).
- **Affichage (UI)** : Convertir les valeurs **uniquement au moment de l'affichage** via des helpers, selon la locale ou la préférence utilisateur.
  - Ex: `formatHeight(1.85)` -> affiche "1.85m" (FR) ou "6'1"" (US).
  - *Avantage* : Ton code reste propre et mathématiquement simple, seule la "vue" change.

---

## 14) Bonnes pratiques pour App Store / Play Store

### 14.1 Stabilité / qualité
- Zéro crash sur les parcours critiques.
- Gestion offline/erreur propre (messages clairs + retry).
- Temps de lancement rapide.

### 14.2 Conformité & confiance
- Privacy Policy claire.
- Consentement (Apple ATT, GDPR).
- Permissions demandées au juste moment (Just-in-time permissions).

### 14.3 ASO (App Store Optimization)
- Screenshots propres, lisibles, localisés.
- Vidéo de démo.
- Encourager les avis positifs au bon moment (après une action réussie).

---

## 15) Checklist rapide (à relire avant de ship)

### Code & architecture
- [ ] Feature-first respecté
- [ ] Zéro `any` dans le code
- [ ] Navigation entièrement typée
- [ ] Formulaires gérés via React Hook Form + Zod

### Performance
- [ ] Listes longues en FlashList
- [ ] Images optimisées (taille + cache)
- [ ] Pas de re-renders inutiles (profiling effectué)

### Sécurité
- [ ] Tokens dans secure storage
- [ ] API Keys via ENV vars (pas en dur)
- [ ] Logs sensibles nettoyés

### Store readiness
- [ ] Privacy policy / Permissions
- [ ] Screenshots à jour
- [ ] Testé en Release mode (pas seulement Debug)
- [ ] Gestion Offline vérifiée

---

## 16) Recommandation finale “scalable”

Si tu veux une base vraiment solide :
1. **Architecture Feature-first**.
2. **React Navigation typée** de bout en bout.
3. **React Query** pour le server state.
4. **React Hook Form + Zod** pour tous les inputs.
5. **FlashList + Reanimated** pour une UX fluide.
6. **Lint + Test + CI** dès le jour 1.

---

*Fin du document.*
