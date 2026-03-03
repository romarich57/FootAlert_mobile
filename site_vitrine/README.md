# FootAlert Site Vitrine

Site vitrine premium pour FootAlert, isolé du client `web/` existant.

## Objectifs

- Présenter l’app mobile avec un rendu professionnel et animé.
- Exposer les pages légales publiques:
  - `/legal/privacy`
  - `/legal/terms`
- Afficher les scores du jour (scores uniquement) via `GET /v1/matches`.
- Fournir des pages support/social directement utilisables par l’app mobile.

## Stack

- React 19 + Vite + TypeScript
- React Router
- React Query
- Framer Motion
- Vitest + Testing Library
- Playwright (smoke E2E)

## Arborescence

- `src/app`: router + layout
- `src/pages`: pages publiques
- `src/features/scores`: API/mapper/composants des scores
- `src/features/tutorials`: contenu tutoriels statique
- `src/styles`: tokens, animations, styles globaux
- `public`: assets SEO (`robots.txt`, `sitemap.xml`, `og-image.png`)
- `nginx`: config Nginx interne conteneur

## Variables d'environnement

Copier `.env.example` en `.env` si nécessaire:

```bash
cp .env.example .env
```

Variables:

- `VITE_BFF_BASE_URL` (default `https://api.footalert.romdev.cloud/v1`)
- `VITE_SUPPORT_EMAIL`
- `VITE_X_URL`
- `VITE_INSTAGRAM_URL`
- `VITE_LINKEDIN_URL`

## Exécution locale

```bash
npm install
npm run dev
```

URL: `http://localhost:4173`

## Build production

```bash
npm run build
npm run preview
```

## Tests

```bash
npm run test
npm run test:e2e
```

## Docker

### Build + run via compose

```bash
docker compose up -d --build
```

Le conteneur expose `127.0.0.1:8080`.

### Health quick check

```bash
curl -I http://127.0.0.1:8080
```

## Nginx host (reverse proxy VPS)

Créer deux vhosts côté serveur.
Des exemples prêts à copier sont fournis:

- `nginx/footalert.romdev.cloud.conf`
- `nginx/api.footalert.romdev.cloud.conf`
- `nginx/security-headers.conf`

### `/etc/nginx/sites-available/footalert.romdev.cloud`

```nginx
server {
  listen 80;
  server_name footalert.romdev.cloud;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### `/etc/nginx/sites-available/api.footalert.romdev.cloud`

```nginx
server {
  listen 80;
  server_name api.footalert.romdev.cloud;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Puis:

```bash
sudo ln -s /etc/nginx/sites-available/footalert.romdev.cloud /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.footalert.romdev.cloud /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## HTTPS Let’s Encrypt

Pré-requis DNS:

- `footalert.romdev.cloud` -> IP VPS
- `api.footalert.romdev.cloud` -> IP VPS

Installer certbot:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

Générer certificats:

```bash
sudo certbot --nginx -d footalert.romdev.cloud -d api.footalert.romdev.cloud
```

Vérifier auto-renew:

```bash
sudo certbot renew --dry-run
```

## Headers sécurité Nginx (vhosts HTTPS)

Ajouter dans les blocs `server` HTTPS:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.footalert.romdev.cloud; script-src 'self';" always;
```

## Runbook validation finale

```bash
curl -I https://footalert.romdev.cloud
curl -I https://footalert.romdev.cloud/legal/privacy
curl -I https://footalert.romdev.cloud/legal/terms
curl -s https://api.footalert.romdev.cloud/health
```

## Intégration mobile/BFF

URLs à aligner:

- `MOBILE_PRIVACY_POLICY_URL=https://footalert.romdev.cloud/legal/privacy`
- `MOBILE_TERMS_OF_USE_URL=https://footalert.romdev.cloud/legal/terms`
- `MOBILE_SUPPORT_URL=https://footalert.romdev.cloud/support`
- `MOBILE_FOLLOW_US_URL=https://footalert.romdev.cloud/social`
- `MOBILE_API_BASE_URL=https://api.footalert.romdev.cloud/v1`
- `WEB_APP_ORIGIN=https://footalert.romdev.cloud`
- `CORS_ALLOWED_ORIGINS=https://footalert.romdev.cloud`
