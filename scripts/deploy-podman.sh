#!/bin/bash

echo "========================================="
echo "  E-DEFENCE Audit Platform - Podman Deploy"
echo "========================================="
echo

# Configuration
BACKEND_PORT=5000
FRONTEND_PORT=3000
PHPMYADMIN_PORT=8081
DB_NAME=audit_platform_saas

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
    
    if ! command -v podman &> /dev/null; then
        log_error "Podman n'est pas installé"
        log_info "Installation sur Ubuntu/Debian: sudo apt install podman"
        log_info "Installation sur RHEL/CentOS: sudo dnf install podman"
        exit 1
    fi
    
    if ! command -v podman-compose &> /dev/null; then
        log_error "Podman Compose n'est pas installé"
        log_info "Installation: pip3 install podman-compose"
        exit 1
    fi
    
    log_info "Tous les prérequis sont satisfaits"
}

# Vérification des ports
check_ports() {
    log_info "Vérification des ports..."
    
    # Vérifier le port 8081 (phpMyAdmin)
    if netstat -tuln | grep -q ":8081 "; then
        log_error "Le port 8081 est déjà utilisé"
        log_info "Veuillez modifier le port dans podman-compose.yml"
        exit 1
    fi
    
    # Vérifier le port 5000 (Backend)
    if netstat -tuln | grep -q ":5000 "; then
        log_warn "Le port 5000 est déjà utilisé"
        read -p "Continuer quand même ? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Vérifier le port 3000 (Frontend)
    if netstat -tuln | grep -q ":3000 "; then
        log_warn "Le port 3000 est déjà utilisé"
        read -p "Continuer quand même ? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_info "Vérification des ports terminée"
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

# Démarrage des services avec Podman Compose
start_services() {
    log_info "Démarrage des services avec Podman Compose..."
    
    # Créer le dossier uploads
    mkdir -p backend/uploads
    
    # Arrêter les conteneurs existants
    podman-compose -f podman-compose.yml down 2>/dev/null || true
    
    # Démarrer les services
    podman-compose -f podman-compose.yml up -d
    
    if [ $? -ne 0 ]; then
        log_error "Échec du démarrage des services"
        exit 1
    fi
    
    log_info "Services démarrés avec succès"
    
    # Attendre que les services soient prêts
    log_info "Attente du démarrage des services..."
    sleep 10
    
    # Vérifier si les services fonctionnent
    if curl -f http://localhost:${BACKEND_PORT}/api/health &> /dev/null; then
        log_info "Backend démarré avec succès"
    else
        log_warn "Le backend pourrait ne pas être prêt"
    fi
}

# Fonction pour arrêter les services
stop_services() {
    log_info "Arrêt des services..."
    podman-compose -f podman-compose.yml down
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

# Afficher les logs
show_logs() {
    log_info "Affichage des logs..."
    podman-compose -f podman-compose.yml logs -f
}

# Redémarrage des services
restart_services() {
    log_info "Redémarrage des services..."
    podman-compose -f podman-compose.yml restart
    log_info "Services redémarrés"
}

# Menu principal
case "$1" in
    "install")
        check_prerequisites
        check_ports
        install_dependencies
        log_info "Installation terminée avec succès!"
        ;;
    "build")
        install_dependencies
        build_frontend
        log_info "Build terminé avec succès!"
        ;;
    "start")
        check_prerequisites
        check_ports
        start_services
        log_info "Plateforme démarrée avec succès!"
        log_info "Frontend: http://localhost:${FRONTEND_PORT}"
        log_info "Backend API: http://localhost:${BACKEND_PORT}"
        log_info "phpMyAdmin: http://localhost:${PHPMYADMIN_PORT}"
        log_info "Utilisez 'podman-compose logs -f' pour voir les logs"
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "logs")
        show_logs
        ;;
    "status")
        log_info "Statut des conteneurs:"
        podman ps --filter "name=audit_platform"
        ;;
    "deploy")
        check_prerequisites
        check_ports
        install_dependencies
        build_frontend
        start_services
        log_info "Déploiement terminé avec succès!"
        log_info "Frontend: http://localhost:${FRONTEND_PORT}"
        log_info "Backend API: http://localhost:${BACKEND_PORT}"
        log_info "phpMyAdmin: http://localhost:${PHPMYADMIN_PORT}"
        log_info ""
        log_info "Comptes par défaut:"
        log_info "- Super Admin: l.nacoulma@e-defence.bf / admin123"
        log_info "- ABI Admin: b.bance@abi.bf / client123"
        log_info "- Auditeur: a.tassembedo@e-defence.bf / audit123"
        ;;
    *)
        echo "Usage: $0 {install|build|start|stop|restart|logs|status|deploy}"
        echo
        echo "Commandes disponibles:"
        echo "  install  - Installer les dépendances"
        echo "  build    - Builder le frontend pour la production"
        echo "  start    - Démarrer la plateforme avec Podman"
        echo "  stop     - Arrêter la plateforme"
        echo "  restart  - Redémarrer la plateforme"
        echo "  logs     - Afficher les logs en temps réel"
        echo "  status   - Afficher le statut des conteneurs"
        echo "  deploy   - Déploiement complet (install + build + start)"
        echo
        echo "Exemple: $0 deploy"
        exit 1
        ;;
esac
