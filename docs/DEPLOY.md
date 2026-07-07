# Déploiement mangetout

Trois étapes : **(1)** publier les images sur ghcr, **(2)** déployer le serveur sur le homelab, **(3)** produire l'APK. Choix retenus : **amd64**, images **publiques**, auth **OIDC (Authelia)**, APK via **CI EAS**.

---

## Valeurs à renseigner (tes infos privées — jamais committées)

Toutes dans `infra/.env` sur le homelab (copie de `.env.example`), sauf indication.

| Variable | Où | Exemple / note |
|---|---|---|
| `PB_HOST` | infra/.env | `pb.tondomaine.fr` |
| `AI_HOST` | infra/.env | `ai.tondomaine.fr` |
| `TRAEFIK_NETWORK` | infra/.env | nom de ton réseau Traefik externe (ex. `traefik`) |
| `TRAEFIK_CERTRESOLVER` | infra/.env | ex. `letsencrypt` |
| `OPENROUTER_API_KEY` | infra/.env | **secret** — dashboard OpenRouter, + plafond de dépense |
| `OIDC_ISSUER_URL` | infra/.env | `https://auth.tondomaine.fr` |
| `OIDC_CLIENT_SECRET` | infra/.env | **secret** — généré côté Authelia |
| `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD` | 1er lancement | admin PocketBase |
| `PB_SERVICE_TOKEN` | infra/.env | jeton PB pour les actions coach (créer un compte de service) |
| `RESTIC_REPOSITORY` / `RESTIC_PASSWORD` | infra/.env | **secrets** — ta Storage Box Hetzner |
| `EXPO_PUBLIC_PB_URL` / `EXPO_PUBLIC_AI_URL` | `app/eas.json` | `https://pb.…` / `https://ai.…` (non secret) |
| `EXPO_TOKEN` | **secret GitHub** (repo → Settings → Secrets) | Expo → Access Tokens |

---

## 1. Publier les images (ghcr.io)
Les images se construisent et se poussent **automatiquement** via GitHub Actions (`.github/workflows/build-images.yml`) à chaque push sur `main`, avec le `GITHUB_TOKEN` intégré (aucun secret requis).
- Vérifie que **Actions est activé** sur le repo, puis pousse sur `main` (ou lance le workflow manuellement : onglet Actions → build-images → Run).
- Rends les packages **publics** : repo → Packages → `mangetout-pocketbase` / `mangetout-ai-proxy` → Package settings → Change visibility → Public.
- Résultat : `ghcr.io/portablestick/mangetout-pocketbase:latest` et `…/mangetout-ai-proxy:latest`.

## 2. Déployer sur le homelab
Donne le prompt `docs/DEPLOY_PROMPT.md` à un agent ayant accès à ton homelab (SSH + Docker), **ou** fais-le à la main :
```bash
git clone https://github.com/PortableStick/mangetout && cd mangetout/infra
cp ../.env.example .env   # remplir le tableau ci-dessus
docker compose pull        # tire les images publiques ghcr
docker compose up -d
# 1er lancement : créer l'admin PocketBase
docker compose exec pocketbase pocketbase superuser create "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD"
```
La migration (`infra/pocketbase/pb_migrations/`) crée les 12 collections owner-only au démarrage.

### OIDC (Authelia) — étapes spécifiques
1. **Authelia** : enregistrer un client OIDC `mangetout` (authorization_code + PKCE), noter le `client_secret` → `infra/.env`.
   Redirect URL PocketBase : `https://$PB_HOST/api/oauth2-redirect`.
2. **PocketBase** (`https://$PB_HOST/_/` → Settings → Auth providers) : activer le provider **OIDC générique**, renseigner issuer/clientId/clientSecret. ⚠️ Vérifier le **nom exact** du provider dans PocketBase 0.39.5 et le reporter dans `EXPO_PUBLIC_OIDC_PROVIDER` (`app/eas.json`).
3. Sauvegarde : planifier `infra/restic-backup.sh` en cron (voir `infra/README.md`).

## 3. Produire l'APK
**Option A — CI (retenue).**
1. `cd app && npx eas init` une fois (crée le `projectId`, à committer — non secret).
2. Ajoute le secret GitHub `EXPO_TOKEN`.
3. Mets tes vraies URLs dans `app/eas.json` (`EXPO_PUBLIC_PB_URL`, `EXPO_PUBLIC_AI_URL`, `EXPO_PUBLIC_OIDC_PROVIDER`).
4. Actions → **build-apk** → Run (ou pousse un tag `vX`). L'APK sort en **artefact** téléchargeable.
> EAS gratuit = quota mensuel + file d'attente. Suffisant pour un usage perso occasionnel.

**Option B — 100 % gratuit, en local** (nécessite Android SDK + JDK) :
```bash
cd app
npx expo prebuild --platform android
npx expo run:android --variant release   # ou : cd android && ./gradlew assembleRelease
# APK généré : app/android/app/build/outputs/apk/release/app-release.apk
```

## Ordre recommandé
Décider les domaines → **2** (homelab en service) → renseigner les URLs dans `eas.json` → **3** (APK pointant sur le vrai backend).
