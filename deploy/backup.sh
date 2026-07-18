#!/usr/bin/env bash
#
# Sauvegarde quotidienne de la base MariaDB (mariadb-dump compressé), conservée 30 jours.
#
# Usage : sudo ./backup.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/game-apprendre-reseau}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

MYSQL_ROOT_PASSWORD=$(cat "$APP_DIR/secrets/MYSQL_ROOT_PASSWORD")

mkdir -p "$BACKUP_DIR"
timestamp=$(date +%Y%m%d-%H%M%S)
outfile="$BACKUP_DIR/game_apprendre_reseau-$timestamp.sql.gz"

docker exec game-apprendre-reseau-mysql-prod mariadb-dump -u root -p"$MYSQL_ROOT_PASSWORD" game_apprendre_reseau \
  | gzip > "$outfile"

find "$BACKUP_DIR" -name '*.sql.gz' -mtime "+$RETENTION_DAYS" -delete

echo "Sauvegarde écrite : $outfile"
