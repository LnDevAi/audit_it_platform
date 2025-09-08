# 🚀 Guide de Déploiement E-DEFENCE Audit Platform

## 📋 Prérequis

### Système
- **OS**: Windows 10/11, Linux (Ubuntu 20.04+), macOS
- **RAM**: Minimum 4GB, Recommandé 8GB+
- **Stockage**: Minimum 10GB d'espace libre
- **Réseau**: Connexion Internet stable

### Logiciels
- **Node.js**: Version 18+ ([Télécharger](https://nodejs.org/))
- **MySQL**: Version 8.0+ ([Télécharger](https://dev.mysql.com/downloads/))
- **Redis**: Version 6.0+ ([Télécharger](https://redis.io/download))
- **Git**: Pour cloner le projet ([Télécharger](https://git-scm.com/))

## 🏃‍♂️ Démarrage Rapide

### Windows
```bash
# Double-cliquer sur le fichier
start-platform.bat

# Ou en ligne de commande
.\start-platform.bat
```

### PowerShell
```powershell
# Exécuter le script PowerShell
.\start-platform.ps1
```

### Linux/macOS
```bash
# Rendre le script exécutable
chmod +x scripts/deploy-contabo.sh

# Démarrage automatique
cd backend && npm run auto
```

## 🔧 Configuration Manuelle

### 1. Installation des Dépendances

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configuration de la Base de Données

```sql
-- Créer la base de données
CREATE DATABASE audit_platform_saas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Créer l'utilisateur
CREATE USER 'audit_user'@'localhost' IDENTIFIED BY 'secure_password_2024';
GRANT ALL PRIVILEGES ON audit_platform_saas.* TO 'audit_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configuration des Variables d'Environnement

Copier `backend/env.example` vers `backend/.env` et configurer :

```env
# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_NAME=audit_platform_saas
DB_USER=audit_user
DB_PASSWORD=secure_password_2024

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h

# Serveur
PORT=5000
NODE_ENV=production
FRONTEND_URL=http://localhost:3000

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Paiements
ORANGE_MERCHANT_KEY=your_orange_merchant_key
ORANGE_MERCHANT_SECRET=your_orange_merchant_secret
MOBILE_MONEY_MERCHANT_ID=your_mobile_money_merchant_id
MOBILE_MONEY_API_KEY=your_mobile_money_api_key

# Configuration automatique
AUTO_PORT_CONFIG=true
```

### 4. Démarrage des Services

```bash
# Démarrer MySQL
sudo systemctl start mysql  # Linux
net start mysql             # Windows

# Démarrer Redis
redis-server                # Linux/macOS
redis-server.exe           # Windows

# Démarrer le backend
cd backend
npm run auto

# Démarrer le frontend (nouveau terminal)
cd frontend
npm start
```

## 🌐 Déploiement sur VPS Contabo

### 1. Préparation du Serveur

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation des dépendances
sudo apt install -y curl wget git nginx mysql-server redis-server nodejs npm

# Installation de PM2
sudo npm install -g pm2
```

### 2. Configuration Automatique

```bash
# Cloner le projet
git clone https://github.com/your-repo/audit_it_platform.git
cd audit_it_platform

# Rendre le script exécutable
chmod +x scripts/deploy-contabo.sh

# Déploiement automatique
./scripts/deploy-contabo.sh deploy
```

### 3. Configuration Manuelle (Alternative)

```bash
# Configuration de la base de données
sudo mysql_secure_installation

# Création de la base de données
mysql -u root -p
CREATE DATABASE audit_platform_saas;
CREATE USER 'audit_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON audit_platform_saas.* TO 'audit_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Configuration Nginx
sudo nano /etc/nginx/sites-available/audit-platform
```

Configuration Nginx :
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔍 Tests de Déploiement

### Test Automatique
```bash
cd backend
npm run test:deployment
```

### Test Manuel
```bash
# Test de santé
curl http://localhost:5000/health

# Test de l'API
curl http://localhost:5000/api/health

# Test de l'API publique
curl http://localhost:5000/api/public/health
```

## 📊 Monitoring

### Métriques
- **Backend**: http://localhost:5000/metrics
- **Health Check**: http://localhost:5000/health
- **API Health**: http://localhost:5000/api/health

### Logs
```bash
# Logs du backend
tail -f backend/logs/app.log

# Logs PM2
pm2 logs audit-backend
pm2 logs audit-frontend

# Logs système
sudo journalctl -u nginx -f
sudo journalctl -u mysql -f
```

## 🔧 Maintenance

### Sauvegardes
```bash
# Sauvegarde automatique (configurée par le script de déploiement)
/usr/local/bin/backup-audit-platform.sh

# Sauvegarde manuelle
./scripts/deploy-contabo.sh backup
```

### Mises à Jour
```bash
# Mise à jour du code
git pull origin main

# Mise à jour des dépendances
cd backend && npm update
cd ../frontend && npm update

# Redéploiement
./scripts/deploy-contabo.sh update
```

### Nettoyage
```bash
# Nettoyage des logs
pm2 flush

# Nettoyage des caches
redis-cli FLUSHALL

# Nettoyage des ports
cd backend && npm run ports:cleanup
```

## 🚨 Dépannage

### Problèmes Courants

#### 1. Port déjà utilisé
```bash
# Vérifier les ports utilisés
netstat -tulpn | grep :5000

# Résoudre automatiquement
cd backend && npm run ports:resolve
```

#### 2. Base de données inaccessible
```bash
# Vérifier le statut MySQL
sudo systemctl status mysql

# Redémarrer MySQL
sudo systemctl restart mysql

# Vérifier la connexion
mysql -u audit_user -p audit_platform_saas
```

#### 3. Redis inaccessible
```bash
# Vérifier le statut Redis
sudo systemctl status redis-server

# Redémarrer Redis
sudo systemctl restart redis-server

# Vérifier la connexion
redis-cli ping
```

#### 4. Erreurs de permissions
```bash
# Corriger les permissions
sudo chown -R $USER:$USER /var/www/audit-platform
sudo chmod -R 755 /var/www/audit-platform
```

### Logs d'Erreur
```bash
# Logs détaillés
cd backend && npm run logs

# Debug mode
NODE_ENV=development npm start
```

## 📞 Support

### Documentation
- [Guide Utilisateur](USER_GUIDE.md)
- [API Documentation](API_DOCS.md)
- [Architecture](ARCHITECTURE.md)

### Contact
- **Email**: support@e-defence.bf
- **GitHub**: [Issues](https://github.com/your-repo/audit_it_platform/issues)
- **Documentation**: [Wiki](https://github.com/your-repo/audit_it_platform/wiki)

## 🔒 Sécurité

### Recommandations
1. **Changer les mots de passe par défaut**
2. **Configurer un certificat SSL**
3. **Activer le firewall**
4. **Configurer les sauvegardes automatiques**
5. **Mettre à jour régulièrement**

### Configuration SSL
```bash
# Installation Certbot
sudo apt install certbot python3-certbot-nginx

# Génération du certificat
sudo certbot --nginx -d your-domain.com

# Renouvellement automatique
sudo crontab -e
# Ajouter: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

**🎉 Félicitations ! Votre plateforme E-DEFENCE Audit est maintenant déployée et opérationnelle !**
