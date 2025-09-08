#!/bin/bash

# Script de déploiement automatique pour VPS Contabo
# E-DEFENCE Audit Platform

set -e

# Configuration
PROJECT_NAME="audit_it_platform"
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
DEPLOY_USER="root"
DEPLOY_HOST=""
DEPLOY_PATH="/var/www/audit-platform"
BACKUP_PATH="/var/backups/audit-platform"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Vérification des prérequis
check_prerequisites() {
    log "Vérification des prérequis..."
    
    if [ -z "$DEPLOY_HOST" ]; then
        error "DEPLOY_HOST n'est pas défini. Veuillez définir l'adresse IP de votre VPS Contabo."
    fi
    
    if ! command -v rsync &> /dev/null; then
        error "rsync n'est pas installé. Veuillez l'installer."
    fi
    
    if ! command -v ssh &> /dev/null; then
        error "ssh n'est pas installé. Veuillez l'installer."
    fi
    
    log "Prérequis vérifiés ✓"
}

# Test de connexion SSH
test_ssh_connection() {
    log "Test de connexion SSH vers $DEPLOY_HOST..."
    
    if ! ssh -o ConnectTimeout=10 -o BatchMode=yes $DEPLOY_USER@$DEPLOY_HOST exit; then
        error "Impossible de se connecter au serveur. Vérifiez vos clés SSH."
    fi
    
    log "Connexion SSH réussie ✓"
}

# Installation des dépendances système sur le serveur
install_system_dependencies() {
    log "Installation des dépendances système..."
    
    ssh $DEPLOY_USER@$DEPLOY_HOST << 'EOF'
        # Mise à jour du système
        apt update && apt upgrade -y
        
        # Installation des dépendances
        apt install -y curl wget git nginx mysql-server redis-server nodejs npm pm2
        
        # Configuration de MySQL
        systemctl start mysql
        systemctl enable mysql
        
        # Configuration de Redis
        systemctl start redis-server
        systemctl enable redis-server
        
        # Configuration de Nginx
        systemctl start nginx
        systemctl enable nginx
        
        # Configuration de PM2
        npm install -g pm2
        
        echo "Dépendances système installées ✓"
EOF
    
    log "Dépendances système installées ✓"
}

# Configuration de la base de données
setup_database() {
    log "Configuration de la base de données..."
    
    ssh $DEPLOY_USER@$DEPLOY_HOST << 'EOF'
        # Création de la base de données
        mysql -e "CREATE DATABASE IF NOT EXISTS audit_platform_saas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        mysql -e "CREATE USER IF NOT EXISTS 'audit_user'@'localhost' IDENTIFIED BY 'secure_password_2024';"
        mysql -e "GRANT ALL PRIVILEGES ON audit_platform_saas.* TO 'audit_user'@'localhost';"
        mysql -e "FLUSH PRIVILEGES;"
        
        echo "Base de données configurée ✓"
EOF
    
    log "Base de données configurée ✓"
}

# Déploiement du backend
deploy_backend() {
    log "Déploiement du backend..."
    
    # Synchronisation des fichiers
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'logs' \
        --exclude 'uploads' \
        --exclude '.env' \
        $BACKEND_DIR/ $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/backend/
    
    # Installation des dépendances et démarrage
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        cd $DEPLOY_PATH/backend
        
        # Installation des dépendances
        npm install --production
        
        # Création du fichier .env
        cat > .env << 'ENVEOF'
# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_NAME=audit_platform_saas
DB_USER=audit_user
DB_PASSWORD=secure_password_2024

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_EXPIRES_IN=7d

# Serveur
PORT=5000
NODE_ENV=production
FRONTEND_URL=http://$DEPLOY_HOST

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@e-defence.bf

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv

# SaaS Configuration
SAAS_MODE=true
DEFAULT_PLAN=trial
TRIAL_DURATION_DAYS=30

# Billing
BILLING_ENABLED=true
PAYMENT_GATEWAY=orange_money
INVOICE_PREFIX=INV-

# Multi-tenant
TENANT_ISOLATION=strict
MAX_ORGS_PER_SERVER=1000

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=$(openssl rand -base64 64)
CORS_ORIGIN=http://$DEPLOY_HOST

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Database Performance
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=10000
DB_POOL_EVICT=1000
DB_SSL=false

# 2FA Configuration
TWO_FACTOR_ENABLED=true
TWO_FACTOR_ISSUER=E-DEFENCE Audit Platform

# Payment Gateways
ORANGE_MERCHANT_KEY=your_orange_merchant_key
ORANGE_MERCHANT_SECRET=your_orange_merchant_secret
ORANGE_ACCESS_TOKEN=your_orange_access_token

MOBILE_MONEY_MERCHANT_ID=your_mobile_money_merchant_id
MOBILE_MONEY_API_KEY=your_mobile_money_api_key
MOBILE_MONEY_WEBHOOK_SECRET=your_mobile_money_webhook_secret

# Queue Configuration
QUEUE_REDIS_URL=redis://localhost:6379
QUEUE_CONCURRENCY=5

# Webhook Configuration
WEBHOOK_TIMEOUT=10000
WEBHOOK_RETRY_ATTEMPTS=3

# Port Management
AUTO_PORT_CONFIG=true
PORT_CONFIG_FILE=./config/ports.json

# API Public
API_PUBLIC_ENABLED=true
API_RATE_LIMIT=1000
API_RATE_WINDOW=3600000

# Security Enhancements
JWT_BLACKLIST_ENABLED=true
SESSION_TIMEOUT=86400000
MAX_LOGIN_ATTEMPTS=5
LOGIN_LOCKOUT_DURATION=900000
ENVEOF

        # Création des dossiers nécessaires
        mkdir -p logs uploads config
        
        # Configuration automatique des ports
        node -e "
        const portManager = require('./services/portManagerService');
        portManager.autoConfigurePorts().then(() => {
            console.log('Ports configurés automatiquement');
            process.exit(0);
        }).catch(err => {
            console.error('Erreur configuration ports:', err);
            process.exit(1);
        });
        "
        
        # Synchronisation de la base de données
        node -e "
        const { sequelize } = require('./models');
        sequelize.sync({ alter: true }).then(() => {
            console.log('Base de données synchronisée');
            process.exit(0);
        }).catch(err => {
            console.error('Erreur synchronisation DB:', err);
            process.exit(1);
        });
        "
        
        # Démarrage avec PM2
        pm2 delete audit-backend 2>/dev/null || true
        pm2 start server.js --name audit-backend --env production
        pm2 save
        pm2 startup
        
        echo "Backend déployé et démarré ✓"
EOF
    
    log "Backend déployé ✓"
}

# Déploiement du frontend
deploy_frontend() {
    log "Déploiement du frontend..."
    
    # Synchronisation des fichiers
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'build' \
        $FRONTEND_DIR/ $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/frontend/
    
    # Build et déploiement
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        cd $DEPLOY_PATH/frontend
        
        # Installation des dépendances
        npm install
        
        # Création du fichier .env
        cat > .env << 'ENVEOF'
REACT_APP_API_URL=http://$DEPLOY_HOST:5000
REACT_APP_VERSION=1.0.0
REACT_APP_ENVIRONMENT=production
ENVEOF
        
        # Build de production
        npm run build
        
        # Démarrage avec PM2
        pm2 delete audit-frontend 2>/dev/null || true
        pm2 serve build 3000 --name audit-frontend --spa
        pm2 save
        
        echo "Frontend déployé et démarré ✓"
EOF
    
    log "Frontend déployé ✓"
}

# Configuration de Nginx
configure_nginx() {
    log "Configuration de Nginx..."
    
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        # Configuration Nginx
        cat > /etc/nginx/sites-available/audit-platform << 'NGINXEOF'
server {
    listen 80;
    server_name $DEPLOY_HOST;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Uploads
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
    }
    
    # Metrics
    location /metrics {
        proxy_pass http://localhost:9090;
        proxy_set_header Host \$host;
    }
}
NGINXEOF
        
        # Activation du site
        ln -sf /etc/nginx/sites-available/audit-platform /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
        
        # Test et rechargement de Nginx
        nginx -t
        systemctl reload nginx
        
        echo "Nginx configuré ✓"
EOF
    
    log "Nginx configuré ✓"
}

# Configuration du firewall
configure_firewall() {
    log "Configuration du firewall..."
    
    ssh $DEPLOY_USER@$DEPLOY_HOST << 'EOF'
        # Configuration UFW
        ufw --force reset
        ufw default deny incoming
        ufw default allow outgoing
        
        # Ports autorisés
        ufw allow 22/tcp    # SSH
        ufw allow 80/tcp    # HTTP
        ufw allow 443/tcp   # HTTPS
        ufw allow 5000/tcp  # Backend API
        ufw allow 3000/tcp  # Frontend
        ufw allow 9090/tcp  # Metrics
        
        ufw --force enable
        
        echo "Firewall configuré ✓"
EOF
    
    log "Firewall configuré ✓"
}

# Configuration des sauvegardes automatiques
setup_backups() {
    log "Configuration des sauvegardes..."
    
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        # Création du script de sauvegarde
        cat > /usr/local/bin/backup-audit-platform.sh << 'BACKUPEOF'
#!/bin/bash

BACKUP_DIR="$BACKUP_PATH"
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="audit_platform_backup_\$DATE.tar.gz"

# Création du dossier de sauvegarde
mkdir -p \$BACKUP_DIR

# Sauvegarde de la base de données
mysqldump -u audit_user -psecure_password_2024 audit_platform_saas > \$BACKUP_DIR/database_\$DATE.sql

# Sauvegarde des fichiers
tar -czf \$BACKUP_DIR/\$BACKUP_FILE -C $DEPLOY_PATH .

# Nettoyage des anciennes sauvegardes (garde 7 jours)
find \$BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find \$BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Sauvegarde terminée: \$BACKUP_FILE"
BACKUPEOF
        
        chmod +x /usr/local/bin/backup-audit-platform.sh
        
        # Ajout au crontab (sauvegarde quotidienne à 2h du matin)
        (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-audit-platform.sh") | crontab -
        
        echo "Sauvegardes configurées ✓"
EOF
    
    log "Sauvegardes configurées ✓"
}

# Vérification du déploiement
verify_deployment() {
    log "Vérification du déploiement..."
    
    # Test des services
    ssh $DEPLOY_USER@$DEPLOY_HOST << 'EOF'
        # Vérification des services
        systemctl is-active --quiet mysql && echo "MySQL: ✓" || echo "MySQL: ✗"
        systemctl is-active --quiet redis-server && echo "Redis: ✓" || echo "Redis: ✗"
        systemctl is-active --quiet nginx && echo "Nginx: ✓" || echo "Nginx: ✗"
        
        # Vérification des processus PM2
        pm2 list
        
        # Test de l'API
        curl -f http://localhost:5000/health && echo "API Backend: ✓" || echo "API Backend: ✗"
        curl -f http://localhost:3000 && echo "Frontend: ✓" || echo "Frontend: ✗"
        
        echo "Vérification terminée"
EOF
    
    log "Vérification terminée ✓"
}

# Fonction principale
main() {
    log "Début du déploiement E-DEFENCE Audit Platform sur VPS Contabo"
    
    check_prerequisites
    test_ssh_connection
    install_system_dependencies
    setup_database
    deploy_backend
    deploy_frontend
    configure_nginx
    configure_firewall
    setup_backups
    verify_deployment
    
    log "Déploiement terminé avec succès! 🎉"
    info "Plateforme accessible sur: http://$DEPLOY_HOST"
    info "API Backend: http://$DEPLOY_HOST:5000"
    info "Frontend: http://$DEPLOY_HOST:3000"
    info "Métriques: http://$DEPLOY_HOST:9090"
    
    warn "N'oubliez pas de:"
    warn "1. Configurer les clés de paiement Orange Money/Mobile Money"
    warn "2. Configurer les paramètres SMTP pour les emails"
    warn "3. Configurer un certificat SSL pour HTTPS"
    warn "4. Tester toutes les fonctionnalités"
}

# Gestion des arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "update")
        log "Mise à jour du déploiement..."
        deploy_backend
        deploy_frontend
        configure_nginx
        verify_deployment
        log "Mise à jour terminée ✓"
        ;;
    "backup")
        log "Sauvegarde manuelle..."
        ssh $DEPLOY_USER@$DEPLOY_HOST "/usr/local/bin/backup-audit-platform.sh"
        log "Sauvegarde terminée ✓"
        ;;
    "status")
        log "Statut des services..."
        ssh $DEPLOY_USER@$DEPLOY_HOST "pm2 list && systemctl status mysql redis-server nginx"
        ;;
    *)
        echo "Usage: $0 {deploy|update|backup|status}"
        echo "  deploy  - Déploiement complet"
        echo "  update  - Mise à jour du code"
        echo "  backup  - Sauvegarde manuelle"
        echo "  status  - Statut des services"
        exit 1
        ;;
esac
