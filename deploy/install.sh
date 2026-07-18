#!/usr/bin/env bash
#
# Installation automatisée de game-apprendre-RESEAU sur une VM Linux vierge (Ubuntu 22.04/24.04
# LTS). Installe et configure : Docker (MariaDB en conteneur uniquement — ce cours ne sandboxe
# rien), Node.js, nginx, systemd, ufw.
#
# Différence avec game-apprendre-CS/game-apprendre-BDD : AUCUN microservice de correction à
# installer/brancher — ce cours ne nécessite aucune exécution de code (comparaison texte pure,
# voir README § Différence architecturale). Le vhost nginx doit être joignable par les
# navigateurs des étudiants (pas seulement par un backend applicatif), donc le port web est
# ouvert largement dans le pare-feu, contrairement au port du correction-agent SQL/C# sur la
# VM voisine (172.28.9.202 elle-même, dans le cas du BDD/C#), restreint à l'IP appelante.
#
# Usage :
#   sudo SEED_ADMIN_EMAIL="admin@ecole.fr" ./install.sh
#
# Script réexécutable sans effet destructif (idempotent) : les secrets déjà générés ne sont
# jamais régénérés, `git clone` devient `git pull` si le dépôt existe déjà.
set -euo pipefail

# ============================================================================
# Configuration (surchageable via variables d'environnement)
# ============================================================================
APP_USER="${APP_USER:-gameapprendrereseau}"
APP_DIR="${APP_DIR:-/opt/game-apprendre-reseau}"
GAME_REPO_URL="${GAME_REPO_URL:-git@github.com:sbrodetLJB/game-apprendre-RESEAU.git}"
CONTENT_REPO_URL="${CONTENT_REPO_URL:-git@github.com:sbrodetLJB/apprendre-les-bases-de-reseau.git}"
GAME_REPO_BRANCH="${GAME_REPO_BRANCH:-master}"

DOMAIN="${DOMAIN:-}"                     # ex. "reseau.mon-ecole.fr" — vide = HTTP sur l'IP seule
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"       # requis si DOMAIN est fourni

SEED_ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-}" # requis — compte admin réel créé au premier démarrage

NODE_MAJOR="${NODE_MAJOR:-22}"

BACKEND_PORT="${BACKEND_PORT:-4103}"
MYSQL_PORT="${MYSQL_PORT:-3306}"

log() { echo -e "\n\033[1;32m==>\033[0m $*"; }
warn() { echo -e "\033[1;33m[avertissement]\033[0m $*" >&2; }
die() { echo -e "\033[1;31m[erreur]\033[0m $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Ce script doit être exécuté en root (sudo)."
[ -n "$SEED_ADMIN_EMAIL" ] || die "SEED_ADMIN_EMAIL est requis."
if [ -n "$DOMAIN" ] && [ -z "$CERTBOT_EMAIL" ]; then
  die "CERTBOT_EMAIL est requis quand DOMAIN est fourni (Let's Encrypt en a besoin)."
fi

# shellcheck disable=SC1091
. /etc/os-release 2>/dev/null || die "Impossible de lire /etc/os-release — ce script cible Ubuntu 22.04/24.04 LTS."
case "${VERSION_CODENAME:-}" in
  jammy|noble) ;;
  *) warn "Codename '${VERSION_CODENAME:-inconnu}' non testé. Poursuite tout de même." ;;
esac

APP_REPO_DIR="$APP_DIR/app"
CONTENT_REPO_DIR="$APP_DIR/content/apprendre-les-bases-de-reseau"
SECRETS_DIR="$APP_DIR/secrets"
DEPLOY_DIR="$APP_REPO_DIR/deploy"

# ============================================================================
# 1. Paquets système de base
# ============================================================================
log "Mise à jour des paquets et installation des prérequis système"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg git ufw nginx mariadb-client openssl

# ============================================================================
# 2. Docker Engine (MariaDB en conteneur uniquement — rien à sandboxer ici)
# ============================================================================
if ! command -v docker >/dev/null 2>&1; then
  log "Installation de Docker Engine"
  install -m 0755 -d /etc/apt/keyrings
  if [ ! -f /etc/apt/keyrings/docker.asc ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
  fi
  if [ ! -f /etc/apt/sources.list.d/docker.list ]; then
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" \
      > /etc/apt/sources.list.d/docker.list
  fi
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
else
  log "Docker déjà installé, on passe."
fi

# ============================================================================
# 3. Node.js
# ============================================================================
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/^v//;s/\..*//')" -lt "$NODE_MAJOR" ]; then
  log "Installation de Node.js $NODE_MAJOR.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - >/dev/null
  apt-get install -y -qq nodejs
else
  log "Node.js déjà installé ($(node -v)), on passe."
fi

# ============================================================================
# 4. Utilisateur applicatif dédié — pas de groupe docker (rien à sandboxer, l'app ne lance
# jamais `docker run` elle-même : le conteneur MariaDB est géré par root via docker compose).
# ============================================================================
if ! id "$APP_USER" >/dev/null 2>&1; then
  log "Création de l'utilisateur système $APP_USER"
  useradd --system --create-home --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
fi

mkdir -p "$APP_DIR" "$SECRETS_DIR" "$APP_DIR/content"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
# useradd --create-home laisse $APP_DIR en 750 (accès refusé aux "autres") : nginx (www-data)
# a besoin de le traverser pour servir frontend/dist. secrets/ reste protégé par ses fichiers
# en 600, indépendamment de ce +x sur le répertoire parent.
chmod o+x "$APP_DIR"

# ============================================================================
# 5. Récupération du code (dépôt applicatif + dépôt de contenu pédagogique)
# ============================================================================
export GIT_TERMINAL_PROMPT=0
export GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=accept-new"
# Nécessaire dès la 2e exécution : après le premier `chown -R "$APP_USER"` ci-dessous, ce
# dépôt appartient à un autre utilisateur que root, ce que git refuse par défaut (ownership
# dubious) quand ce script tourne à nouveau.
git config --global --add safe.directory "$APP_REPO_DIR"

log "Récupération du dépôt applicatif"
if [ -d "$APP_REPO_DIR/.git" ]; then
  git -C "$APP_REPO_DIR" fetch origin
  git -C "$APP_REPO_DIR" checkout "$GAME_REPO_BRANCH"
  git -C "$APP_REPO_DIR" pull origin "$GAME_REPO_BRANCH"
else
  git clone --branch "$GAME_REPO_BRANCH" "$GAME_REPO_URL" "$APP_REPO_DIR" \
    || die "Échec du clone de $GAME_REPO_URL — vérifiez qu'une clé de déploiement SSH est configurée pour l'utilisateur root."
fi

log "Récupération du dépôt de contenu pédagogique"
if [ -d "$CONTENT_REPO_DIR/.git" ]; then
  git -C "$CONTENT_REPO_DIR" pull
else
  git clone "$CONTENT_REPO_URL" "$CONTENT_REPO_DIR" \
    || die "Échec du clone de $CONTENT_REPO_URL."
fi

chown -R "$APP_USER:$APP_USER" "$APP_REPO_DIR" "$CONTENT_REPO_DIR"

# ============================================================================
# 6. Secrets — générés une seule fois, jamais régénérés sur une réexécution
# ============================================================================
log "Génération/chargement des secrets"
gen_secret() { openssl rand -hex 32; }

for name in JWT_SECRET MYSQL_ROOT_PASSWORD MYSQL_APP_PASSWORD; do
  file="$SECRETS_DIR/$name"
  if [ ! -f "$file" ]; then
    gen_secret > "$file"
    chmod 600 "$file"
    chown "$APP_USER:$APP_USER" "$file"
  fi
done
JWT_SECRET=$(cat "$SECRETS_DIR/JWT_SECRET")
MYSQL_ROOT_PASSWORD=$(cat "$SECRETS_DIR/MYSQL_ROOT_PASSWORD")
MYSQL_APP_PASSWORD=$(cat "$SECRETS_DIR/MYSQL_APP_PASSWORD")
MYSQL_APP_USER="gameapprendrereseau"

if [ -n "$DOMAIN" ]; then
  PUBLIC_ORIGIN="https://$DOMAIN"
else
  PUBLIC_ORIGIN="http://$(curl -s -4 ifconfig.me || echo "localhost")"
fi

# ============================================================================
# 7. MariaDB (conteneur Docker, lié à 127.0.0.1 uniquement)
# ============================================================================
log "Démarrage de MariaDB"
cat > "$DEPLOY_DIR/.env" <<EOF
MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD
MYSQL_APP_USER=$MYSQL_APP_USER
MYSQL_APP_PASSWORD=$MYSQL_APP_PASSWORD
MYSQL_PORT=$MYSQL_PORT
EOF
chown "$APP_USER:$APP_USER" "$DEPLOY_DIR/.env"
chmod 600 "$DEPLOY_DIR/.env"

(cd "$DEPLOY_DIR" && docker compose -f docker-compose.prod.yml up -d)

log "Attente de la disponibilité de MariaDB"
for i in $(seq 1 30); do
  docker exec game-apprendre-reseau-mysql-prod mariadb-admin ping -h 127.0.0.1 -u root -p"$MYSQL_ROOT_PASSWORD" --silent 2>/dev/null && break
  sleep 2
  [ "$i" -eq 30 ] && die "MariaDB n'a pas démarré à temps."
done

# ============================================================================
# 8. Backend Node
# ============================================================================
log "Configuration et build du backend"
BACKEND_DIR="$APP_REPO_DIR/backend"
cat > "$BACKEND_DIR/.env" <<EOF
DATABASE_URL="mysql://${MYSQL_APP_USER}:${MYSQL_APP_PASSWORD}@127.0.0.1:${MYSQL_PORT}/game_apprendre_reseau"
JWT_SECRET="$JWT_SECRET"
PORT=$BACKEND_PORT
HOST=127.0.0.1
CORS_ORIGIN="$PUBLIC_ORIGIN"
SEED_ADMIN_EMAIL="$SEED_ADMIN_EMAIL"
EOF
chown "$APP_USER:$APP_USER" "$BACKEND_DIR/.env"
chmod 600 "$BACKEND_DIR/.env"

sudo -H -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && npm ci && npx prisma generate && npm run build"
sudo -H -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && npx prisma migrate deploy"
sudo -H -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && npm run prisma:seed:prod"
sudo -H -u "$APP_USER" bash -c "cd '$BACKEND_DIR' && npm run content:import -- --source '$CONTENT_REPO_DIR'"

# ============================================================================
# 9. Frontend (build statique)
# ============================================================================
log "Configuration et build du frontend"
FRONTEND_DIR="$APP_REPO_DIR/frontend"
echo 'VITE_API_URL="/api"' > "$FRONTEND_DIR/.env"
chown "$APP_USER:$APP_USER" "$FRONTEND_DIR/.env"

sudo -H -u "$APP_USER" bash -c "cd '$FRONTEND_DIR' && npm ci && npm run build"

# ============================================================================
# 10. systemd
# ============================================================================
log "Installation du service systemd"
sed -e "s#{{APP_DIR}}#$APP_REPO_DIR#g" -e "s#{{APP_USER}}#$APP_USER#g" \
  "$DEPLOY_DIR/systemd/game-apprendre-reseau-backend.service" > /etc/systemd/system/game-apprendre-reseau-backend.service

systemctl daemon-reload
systemctl enable --now game-apprendre-reseau-backend

# ============================================================================
# 11. nginx
# ============================================================================
log "Configuration de nginx"
sed -e "s#{{FRONTEND_DIST}}#$FRONTEND_DIR/dist#g" \
    -e "s#{{BACKEND_PORT}}#$BACKEND_PORT#g" \
    -e "s#{{SERVER_NAME}}#${DOMAIN:-_}#g" \
    "$DEPLOY_DIR/nginx/game-apprendre-reseau.conf" > /etc/nginx/sites-available/game-apprendre-reseau.conf
ln -sf /etc/nginx/sites-available/game-apprendre-reseau.conf /etc/nginx/sites-enabled/game-apprendre-reseau.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

# ============================================================================
# 12. Pare-feu — le port web DOIT être joignable par les navigateurs des étudiants
#     (contrairement au port du correction-agent SQL/C# sur cette même VM, restreint à .201).
# ============================================================================
log "Configuration du pare-feu (ufw)"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null

# ============================================================================
# 13. TLS (optionnel)
# ============================================================================
if [ -n "$DOMAIN" ]; then
  log "Configuration de Let's Encrypt pour $DOMAIN"
  apt-get install -y -qq certbot python3-certbot-nginx
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect \
    || warn "Échec de certbot — vérifiez que le domaine pointe bien vers cette VM (DNS) avant de réessayer : certbot --nginx -d $DOMAIN"
fi

# ============================================================================
# Résumé
# ============================================================================
log "Installation terminée"
cat <<EOF

  URL publique          : $([ -n "$DOMAIN" ] && echo "https://$DOMAIN" || echo "$PUBLIC_ORIGIN")
  Backend (local)        : http://127.0.0.1:$BACKEND_PORT

  Secrets générés dans   : $SECRETS_DIR (permissions 600, propriétaire $APP_USER)
  Identifiants admin     : affichés ci-dessus par prisma:seed:prod (à noter maintenant,
                            ne seront plus jamais réaffichés)

  Statut du service      : systemctl status game-apprendre-reseau-backend
  Logs                   : journalctl -u game-apprendre-reseau-backend -f
  Mise à jour            : $DEPLOY_DIR/update.sh

Voir deploy/README.md pour le détail.
EOF
