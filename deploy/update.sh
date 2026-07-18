#!/usr/bin/env bash
#
# Redéploiement d'une nouvelle version : git pull + rebuild backend/frontend + migrations +
# redémarrage du service. Ne régénère aucun secret, ne touche pas au catalogue de leçons
# (relancer `npm run content:import` séparément si le contenu pédagogique a changé).
#
# Usage : sudo ./update.sh
set -euo pipefail

APP_USER="${APP_USER:-gameapprendrereseau}"
APP_DIR="${APP_DIR:-/opt/game-apprendre-reseau}"
APP_REPO_DIR="$APP_DIR/app"
GAME_REPO_BRANCH="${GAME_REPO_BRANCH:-master}"

log() { echo -e "\n\033[1;32m==>\033[0m $*"; }

[ "$(id -u)" -eq 0 ] || { echo "Ce script doit être exécuté en root (sudo)." >&2; exit 1; }

export GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=accept-new"
git config --global --add safe.directory "$APP_REPO_DIR"

log "Récupération de la dernière version ($GAME_REPO_BRANCH)"
git -C "$APP_REPO_DIR" fetch origin
git -C "$APP_REPO_DIR" checkout "$GAME_REPO_BRANCH"
git -C "$APP_REPO_DIR" pull origin "$GAME_REPO_BRANCH"
chown -R "$APP_USER:$APP_USER" "$APP_REPO_DIR"

log "Backend : dépendances, build, migrations"
sudo -H -u "$APP_USER" bash -c "cd '$APP_REPO_DIR/backend' && npm ci && npx prisma generate && npm run build"
sudo -H -u "$APP_USER" bash -c "cd '$APP_REPO_DIR/backend' && npx prisma migrate deploy"

log "Frontend : dépendances, build"
sudo -H -u "$APP_USER" bash -c "cd '$APP_REPO_DIR/frontend' && npm ci && npm run build"

log "Redémarrage du service"
systemctl restart game-apprendre-reseau-backend
systemctl reload nginx

log "Mise à jour terminée. Statut :"
systemctl --no-pager status game-apprendre-reseau-backend | cat
