# Déploiement Cloud : Render & DigitalOcean App Platform

Ce guide explique comment utiliser les manifestes fournis dans le dépôt pour déployer la plateforme sur Render et OceanApp (DigitalOcean App Platform). Les deux solutions s’appuient sur les mêmes artefacts : backend Node/Express, frontend React, base MySQL et Redis.

---

## 1. Render

### Fichier de référence
- `render.yaml`

### Étapes
1. **Connexion**  
   Créez ou sélectionnez un compte Render et connectez votre dépôt GitHub/GitLab.

2. **Blueprint**  
   Sur la page *Blueprints*, choisissez “New Blueprint Instance”, importez `render.yaml` (copier/coller ou pointer vers ce fichier dans le repo).

3. **Services créés**
   - `audit-mysql` : base de données MySQL 8 (Render gère automatiquement les paramètres de connexion).  
   - `audit-redis` : instance Redis managée (plan Starter).  
   - `audit-backend` : service web Node 18 exécutant `backend/server.js`.  
   - `audit-frontend` : site statique compilé depuis `frontend/`.

4. **Variables d’environnement**
   Le blueprint préremplit :
   - Connexion MySQL : `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.  
   - Connexion Redis : `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`.  
   - Secrets générés automatiquement : `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`.

   À compléter manuellement dans Render > *Environment* du service backend :
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.  
   - Clés éventuelles pour les passerelles Orange/Mobile Money (`ORANGE_*`, `MOBILE_MONEY_*`).  
   - Toute variable métier (OIDC, Webhooks, etc.) décrite dans `backend/env.example`.

5. **Frontend**
   Par défaut, `REACT_APP_API_URL` pointe vers `https://audit-backend.onrender.com/api`. Ajustez la valeur une fois le nom réel du service backend connu (Render > service backend > “Domains”).

6. **Déploiement**
   Une fois le blueprint validé, Render construit et lance automatiquement les services. Les déploiements suivants se déclenchent à chaque push sur `main` (autoDeploy activé).

---

## 2. DigitalOcean App Platform (OceanApp)

### Fichier de référence
- `.do/app.yaml`

### Étapes
1. **Import du fichier**  
   Depuis le tableau de bord DigitalOcean, section *Apps*, cliquez sur “Launch App” puis “Define via app spec”. Collez le contenu de `.do/app.yaml`.

2. **Composants créés**
   - `backend` (service Node) construit à partir du dossier `backend/`, build `npm install`, run `npm run start`.  
   - `audit-frontend` (static site) depuis `frontend/`.  
   - `audit-db` (Managed MySQL) et `audit-redis` (Managed Redis).

3. **Connexions automatiques**
   Le spec mappe les variables d’environnement backend vers les composants managés :
   - `${audit-db.*}` pour MySQL.  
   - `${audit-redis.*}` pour Redis.  
   - `FRONTEND_URL` pointe vers l’URL publique de la static site.

4. **Secrets à renseigner**
   Dans l’onglet *Environment Variables* de l’App :
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`.  
   - `SMTP_*`, `ORANGE_*`, `MOBILE_MONEY_*`, etc.  
   Vous pouvez utiliser le gestionnaire de secrets DO pour les stocker et les référencer depuis l’app spec (`${var.SECRET_NAME}`).

5. **API Frontend**
   La variable `REACT_APP_API_URL` est définie comme `${backend.PUBLIC_URL}/api`. À la première mise en production, vérifiez l’URL réelle (ex : `https://backend-xxx.ondigitalocean.app`) et relancez le déploiement si nécessaire.

6. **Builds & Scaling**
   - `instance_size_slug` (backend) est défini sur `basic-xxs`. Augmentez la taille ou le nombre de conteneurs selon la charge (section *Scaling*).  
   - Ajoutez des règles d’auto-scale si besoin (min/max instances).

---

## 3. Bonnes pratiques communes

| Besoin | Recommandation |
|--------|----------------|
| Stockage uploads | Utiliser un bucket S3 compatible (DO Spaces, Render Disk) et mettre `UPLOAD_PATH` en conséquence. |
| SSL/Custom Domain | Configurer via le tableau de bord du provider (TLS automatique). |
| Logs & Monitoring | Connecter Render/DO aux alertes integrées ou exporter vers votre stack (LogDNA, Datadog). |
| Jobs / Cron | Utiliser un service séparé (Render Cron Job, DO Worker) si des scripts planifiés sont nécessaires (e.g. `scripts/start-automated.js`, `scripts/backup`). |
| Secrets rotation | Régénérer `JWT_*` & `SESSION_SECRET` lors de chaque montée majeure et invalider les sessions côté users. |

---

## 4. Checklist de mise en production

1. **Configurer les secrets** (`JWT`, `SMTP`, `Paiement`, `OIDC`, etc.).  
2. **Initialiser la base** : exécuter `npm run migrate && npm run seed` sur le service backend (Render Shell / DO console).  
3. **Vérifier la santé** : `/health`, `/health/detailed`, `/metrics`.  
4. **Adapter `REACT_APP_API_URL`** après attribution des URLs finales.  
5. **Activer HTTPS + domaines custom** (Render : onglet *Domains* ; DO : *Domains*).  
6. **Monitorer** : brancher `scripts/monitoring.js`, Prometheus/Grafana existants ou solutions natives des providers.

---

En combinant `render.yaml` et `.do/app.yaml`, la plateforme peut être provisionnée en quelques minutes sur Render et OceanApp, tout en réutilisant la même base de code. Ajustez simplement les variables marquées `ORG`, `var.*` ou les URLs cibles avant le premier déploiement. 
