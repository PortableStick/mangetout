# infra — mangetout homelab

Le homelab est la **source de vérité autoritaire**. PocketBase (données, auth, fichiers) + un proxy IA (détient la clé OpenRouter) tournent derrière un **Traefik existant**.

## Composants
- **PocketBase 0.39.5** — construit depuis le binaire officiel (`pocketbase/Dockerfile`). Il n'existe pas d'image Docker officielle PocketBase → on build depuis la release GitHub, version épinglée. `pb_data` sur volume persistant.
- **ai-proxy** — sidecar Node (`../server`) qui détient la clé OpenRouter et expose `/api/ai/*`. L'app n'appelle jamais OpenRouter en direct.
- **Traefik** — TLS + routage + en-têtes de sécurité. Réseau externe supposé déjà présent.

## Prérequis (À FAIRE — humain)
1. Un réseau Docker Traefik externe (nom par défaut `traefik`, sinon régler `TRAEFIK_NETWORK`).
2. `cp ../.env.example ./.env` puis remplir **sur le homelab uniquement** (jamais committé) :
   - `OPENROUTER_API_KEY` (+ plafond de dépense + alertes sur le dashboard OpenRouter)
   - `PB_HOST`, `AI_HOST` (tes domaines), `TRAEFIK_CERTRESOLVER`, `TRAEFIK_NETWORK`
   - `RESTIC_REPOSITORY`, `RESTIC_PASSWORD`
3. Enregistrer le client OIDC `mangetout` dans **Authelia** (authorization_code + PKCE) → renseigner `OIDC_*`.

## Déploiement
```bash
cd infra
docker compose build            # build PocketBase (binaire épinglé) + ai-proxy
docker compose up -d
docker compose logs -f pocketbase
```
Au premier lancement, créer l'admin PocketBase via l'UI (`https://$PB_HOST/_/`) ou :
```bash
docker compose exec pocketbase pocketbase superuser create "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD"
```

## Auth OIDC (Authelia → PocketBase)
- PocketBase se configure comme **client OIDC générique** d'Authelia (Settings → Auth providers).
  ⚠️ Valider le **nom exact du provider OIDC générique** dans PocketBase 0.39.5 avant de câbler l'app (`EXPO_PUBLIC_OIDC_PROVIDER`).
- Redirect URL PocketBase : `https://$PB_HOST/api/oauth2-redirect`.
- Fallback : `AUTH_MODE=password` (auth email/mot de passe native PocketBase) pour 2-5 utilisateurs.

## Sauvegarde (restic → stockage distant)
`restic-backup.sh` fait une copie à froid du volume `pb_data` puis un `restic backup` taggé, avec rétention et `check`.
```bash
# cron quotidien (ex. 3h) sur le homelab :
0 3 * * *  /chemin/mangetout/infra/restic-backup.sh >> /var/log/mangetout-backup.log 2>&1
```
Restauration : `restic restore latest --target /tmp/restore` puis remonter le contenu dans le volume `pb_data` (conteneur arrêté).

## Migrations de schéma
`pocketbase/pb_migrations/` (montées en lecture) versionne les collections (voir Milestone 2). Appliquées automatiquement au démarrage de PocketBase.

## Sécurité (défensif)
- Aucun secret dans ce dossier committé (`.env` gitignoré).
- Règles d'accès PocketBase **owner-only** par collection (Milestone 2).
- Admin PocketBase non exposé publiquement (restreindre `/_/` via Traefik/Authelia si possible).
- En-têtes HSTS/nosniff/referrer posés via le middleware Traefik `mangetout-sec`.
