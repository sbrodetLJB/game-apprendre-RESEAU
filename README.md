# game-apprendre-RESEAU

Application gamifiée d'apprentissage des bases de réseau (numération, adressage IPv4/IPv6,
commutation, VLAN, routage, filtrage), construite sur le contenu pédagogique du dépôt
[apprendre-les-bases-de-reseau](../apprendre-les-bases-de-reseau) (15 leçons). Destinée à être
utilisée de façon autonome, **puis intégrée comme module dans
[dashboard-ecole](../dashboard-ecole)** (voir Phase 7).

## Différence architecturale avec game-apprendre-CS / game-apprendre-BDD

Ce cours ne suppose **aucune exécution de code, aucune requête, aucun serveur** : chaque
exercice est un gabarit texte (`Enonce/*.txt`, lignes `Clé :` à compléter) comparé champ par
champ au corrigé — un calcul sur papier, pas du code à exécuter. **Il n'y a donc pas de
microservice de correction ni de sandbox Docker** : la correction est une fonction TypeScript
ordinaire (`backend/src/lib/reseauGrading.ts`), exécutée **synchronement** dans la requête de
soumission. Toutes les 15 leçons sont auto-corrigées (aucune relecture professeur requise).

Choix délibéré d'accessibilité (voir `NVDA.md` du dépôt de contenu) : pas d'éditeur de code
(Monaco), de simples champs de texte multiligne accessibles suffisent.

## Feuille de route

- **Phase 0.1** — Socle applicatif : auth locale (JWT, bcrypt), rôles ADMIN/PROFESSEUR/ETUDIANT,
  classes, comptes créés par un admin/prof.
- **Phase 0.2** — Contenu pédagogique : import des 15 leçons via `content:import`, le corrigé
  n'est jamais exposé par l'API.
- **Phase 0.3** — Correction et soumissions : comparaison texte synchrone, XP/progression
  attribués immédiatement à la soumission.
- **Phase 0.4** — Frontend élève/professeur : page exercice avec champs de texte accessibles,
  widget XP, vues profs (matrice progression, détail étudiant).
- **Phase 0.5** — Moteur de gamification : catalogue de badges, upsert idempotent au démarrage
  serveur.
- **Phase 0.6** — Déploiement (application standalone complète, aucune sandbox à isoler).
- **Phase 7** — Intégration native dans dashboard-ecole.

## Démarrage local

```bash
docker compose up -d          # MariaDB sur 127.0.0.1:3311

cd backend
cp .env.example .env
npm install
npm run prisma:migrate
npm run prisma:seed
npm run content:import -- --source ../../apprendre-les-bases-de-reseau
npm run dev                   # http://localhost:4103

cd ../frontend
cp .env.example .env
npm install
npm run dev                   # http://localhost:5276
```

## Comptes de démonstration (seed de dev)

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Admin | admin@game-apprendre-reseau.local | admin123 |
| Professeur | prof.martin@game-apprendre-reseau.local | prof123 |
| Étudiant | etudiant1@game-apprendre-reseau.local | etudiant123 |
| Étudiant | etudiant2@game-apprendre-reseau.local | etudiant123 |
