# Documentation API E-DEFENCE Audit Platform

## Vue d'ensemble

L'API E-DEFENCE Audit Platform est une API RESTful construite avec Node.js, Express et Sequelize. Elle fournit des fonctionnalités complètes pour la gestion d'audits informatiques dans un environnement SaaS multi-tenant.

## Architecture

### Stack Technologique
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **ORM**: Sequelize
- **Base de données**: MySQL 8.0
- **Cache**: Redis 7
- **Authentification**: JWT
- **Validation**: express-validator
- **Logging**: Winston
- **Monitoring**: Prometheus

### Structure du Projet
```
backend/
├── config/           # Configuration (DB, Redis, Logger, etc.)
├── models/           # Modèles Sequelize
├── routes/           # Routes API
├── middleware/       # Middlewares personnalisés
├── services/         # Logique métier
├── utils/            # Utilitaires
├── tests/            # Tests (unit, integration, performance)
└── scripts/          # Scripts utilitaires
```

## Authentification

### JWT (JSON Web Tokens)
L'API utilise JWT pour l'authentification. Les tokens sont signés avec une clé secrète et ont une durée de vie configurable.

#### Endpoints d'authentification
- `POST /api/auth/login` - Connexion utilisateur
- `POST /api/auth/register` - Inscription utilisateur
- `GET /api/auth/me` - Profil utilisateur actuel
- `POST /api/auth/logout` - Déconnexion
- `POST /api/auth/refresh` - Renouvellement de token

#### Format des tokens
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

## Modèles de Données

### Organization
```javascript
{
  id: INTEGER (Primary Key),
  name: STRING,
  slug: STRING (Unique),
  subscription_plan: ENUM('trial', 'basic', 'professional', 'enterprise'),
  subscription_status: ENUM('active', 'suspended', 'cancelled'),
  max_users: INTEGER,
  max_missions: INTEGER,
  max_storage_gb: INTEGER,
  created_at: DATE,
  updated_at: DATE
}
```

### User
```javascript
{
  id: INTEGER (Primary Key),
  name: STRING,
  email: STRING (Unique),
  password_hash: STRING,
  role: ENUM('admin', 'auditor_senior', 'auditor_junior', 'client'),
  organization_id: INTEGER (Foreign Key),
  status: ENUM('active', 'inactive', 'suspended'),
  last_login: DATE,
  created_at: DATE,
  updated_at: DATE
}
```

### AuditMission
```javascript
{
  id: INTEGER (Primary Key),
  name: STRING,
  client_name: STRING,
  start_date: DATE,
  end_date: DATE,
  status: ENUM('planned', 'in_progress', 'completed', 'cancelled'),
  organization_id: INTEGER (Foreign Key),
  created_by: INTEGER (Foreign Key),
  budget: DECIMAL,
  description: TEXT,
  created_at: DATE,
  updated_at: DATE
}
```

## Endpoints API

### Organisations

#### `GET /api/organizations`
Récupère la liste des organisations de l'utilisateur connecté.

**Paramètres de requête:**
- `page` (number): Numéro de page (défaut: 1)
- `limit` (number): Nombre d'éléments par page (défaut: 10)
- `search` (string): Terme de recherche

**Réponse:**
```json
{
  "organizations": [
    {
      "id": 1,
      "name": "Example Corp",
      "slug": "example-corp",
      "subscription_plan": "professional",
      "subscription_status": "active",
      "max_users": 50,
      "max_missions": 100,
      "max_storage_gb": 10
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

#### `POST /api/organizations`
Crée une nouvelle organisation.

**Corps de la requête:**
```json
{
  "name": "New Organization",
  "slug": "new-org",
  "subscription_plan": "basic"
}
```

#### `GET /api/organizations/:id`
Récupère une organisation spécifique.

#### `PUT /api/organizations/:id`
Met à jour une organisation.

#### `DELETE /api/organizations/:id`
Supprime une organisation.

### Missions d'Audit

#### `GET /api/missions`
Récupère la liste des missions d'audit.

**Paramètres de requête:**
- `page` (number): Numéro de page
- `limit` (number): Nombre d'éléments par page
- `status` (string): Filtrer par statut
- `client_name` (string): Rechercher par nom de client

#### `POST /api/missions`
Crée une nouvelle mission d'audit.

**Corps de la requête:**
```json
{
  "name": "Audit Sécurité 2024",
  "client_name": "Client Example",
  "start_date": "2024-01-15",
  "end_date": "2024-02-15",
  "status": "planned",
  "budget": 50000,
  "description": "Audit de sécurité complet"
}
```

### Imports/Exports

#### `POST /api/imports`
Importe des données depuis un fichier.

**Corps de la requête (multipart/form-data):**
- `import_type`: Type d'import ('inventory', 'network_devices', 'vulnerabilities', 'users', 'missions')
- `file`: Fichier à importer

#### `POST /api/exports`
Exporte des données vers un fichier.

**Corps de la requête:**
```json
{
  "export_type": "missions",
  "file_format": "excel",
  "filters": {
    "status": "completed",
    "date_from": "2024-01-01"
  }
}
```

## Gestion des Erreurs

### Codes d'Erreur Standardisés
- `400` - Bad Request (données invalides)
- `401` - Unauthorized (authentification requise)
- `403` - Forbidden (permissions insuffisantes)
- `404` - Not Found (ressource introuvable)
- `422` - Unprocessable Entity (validation échouée)
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error (erreur serveur)

### Format des Erreurs
```json
{
  "error": "Validation failed",
  "message": "Invalid email format",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456"
}
```

## Rate Limiting

L'API implémente un rate limiting basé sur l'IP et l'utilisateur :

- **Limite par défaut**: 100 requêtes par fenêtre de 15 minutes
- **Limite pour l'authentification**: 5 tentatives par fenêtre de 15 minutes
- **Limite pour les imports/exports**: 10 requêtes par heure

## Cache

### Stratégie de Cache
- **Cache Redis**: Pour les requêtes fréquentes
- **TTL par défaut**: 300 secondes (5 minutes)
- **Cache des métriques**: 60 secondes
- **Cache des health checks**: 30 secondes

### Endpoints avec Cache
- `GET /api/organizations` - Cache 5 minutes
- `GET /api/missions` - Cache 2 minutes
- `GET /health` - Cache 30 secondes
- `GET /metrics` - Cache 60 secondes

## Monitoring et Métriques

### Endpoints de Monitoring
- `GET /health` - Health check simple
- `GET /health/detailed` - Health check détaillé
- `GET /metrics` - Métriques Prometheus

### Métriques Collectées
- **HTTP Requests**: Nombre total de requêtes par méthode/route/statut
- **Response Times**: Temps de réponse moyen et distribution
- **Error Rates**: Taux d'erreur par endpoint
- **Database Operations**: Nombre d'opérations DB et temps de requête
- **Cache Performance**: Hit/miss ratio du cache
- **System Metrics**: Utilisation CPU, mémoire, disque

## Sécurité

### Mesures de Sécurité
- **HTTPS obligatoire** en production
- **Headers de sécurité** (Helmet.js)
- **Validation des entrées** stricte
- **Sanitisation des données**
- **Rate limiting** par IP et utilisateur
- **Logs de sécurité** structurés
- **Audit trail** complet

### Headers de Sécurité
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

## Tests

### Types de Tests
- **Tests unitaires**: Fonctions individuelles
- **Tests d'intégration**: Flux complets d'API
- **Tests de performance**: Charge et stress
- **Tests de sécurité**: Vulnérabilités

### Exécution des Tests
```bash
# Tests unitaires
npm test

# Tests avec couverture
npm run test:coverage

# Tests d'intégration
npm test -- tests/integration/

# Tests de performance
npm test -- tests/performance/

# Tous les tests
npm run test:ci
```

## Déploiement

### Environnements
- **Development**: Local avec hot reload
- **Staging**: Environnement de test
- **Production**: Environnement de production

### Variables d'Environnement
```bash
# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_NAME=audit_platform_saas
DB_USER=audit_user
DB_PASSWORD=secure_password

# JWT
JWT_SECRET=very_long_random_string
JWT_EXPIRES_IN=24h

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Serveur
PORT=5000
NODE_ENV=production

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=info
```

### Docker
```bash
# Build de l'image
docker build -t audit-platform-backend .

# Exécution
docker run -p 5000:5000 audit-platform-backend

# Avec docker-compose
docker-compose up -d
```

## Performance

### Optimisations
- **Pool de connexions** MySQL optimisé
- **Cache Redis** pour les requêtes fréquentes
- **Compression** gzip des réponses
- **Pagination** pour les grandes listes
- **Indexation** des bases de données
- **Lazy loading** des relations

### Benchmarks
- **Requêtes simples**: < 50ms
- **Requêtes complexes**: < 200ms
- **Concurrent users**: 100+ simultanés
- **Throughput**: 1000+ req/s

## Support et Maintenance

### Logs
- **Application logs**: Winston avec rotation
- **Access logs**: Requêtes HTTP
- **Error logs**: Erreurs et exceptions
- **Security logs**: Événements de sécurité

### Monitoring
- **Health checks** automatiques
- **Alertes** en cas de problème
- **Métriques** en temps réel
- **Dashboards** Grafana

### Maintenance
- **Backups** automatiques quotidiens
- **Updates** de sécurité
- **Performance tuning** régulier
- **Documentation** mise à jour


