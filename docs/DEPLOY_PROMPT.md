# Prompt de déploiement homelab (à donner à un agent avec accès SSH + Docker)

> Copie tout ce bloc dans ton agent d'infra. Remplace d'abord les valeurs `<< … >>`.
> L'agent ne doit **jamais** committer de secret ni les logger.

---

Tu déploies l'application **mangetout** (dépôt public `https://github.com/PortableStick/mangetout`) sur mon homelab. Le homelab est la **source de vérité autoritaire**. Contexte infra :

- Docker + un **Traefik existant** (réseau externe : `<< TRAEFIK_NETWORK >>`, entrypoint HTTPS `websecure`, certresolver `<< TRAEFIK_CERTRESOLVER >>`).
- **Authelia** déjà en place comme provider OIDC (issuer `<< OIDC_ISSUER_URL >>`).
- Domaines : PocketBase sur `<< PB_HOST >>`, proxy IA sur `<< AI_HOST >>`.
- Répertoire de travail : `<< CHEMIN_DEPLOIEMENT >>`.
- Sauvegarde restic existante : dépôt `<< RESTIC_REPOSITORY >>`.

Architecture attendue : deux images **publiques** déjà publiées sur ghcr (amd64) —
`ghcr.io/portablestick/mangetout-pocketbase:latest` et `…/mangetout-ai-proxy:latest`.
Tout est décrit dans `infra/` du dépôt (docker-compose.yml, Dockerfile PocketBase, migration des collections, restic-backup.sh, README.md).

## Étapes

1. **Cloner** le dépôt dans `<< CHEMIN_DEPLOIEMENT >>` et `cd infra`.
2. **Créer `infra/.env`** depuis `../.env.example` et renseigner (NE PAS committer) :
   - `PB_HOST`, `AI_HOST`, `TRAEFIK_NETWORK`, `TRAEFIK_CERTRESOLVER`
   - `OPENROUTER_API_KEY` = `<< clé OpenRouter — je te la fournis hors dépôt >>` (+ vérifier qu'un plafond de dépense est posé sur le dashboard OpenRouter)
   - `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID=mangetout`, `OIDC_CLIENT_SECRET` = `<< secret Authelia >>`
   - `PB_SERVICE_TOKEN` = `<< à créer après le 1er lancement >>`
   - `RESTIC_REPOSITORY`, `RESTIC_PASSWORD`
3. **Enregistrer le client OIDC dans Authelia** : client `mangetout`, `authorization_code` + **PKCE**, redirect URI `https://<< PB_HOST >>/api/oauth2-redirect`. Récupérer le `client_secret` → `infra/.env`.
4. **Démarrer** : `docker compose pull && docker compose up -d`. Vérifier `docker compose logs -f pocketbase` (la migration crée 12 collections owner-only).
5. **Admin PocketBase** : `docker compose exec pocketbase pocketbase superuser create <email> <mdp>`.
6. **Configurer le provider OIDC dans PocketBase** (`https://<< PB_HOST >>/_/` → Settings → Auth providers → provider OIDC générique) : issuer, clientId `mangetout`, clientSecret. **Vérifie le nom exact du provider OIDC générique dans PocketBase 0.39.5** et communique-le moi (il doit correspondre à `EXPO_PUBLIC_OIDC_PROVIDER` de l'app).
7. **Compte de service coach** : créer un utilisateur/jeton PB dédié pour `PB_SERVICE_TOKEN`, owner-scopé.
8. **Sauvegarde** : planifier `infra/restic-backup.sh` en cron quotidien (voir `infra/README.md`), vérifier un `restic snapshots`.
9. **Vérifications finales** :
   - `curl https://<< PB_HOST >>/api/health` → ok.
   - `curl https://<< AI_HOST >>/api/health` → `{"status":"ok","aiConfigured":true}`.
   - Tester le flow OIDC (login navigateur → retour PocketBase).
   - Vérifier que l'admin PocketBase (`/_/`) n'est **pas** exposé publiquement sans protection (restreindre via Traefik/Authelia si possible).
   - Confirmer qu'une écriture cross-user est refusée (règles owner-only).

## Contraintes
- Zéro secret dans le dépôt, les logs ou l'historique. `infra/.env` reste local.
- Images épinglées/officielles uniquement. Ne modifie pas le schéma des collections sans passer par une migration versionnée.
- Rends un compte-rendu : URLs testées, nom exact du provider OIDC, points à surveiller.
