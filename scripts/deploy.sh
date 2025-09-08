#!/bin/bash

echo "========================================="
echo "  E-DEFENCE Audit Platform - Deployment"
echo "========================================="
echo

# Configuration
BACKEND_PORT=5000
FRONTEND_PORT=3000
DB_NAME=audit_platform

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérification des prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js n'est pas installé"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm n'est pas installé"
        exit 1
    fi
    
    if ! command -v mysql &> /dev/null; then
        log_error "MySQL n'est pas installé"
        exit 1
    fi
    
    log_info "Tous les prérequis sont satisfaits"
}

# Installation des dépendances
install_dependencies() {
    log_info "Installation des dépendances backend..."
    cd backend
    npm ci --production
    if [ $? -ne 0 ]; then
        log_error "Échec de l'installation des dépendances backend"
        exit 1
    fi
    
    log_info "Installation des dépendances frontend..."
    cd ../frontend
    npm ci
    if [ $? -ne 0 ]; then
        log_error "Échec de l'installation des dépendances frontend"
        exit 1
    fi
    
    cd ..
}

# Configuration de la base de données
setup_database() {
    log_info "Configuration de la base de données..."
    
    # Vérifier si le fichier .env existe
    if [ ! -f "backend/.env" ]; then
        log_warn "Fichier .env non trouvé, copie depuis .env.example"
        cp backend/.env.example backend/.env
        log_warn "Veuillez configurer backend/.env avant de continuer"
        read -p "Appuyez sur Entrée après avoir configuré .env..."
    fi
    
    # Charger les variables d'environnement
    source backend/.env
    
    # Créer la base de données
    log_info "Création de la base de données..."
    mysql -h ${DB_HOST} -u ${DB_USER} -p${DB_PASSWORD} < database/schema.sql
    if [ $? -ne 0 ]; then
        log_error "Échec de la création de la base de données"
        exit 1
    fi
}

# Build du frontend
build_frontend() {
    log_info "Build du frontend pour la production..."
    cd frontend
    npm run build
    if [ $? -ne 0 ]; then
        log_error "Échec du build frontend"
        exit 1
    fi
    cd ..
}

# Démarrage des services
start_services() {
    log_info "Démarrage des services..."
    
    # Créer le dossier uploads
    mkdir -p backend/uploads
    
    # Démarrer le backend
    log_info "Démarrage du backend sur le port ${BACKEND_PORT}..."
    cd backend
    npm start &
    BACKEND_PID=$!
    cd ..
    
    # Attendre que le backend soit prêt
    sleep 5
    
    # Vérifier si le backend fonctionne
    if curl -f http://localhost:${BACKEND_PORT}/api/health &> /dev/null; then
        log_info "Backend démarré avec succès"
    else
        log_error "Le backend n'a pas pu démarrer"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    # Servir le frontend (avec un serveur simple)
    log_info "Démarrage du serveur frontend sur le port ${FRONTEND_PORT}..."
    cd frontend
    npx serve -s build -l ${FRONTEND_PORT} &
    FRONTEND_PID=$!
    cd ..
    
    # Sauvegarder les PIDs
    echo $BACKEND_PID > backend.pid
    echo $FRONTEND_PID > frontend.pid
}

# Fonction pour arrêter les services
stop_services() {
    log_info "Arrêt des services..."
    
    if [ -f backend.pid ]; then
        kill $(cat backend.pid) 2>/dev/null
        rm backend.pid
    fi
    
    if [ -f frontend.pid ]; then
        kill $(cat frontend.pid) 2>/dev/null
        rm frontend.pid
    fi
    
    log_info "Services arrêtés"
}

# Fonction de nettoyage
cleanup() {
    log_info "Nettoyage..."
    stop_services
    exit 0
}

# Gestion des signaux
trap cleanup SIGINT SIGTERM

# Menu principal
case "$1" in
    "install")
        check_prerequisites
        install_dependencies
        setup_database
        log_info "Installation terminée avec succès!"
        ;;
    "build")
        install_dependencies
        build_frontend
        log_info "Build terminé avec succès!"
        ;;
    "start")
        start_services
        log_info "Plateforme démarrée avec succès!"
        log_info "Frontend: http://localhost:${FRONTEND_PORT}"
        log_info "Backend API: http://localhost:${BACKEND_PORT}"
        log_info "Appuyez sur Ctrl+C pour arrêter"
        wait
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        stop_services
        sleep 2
        start_services
        log_info "Plateforme redémarrée avec succès!"
        ;;
    "deploy")
        check_prerequisites
        install_dependencies
        setup_database
        build_frontend
        start_services
        log_info "Déploiement terminé avec succès!"
        log_info "Frontend: http://localhost:${FRONTEND_PORT}"
        log_info "Backend API: http://localhost:${BACKEND_PORT}"
        ;;
    *)
        echo "Usage: $0 {install|build|start|stop|restart|deploy}"
        echo
        echo "Commandes disponibles:"
        echo "  install  - Installer les dépendances et configurer la DB"
        echo "  build    - Builder le frontend pour la production"
        echo "  start    - Démarrer la plateforme"
        echo "  stop     - Arrêter la plateforme"
        echo "  restart  - Redémarrer la plateforme"
        echo "  deploy   - Déploiement complet (install + build + start)"
        exit 1
        ;;
esac
