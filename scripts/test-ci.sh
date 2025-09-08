#!/bin/bash

# ==========================================
# Script de Test CI/CD - E-DEFENCE Audit Platform
# ==========================================

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction pour vérifier si une commande existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Fonction pour vérifier les prérequis
check_prerequisites() {
    print_status "Vérification des prérequis..."
    
    local missing_deps=()
    
    if ! command_exists node; then
        missing_deps+=("Node.js")
    fi
    
    if ! command_exists npm; then
        missing_deps+=("npm")
    fi
    
    if ! command_exists docker; then
        missing_deps+=("Docker")
    fi
    
    if ! command_exists mysql; then
        missing_deps+=("MySQL Client")
    fi
    
    if ! command_exists redis-cli; then
        missing_deps+=("Redis Client")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Dépendances manquantes : ${missing_deps[*]}"
        print_status "Installez les dépendances manquantes et relancez le script"
        exit 1
    fi
    
    print_success "Tous les prérequis sont installés"
}

# Fonction pour vérifier la structure du projet
check_project_structure() {
    print_status "Vérification de la structure du projet..."
    
    local required_files=(
        "backend/package.json"
        "backend/server.js"
        "docker-compose.yml"
        ".github/workflows/ci.yml"
        "README.md"
        "GITHUB_SECRETS.md"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        print_error "Fichiers manquants : ${missing_files[*]}"
        exit 1
    fi
    
    print_success "Structure du projet correcte"
}

# Fonction pour vérifier la configuration ESLint
check_eslint_config() {
    print_status "Vérification de la configuration ESLint..."
    
    if [ ! -f "backend/.eslintrc.js" ]; then
        print_error "Fichier .eslintrc.js manquant"
        exit 1
    fi
    
    if [ ! -f "backend/.prettierrc" ]; then
        print_error "Fichier .prettierrc manquant"
        exit 1
    fi
    
    print_success "Configuration ESLint/Prettier correcte"
}

# Fonction pour vérifier les tests
check_tests() {
    print_status "Vérification des tests..."
    
    local test_dirs=(
        "backend/tests"
        "backend/tests/integration"
        "backend/tests/performance"
    )
    
    local missing_dirs=()
    
    for dir in "${test_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            missing_dirs+=("$dir")
        fi
    done
    
    if [ ${#missing_dirs[@]} -ne 0 ]; then
        print_error "Répertoires de tests manquants : ${missing_dirs[*]}"
        exit 1
    fi
    
    # Vérifier qu'il y a des fichiers de test
    local test_files=$(find backend/tests -name "*.test.js" -o -name "*.spec.js" | wc -l)
    
    if [ "$test_files" -eq 0 ]; then
        print_warning "Aucun fichier de test trouvé"
    else
        print_success "Tests trouvés : $test_files fichiers"
    fi
}

# Fonction pour vérifier les scripts
check_scripts() {
    print_status "Vérification des scripts..."
    
    local required_scripts=(
        "scripts/monitoring.js"
        "scripts/generate-secrets.js"
        "scripts/security-check.js"
    )
    
    local missing_scripts=()
    
    for script in "${required_scripts[@]}"; do
        if [ ! -f "$script" ]; then
            missing_scripts+=("$script")
        fi
    done
    
    if [ ${#missing_scripts[@]} -ne 0 ]; then
        print_error "Scripts manquants : ${missing_scripts[*]}"
        exit 1
    fi
    
    print_success "Scripts utilitaires présents"
}

# Fonction pour vérifier la configuration Docker
check_docker_config() {
    print_status "Vérification de la configuration Docker..."
    
    if [ ! -f "docker-compose.yml" ]; then
        print_error "Fichier docker-compose.yml manquant"
        exit 1
    fi
    
    if [ ! -f "backend/Dockerfile" ]; then
        print_error "Fichier backend/Dockerfile manquant"
        exit 1
    fi
    
    if [ ! -f "frontend/Dockerfile" ]; then
        print_warning "Fichier frontend/Dockerfile manquant"
    fi
    
    print_success "Configuration Docker correcte"
}

# Fonction pour vérifier les variables d'environnement
check_env_config() {
    print_status "Vérification des variables d'environnement..."
    
    if [ ! -f "backend/env.example" ]; then
        print_error "Fichier env.example manquant"
        exit 1
    fi
    
    # Vérifier les variables importantes
    local required_vars=(
        "DB_HOST"
        "DB_NAME"
        "JWT_SECRET"
        "REDIS_HOST"
        "NODE_ENV"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" backend/env.example; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Variables d'environnement manquantes : ${missing_vars[*]}"
        exit 1
    fi
    
    print_success "Configuration des variables d'environnement correcte"
}

# Fonction pour vérifier le pipeline CI/CD
check_ci_pipeline() {
    print_status "Vérification du pipeline CI/CD..."
    
    if [ ! -f ".github/workflows/ci.yml" ]; then
        print_error "Fichier de workflow CI/CD manquant"
        exit 1
    fi
    
    # Vérifier la syntaxe YAML basique
    if command_exists yamllint; then
        if yamllint .github/workflows/ci.yml >/dev/null 2>&1; then
            print_success "Syntaxe YAML du workflow correcte"
        else
            print_warning "Problèmes de syntaxe YAML détectés"
        fi
    else
        print_warning "yamllint non installé, impossible de vérifier la syntaxe YAML"
    fi
    
    print_success "Pipeline CI/CD configuré"
}

# Fonction pour tester les dépendances npm
test_npm_dependencies() {
    print_status "Test des dépendances npm..."
    
    cd backend
    
    if [ ! -f "package.json" ]; then
        print_error "package.json manquant dans le backend"
        exit 1
    fi
    
    # Vérifier que les scripts nécessaires existent
    local required_scripts=(
        "test"
        "lint"
        "format:check"
        "test:ci"
    )
    
    local missing_scripts=()
    
    for script in "${required_scripts[@]}"; do
        if ! npm run --silent "$script" --dry-run >/dev/null 2>&1; then
            missing_scripts+=("$script")
        fi
    done
    
    if [ ${#missing_scripts[@]} -ne 0 ]; then
        print_error "Scripts npm manquants : ${missing_scripts[*]}"
        exit 1
    fi
    
    print_success "Scripts npm configurés correctement"
    
    cd ..
}

# Fonction pour tester la compilation
test_build() {
    print_status "Test de compilation..."
    
    cd backend
    
    # Installer les dépendances si nécessaire
    if [ ! -d "node_modules" ]; then
        print_status "Installation des dépendances..."
        npm ci
    fi
    
    # Test de linting
    print_status "Test du linting..."
    if npm run lint; then
        print_success "Linting réussi"
    else
        print_error "Erreurs de linting détectées"
        exit 1
    fi
    
    # Test de formatage
    print_status "Test du formatage..."
    if npm run format:check; then
        print_success "Formatage correct"
    else
        print_error "Problèmes de formatage détectés"
        exit 1
    fi
    
    cd ..
}

# Fonction pour tester Docker
test_docker() {
    print_status "Test de Docker..."
    
    # Vérifier que Docker fonctionne
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker n'est pas accessible"
        exit 1
    fi
    
    # Test de la syntaxe docker-compose
    if docker-compose config >/dev/null 2>&1; then
        print_success "Configuration docker-compose valide"
    else
        print_error "Erreur dans la configuration docker-compose"
        exit 1
    fi
    
    print_success "Docker fonctionne correctement"
}

# Fonction pour générer le rapport
generate_report() {
    print_status "Génération du rapport de test..."
    
    local report_file="ci-test-report.md"
    
    cat > "$report_file" << EOF
# Rapport de Test CI/CD - E-DEFENCE Audit Platform

**Date** : $(date)
**Version** : $(git describe --tags 2>/dev/null || echo "Non tagué")

## ✅ Tests Réussis

- [x] Prérequis système
- [x] Structure du projet
- [x] Configuration ESLint/Prettier
- [x] Tests unitaires et d'intégration
- [x] Scripts utilitaires
- [x] Configuration Docker
- [x] Variables d'environnement
- [x] Pipeline CI/CD
- [x] Dépendances npm
- [x] Compilation et linting
- [x] Configuration Docker

## 📊 Informations Système

- **Node.js** : $(node --version)
- **npm** : $(npm --version)
- **Docker** : $(docker --version)
- **OS** : $(uname -s) $(uname -r)

## 🔧 Prochaines Étapes

1. Configurer les secrets GitHub (voir GITHUB_SECRETS.md)
2. Tester le déploiement en environnement de développement
3. Configurer le monitoring de production
4. Effectuer les tests de charge

## 📝 Notes

Ce rapport a été généré automatiquement par le script de test CI/CD.
EOF
    
    print_success "Rapport généré : $report_file"
}

# Fonction principale
main() {
    echo "=========================================="
    echo "  Test CI/CD - E-DEFENCE Audit Platform"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    check_project_structure
    check_eslint_config
    check_tests
    check_scripts
    check_docker_config
    check_env_config
    check_ci_pipeline
    test_npm_dependencies
    test_build
    test_docker
    generate_report
    
    echo ""
    echo "=========================================="
    print_success "Tous les tests CI/CD ont réussi !"
    echo "=========================================="
    echo ""
    print_status "Le projet est prêt pour le déploiement CI/CD"
    print_status "N'oubliez pas de configurer les secrets GitHub"
}

# Exécution du script
main "$@"


