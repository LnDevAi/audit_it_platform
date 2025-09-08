# 🔍 E-DEFENCE Audit Platform

Plateforme d'audit informatique complète développée pour E-DEFENCE, permettant la gestion des missions d'audit IT avec inventaire, cartographie réseau, analyse de vulnérabilités et génération de rapports.

## 🚀 Fonctionnalités

### 📊 Dashboard
- Métriques temps réel des missions
- Suivi de progression par phases
- Statistiques globales d'audit

### 📋 Gestion des missions
- Création et suivi des missions d'audit
- Gestion multi-sites
- Planning et phases de mission

### 💻 Inventaire
- Catalogage complet du parc informatique
- Gestion des équipements par catégorie
- Suivi des garanties et localisations

### 🏗️ Infrastructure
- Évaluation de l'alimentation électrique
- Analyse des équipements réseau
- Documentation de l'architecture

### 🗺️ Cartographie réseau
- Scan automatique des réseaux
- Intégration Nmap
- Génération de topologies

### 🔍 Analyse de vulnérabilités
- Scans de sécurité automatisés
- Intégration Nessus et OWASP ZAP
- Classification par criticité

### 🛡️ Sécurité
- Évaluation des contrôles de sécurité
- Audit des politiques
- Recommandations de sécurisation

### 👥 Entretiens
- Planning des entretiens avec les directions
- Comptes-rendus structurés
- Suivi des recommandations

### 📄 Rapports
- Génération automatique de rapports
- Export PDF, Word, Excel
- Envoi par email

### 👤 Gestion des utilisateurs
- Système de rôles et permissions
- Authentification sécurisée
- Logs d'activité

## 🛠️ Technologies

### Backend
- **Node.js** + **Express.js**
- **MySQL** avec **Sequelize ORM**
- **JWT** pour l'authentification
- **Multer** pour les uploads
- **Nodemailer** pour les emails

### Frontend
- **React 18** + **Material-UI**
- **React Router** pour la navigation
- **React Query** pour la gestion d'état
- **Recharts** pour les graphiques
- **React Hook Form** pour les formulaires

### Base de données
- **MySQL/MariaDB**
- Compatible **phpMyAdmin**
- Schéma optimisé pour les audits IT

## 📦 Installation

### Prérequis
- Node.js 16+
- MySQL/MariaDB 8+
- npm ou yarn

### 1. Cloner le projet
```bash
git clone https://github.com/votre-repo/audit_it_platform.git
cd audit_it_platform
```

### 2. Configuration de la base de données
```bash
# Créer la base de données
mysql -u root -p < database/schema.sql
```

### 3. Installation du backend
```bash
cd backend
npm install

# Générer les secrets sécurisés
node ../scripts/generate-secrets.js

# Ou copier le fichier d'exemple et le configurer
cp env.example .env
# Éditer le fichier .env avec vos paramètres

npm run dev
```

### 4. Installation du frontend
```bash
cd frontend
npm install
npm start
```

## ⚙️ Configuration

### Variables d'environnement (backend/.env)
```env
# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_NAME=audit_platform
DB_USER=root
DB_PASSWORD=votre_mot_de_passe

# JWT
JWT_SECRET=votre_clé_secrète_très_sécurisée
JWT_EXPIRES_IN=24h

# Serveur
PORT=5000
NODE_ENV=production

# Email (optionnel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe_app
```

### Configuration frontend
Le frontend se connecte automatiquement au backend sur `http://localhost:5000`

## 🚀 Déploiement

### Vérification de sécurité
```bash
# Vérifier la sécurité avant le déploiement
node scripts/security-check.js
```

### Déploiement manuel
```bash
# Backend
cd backend
npm run start

# Frontend
cd frontend
npm run build
# Servir les fichiers statiques avec nginx/apache
```

### Tests
```bash
# Tests unitaires
cd backend
npm test

# Tests avec couverture
npm run test:coverage
```

### Monitoring et Performance
```bash
# Démarrer le monitoring
node scripts/monitoring.js

# Vérifier les health checks
curl http://localhost:5000/health
curl http://localhost:5000/health/detailed

# Consulter les métriques Prometheus
curl http://localhost:5000/metrics
```

### Qualité et Tests
```bash
# Vérifier la qualité du code
npm run lint
npm run format:check

# Exécuter les tests
npm test                    # Tests unitaires
npm run test:coverage       # Tests avec couverture
npm test -- tests/integration/  # Tests d'intégration
npm test -- tests/performance/  # Tests de performance

# Vérification complète
npm run quality
```

### Test CI/CD Complet
```bash
# Linux/macOS
./scripts/test-ci.sh

# Windows
scripts\test-ci.bat
```

### Déploiement avec Podman et Tests Postman
```powershell
# 1. Déployer avec Podman (gestion automatique des ports)
.\scripts\deploy-podman.ps1

# 2. Tester avec Postman (automatisé)
.\scripts\test-postman.ps1

# 3. Tests rapides
.\scripts\quick-test.ps1

# 4. Gestion des ports (automatique)
.\scripts\port-manager.ps1 -Action check    # Vérifier les ports
.\scripts\port-manager.ps1 -Action fix      # Résoudre les conflits
.\scripts\port-manager.ps1 -Action restore  # Restaurer les ports par défaut
```

**📚 Guides détaillés :**
- [Guide Postman complet](POSTMAN_GUIDE.md)
- [Configuration des secrets GitHub](GITHUB_SECRETS.md)
- [Guide de gestion des ports](PORT_MANAGEMENT_GUIDE.md)

### 🔧 Gestion Automatique des Ports

La plateforme inclut un système de gestion automatique des ports pour éviter les conflits :

```powershell
# Vérifier l'état des ports
.\scripts\port-manager.ps1 -Action check

# Résoudre automatiquement les conflits
.\scripts\port-manager.ps1 -Action fix

# Restaurer les ports par défaut
.\scripts\port-manager.ps1 -Action restore

# Lister la configuration des ports
.\scripts\port-manager.ps1 -Action list
```

**Ports par défaut :**
- **Database (MySQL)** : 3306
- **Redis** : 6379
- **phpMyAdmin** : 8081
- **Backend API** : 5000
- **Frontend** : 3000

**Fonctionnalités :**
- ✅ Détection automatique des conflits
- ✅ Résolution automatique avec ports alternatifs
- ✅ Sauvegarde automatique de la configuration
- ✅ Restauration des ports par défaut
- ✅ Intégration dans le déploiement Podman

### CI/CD
Le pipeline CI/CD s'exécute automatiquement sur les push et pull requests :
- ✅ Qualité du code (ESLint, Prettier)
- ✅ Tests unitaires et d'intégration
- ✅ Tests de performance
- ✅ Scan de sécurité
- ✅ Build Docker
- ✅ Déploiement automatique (main branch)

**Configuration requise** : Voir [GITHUB_SECRETS.md](GITHUB_SECRETS.md) pour configurer les secrets nécessaires.

### Déploiement avec Podman (Recommandé)
```bash
# Démarrage complet avec Podman
podman-compose -f podman-compose.yml up -d

# Ou avec le script de déploiement
./scripts/deploy-podman.sh deploy    # Linux
scripts\deploy-podman.bat deploy     # Windows

# Services disponibles
# - Frontend: http://localhost:3000
# - Backend: http://localhost:5000
# - phpMyAdmin: http://localhost:8081
```

### Déploiement avec Docker (Alternative)
```bash
docker-compose up -d

# Services disponibles
# - Frontend: http://localhost:3000
# - Backend: http://localhost:5000
# - phpMyAdmin: http://localhost:8081
```

## 👥 Comptes par défaut

### Administrateur
- **Email:** l.nacoulma@e-defence.bf
- **Mot de passe:** admin123

### Auditeur Senior
- **Email:** a.tassembedo@e-defence.bf
- **Mot de passe:** audit123

### Client
- **Email:** b.bance@abi.bf
- **Mot de passe:** client123

## 🔐 Sécurité

- **Authentification JWT** avec rotation automatique des clés
- **Hashage bcrypt** des mots de passe (12 rounds)
- **Validation des entrées** avec express-validator
- **Rate limiting** configurable par IP
- **Logging structuré** avec Winston
- **Permissions granulaires** par organisation
- **Middleware de sécurité** (Helmet, CORS, etc.)
- **Gestion d'erreurs centralisée** avec codes d'erreur standardisés
- **Variables d'environnement sécurisées**
- **Scripts de vérification de sécurité** automatisés

## 📊 Performance et Monitoring

- **Cache Redis** pour optimiser les performances
- **Métriques Prometheus** pour le monitoring en temps réel
- **Health checks avancés** pour la surveillance de l'état
- **Optimisation des requêtes** de base de données
- **Pool de connexions** configurable
- **Monitoring automatisé** avec alertes
- **Logs de performance** structurés
- **Statistiques d'utilisation** en temps réel

## 🎯 Qualité et Automatisation

- **ESLint et Prettier** pour la qualité du code
- **Tests unitaires, d'intégration et de performance** complets
- **Pipeline CI/CD** avec GitHub Actions
- **Hooks Git** avec Husky et lint-staged
- **Documentation technique** complète
- **Code quality gates** automatisés
- **Tests de sécurité** intégrés
- **Rapports de couverture** détaillés

## 📚 API Documentation

### Authentification
```bash
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
```

### Missions
```bash
GET /api/missions
POST /api/missions
GET /api/missions/:id
PUT /api/missions/:id
DELETE /api/missions/:id
```

### Inventaire
```bash
GET /api/inventory
POST /api/inventory
PUT /api/inventory/:id
DELETE /api/inventory/:id
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou support :
- **Email:** support@e-defence.bf
- **Documentation:** [Wiki du projet](https://github.com/votre-repo/audit_it_platform/wiki)

## 🔄 Changelog

### v1.0.0 (2024-01-15)
- Version initiale
- Toutes les fonctionnalités principales
- Interface moderne et responsive
- API REST complète

---

Développé avec ❤️ par l'équipe E-DEFENCE
