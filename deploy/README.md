# Déploiement — game-apprendre-RESEAU

## Architecture

Application standalone complète sur une seule VM (`172.28.9.202`) : Node backend + MariaDB
(conteneur Docker) + frontend statique servi par nginx. **Aucun microservice externe, aucune
sandbox** — ce cours ne nécessite aucune exécution de code (comparaison texte pure, voir le
README racine § Différence architecturale). Cette VM héberge par ailleurs les microservices de
correction C#/BDD (ports 5299/5300, restreints à `172.28.9.201`) : le vhost nginx de ce module
utilise le port 80 (libre sur cette VM), ouvert largement pour être joignable par les
navigateurs des étudiants — contrairement aux ports 5299/5300, restreints à l'appelant unique
`172.28.9.201`.

## Variables principales de `install.sh`

| Variable | Rôle | Défaut |
|---|---|---|
| `SEED_ADMIN_EMAIL` | Compte admin réel créé au premier démarrage | requis |
| `DOMAIN` | Nom de domaine (active Let's Encrypt) | vide = HTTP sur IP |
| `MYSQL_PORT` | Port MariaDB applicative (127.0.0.1 uniquement) | 3306 |
| `BACKEND_PORT` | Port du backend Node (127.0.0.1 uniquement) | 4103 |

## Sauvegardes

`backup.sh` (mariadb-dump compressé, rétention 30 jours) — à planifier via cron :
```cron
0 3 * * * /opt/game-apprendre-reseau/app/deploy/backup.sh >> /var/log/game-apprendre-reseau-backup.log 2>&1
```

## Mise à jour

`update.sh` (`git pull` + rebuild backend/frontend + migrations + redémarrage).

## Import de contenu

```bash
sudo -u gameapprendrereseau bash -c "cd /opt/game-apprendre-reseau/app/backend && \
  npm run content:import -- --source /opt/game-apprendre-reseau/content/apprendre-les-bases-de-reseau"
```
