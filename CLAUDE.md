# CLAUDE.md — game-apprendre-RESEAU

Règles de travail à appliquer automatiquement sur ce projet. Fait partie de la famille
apprendre+game (voir `../FAMILLE_APPRENDRE_GAME.md`) — version gamifiée standalone du contenu
source `apprendre-les-bases-de-reseau`, intégrée dans dashboard-ecole sous la feature
`reseau-learning`.

## Contexte rapide

App gamifiée du cours réseau. Correction **sans exécution de code** — pure diff de texte, cohérent
avec la contrainte d'accessibilité du contenu source (pas de simulateur graphique). Structure :
`backend/, frontend/, correction-agent/ (diff texte), deploy/`. Repo GitHub privé
`sbrodetLJB/game-apprendre-RESEAU`, branche par défaut `master`.

**Intégration confirmée** dans dashboard-ecole : routes `backend/src/routes/reseauLessons.ts,
reseauMe.ts, reseauSubmissions.ts, reseauTeacher.ts` ; modèles Prisma `Reseau*` ;
`frontend/src/pages/reseau/`.

**Asymétrie importante** : `reseau-learning` dans dashboard-ecole a été **étendu au-delà de ce
dépôt** — leçons Cisco 16-19 (`apprendre-reseau-avance`) et feature "Ateliers réseau" (Packet
Tracer/Simulateur, routes `reseauAteliers.ts, reseauAtelierTeacher.ts`, modèles
`ReseauAtelier/ReseauFile/ReseauAtelierSubmission`) développées directement dans dashboard-ecole,
absentes d'ici. Ce dépôt n'est donc plus la version la plus complète du sujet.

---

## Règles non négociables

### 1. Préserver la limite d'usage
Pas de sous-agents sauf besoin réel de parallélisation. Effort `low`/`medium` pour un ajustement
de contenu isolé ; `high` pour toute tentative de rattraper l'écart avec `reseau-learning`.

### 2. Toujours vérifier en réel — jamais se contenter du code
Tester le correcteur diff-texte contre une réponse correcte ET incorrecte réellement soumises.
Vérifier l'app standalone en conditions réelles avant de considérer un changement livré.

### 3. Documenter systématiquement
`README.md` à jour côté standalone. **Documenter explicitement l'écart avec `reseau-learning`**
dans ce fichier tant qu'il n'est pas résolu — ne pas laisser un lecteur croire que ce dépôt est
à jour avec la version dashboard-ecole.

### 4. Confirmer avant les vrais choix d'architecture
`AskUserQuestion` avant toute décision de rattraper l'écart (porter Cisco 16-19 + Ateliers réseau
ici) ou au contraire d'accepter que dashboard-ecole reste la version la plus avancée — c'est une
vraie décision produit, pas un détail technique (cf. `../FAMILLE_APPRENDRE_GAME.md`, section
écarts connus).

### 5. Cohérence standalone ↔ `reseau-learning` — asymétrie active
Ne jamais présumer que les deux sont synchronisés. Avant toute modification, vérifier explicitement
lequel des deux est la source de vérité pour le contenu touché.

### 6. Git — commits, branches, versioning
- Commit + push automatique dès qu'un changement est livré ET vérifié en réel.
- Changement majeur (rattrapage de l'écart, refonte de la correction) : branche dédiée, testée en
  réel, **fusion dans `master` seulement après votre validation**.
- Tag de version (`vX.Y.Z`) uniquement à la clôture d'une phase de développement complète.
- À chaque tag : tag git + `CHANGELOG.md` (racine, à créer) + `README.md` à jour.
- Actions destructrices exclues — toujours confirmées avant exécution.

---

## Où documenter quoi

| Contenu | Fichier |
|---|---|
| Vue d'ensemble + état de l'écart avec dashboard-ecole | `README.md` |
| Backend / Frontend | `backend/`, `frontend/` |
| Correction (diff texte) | `correction-agent/` |
| Déploiement | `deploy/` |
| Historique des versions | `CHANGELOG.md` (à créer) |
| Convention famille + mapping dashboard-ecole | `../FAMILLE_APPRENDRE_GAME.md` |
