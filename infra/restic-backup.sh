#!/usr/bin/env bash
# Sauvegarde déportée de pb_data (PocketBase) via restic.
# À brancher sur la chaîne restic existante (ex. Hetzner Storage Box) via cron.
# Secrets (RESTIC_REPOSITORY, RESTIC_PASSWORD) lus depuis infra/.env — JAMAIS committés.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Charge l'environnement (infra/.env, gitignoré)
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY manquant (infra/.env)}"
: "${RESTIC_PASSWORD:?RESTIC_PASSWORD manquant (infra/.env)}"

VOLUME="${PB_DATA_VOLUME:-mangetout_pb_data}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

echo "[restic] snapshot cohérent de pb_data ($VOLUME) -> $STAGING"
# Copie à froid via un conteneur alpine qui monte le volume (évite d'écrire pendant un checkpoint DB).
docker run --rm \
  -v "${VOLUME}:/data:ro" \
  -v "${STAGING}:/backup" \
  alpine:3.20 sh -c "cp -a /data/. /backup/"

echo "[restic] init dépôt si absent"
restic snapshots >/dev/null 2>&1 || restic init

echo "[restic] backup"
restic backup "$STAGING" \
  --tag mangetout --tag pocketbase --tag "$STAMP" \
  --host mangetout-homelab

echo "[restic] rétention (7 quotidiennes, 4 hebdo, 6 mensuelles)"
restic forget --prune \
  --keep-daily 7 --keep-weekly 4 --keep-monthly 6 \
  --tag mangetout

echo "[restic] vérification rapide"
restic check --read-data-subset=5%

echo "[restic] OK ($STAMP)"
