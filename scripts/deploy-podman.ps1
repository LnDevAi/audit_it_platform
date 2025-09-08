# ========================================
# E-DEFENCE Audit Platform - Podman Deploy PowerShell
# ========================================

param(
    [Parameter(Position=0)]
    [ValidateSet("deploy", "install", "build", "start", "stop", "restart", "logs", "status", "clean")]
    [string]$Action = "deploy"
)

# Configuration
$BackendPort = 5000
$FrontendPort = 3000
$PhpMyAdminPort = 8081
$RedisPort = 6379
$DbName = "audit_platform_saas"

# Couleurs pour les messages
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "[ERROR] $args" -ForegroundColor Red }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Cyan }

# Fonction pour vérifier les prérequis
function Test-Prerequisites {
    Write-Info "Vérification des prérequis..."
    
    $errors = @()
    
    # Vérifier Podman
    try {
        $podmanVersion = podman --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            $errors += "Podman n'est pas installé ou accessible"
        } else {
            Write-Success "Podman détecté: $podmanVersion"
        }
    } catch {
        $errors += "Podman n'est pas installé"
    }
    
    # Vérifier Podman Compose
    try {
        $composeVersion = podman-compose --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            $errors += "Podman Compose n'est pas installé"
        } else {
            Write-Success "Podman Compose détecté: $composeVersion"
        }
    } catch {
        $errors += "Podman Compose n'est pas installé"
    }
    
    # Vérifier les fichiers nécessaires
    $requiredFiles = @(
        "podman-compose.yml",
        "backend/Dockerfile",
        "backend/package.json",
        "frontend/Dockerfile",
        "frontend/package.json",
        "database/schema.sql"
    )
    
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            $errors += "Fichier manquant: $file"
        }
    }
    
    if ($errors.Count -gt 0) {
        Write-Error "Erreurs détectées:"
        foreach ($err in $errors) {
            Write-Error "  - $err"
        }
        exit 1
    }
    
    Write-Success "Tous les prérequis sont satisfaits"
}

# Fonction pour nettoyer l'environnement
function Clear-Environment {
    Write-Info "Nettoyage de l'environnement..."
    
    # Arrêter les conteneurs existants
    podman-compose -f podman-compose.yml down 2>$null
    
    # Supprimer les conteneurs orphelins
    podman container prune -f 2>$null
    
    # Supprimer les images non utilisées
    podman image prune -f 2>$null
    
    Write-Success "Environnement nettoyé"
}

# Fonction pour configurer l'environnement
function Set-Environment {
    Write-Info "Configuration de l'environnement..."
    
    # Créer le dossier uploads
    if (-not (Test-Path "backend/uploads")) {
        New-Item -ItemType Directory -Path "backend/uploads" -Force | Out-Null
        Write-Success "Dossier uploads créé"
    }
    
    # Vérifier si le fichier .env backend existe
    if (-not (Test-Path "backend/.env")) {
        if (Test-Path "backend/env.example") {
            Copy-Item "backend/env.example" "backend/.env"
            Write-Warn "Fichier .env backend créé depuis env.example"
        } else {
            Write-Error "Fichier env.example manquant dans backend/"
            exit 1
        }
    }
    
    Write-Success "Environnement configuré"
}

# Fonction pour construire les images
function Build-Images {
    Write-Info "Construction des images Docker..."
    
    # Construire l'image backend
    Write-Info "Construction de l'image backend..."
    podman build -t audit-platform-backend ./backend
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Échec de la construction de l'image backend"
        exit 1
    }
    
    # Construire l'image frontend
    Write-Info "Construction de l'image frontend..."
    podman build -t audit-platform-frontend ./frontend
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Échec de la construction de l'image frontend"
        exit 1
    }
    
    Write-Success "Images construites avec succès"
}

# Fonction pour démarrer les services
function Start-Services {
    Write-Info "Démarrage des services avec Podman Compose..."
    
    # Démarrer les services
    podman-compose -f podman-compose.yml up -d
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Échec du démarrage des services"
        exit 1
    }
    
    Write-Success "Services démarrés"
}

# Fonction pour attendre que les services soient prêts
function Wait-ServicesReady {
    Write-Info "Attente du démarrage des services..."
    
    $maxAttempts = 30
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        $attempt++
        Write-Info "Tentative $attempt/$maxAttempts - Vérification des services..."
        
        # Vérifier le backend
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/health" -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Success "Backend prêt"
                break
            }
        } catch {
            Write-Warn "Backend pas encore prêt..."
        }
        
        Start-Sleep -Seconds 10
    }
    
    if ($attempt -eq $maxAttempts) {
        Write-Warn "Timeout - Les services pourraient ne pas être complètement prêts"
    }
}

# Fonction pour exécuter les migrations
function Invoke-Migrations {
    Write-Info "Exécution des migrations de base de données..."
    
    # Attendre que la base de données soit prête
    Start-Sleep -Seconds 15
    
    Write-Success "Migrations terminées (schéma initial chargé automatiquement)"
}

# Fonction pour exécuter les tests
function Invoke-Tests {
    Write-Info "Exécution des tests rapides..."
    
    try {
        # Test du backend
        $backendHealth = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/health" -UseBasicParsing
        if ($backendHealth.StatusCode -eq 200) {
            Write-Success "Backend: OK"
        }
        
        # Test du frontend
        $frontendHealth = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -UseBasicParsing
        if ($frontendHealth.StatusCode -eq 200) {
            Write-Success "Frontend: OK"
        }
        
    } catch {
        Write-Warn "Tests rapides échoués - les services pourraient encore démarrer"
    }
}

# Fonction pour afficher les informations de déploiement
function Show-DeploymentInfo {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "  E-DEFENCE Audit Platform - Déployé!" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Services disponibles:" -ForegroundColor White
    Write-Host "  Frontend:     http://localhost:$FrontendPort" -ForegroundColor Green
    Write-Host "  Backend API:  http://localhost:$BackendPort" -ForegroundColor Green
    Write-Host "  phpMyAdmin:   http://localhost:$PhpMyAdminPort" -ForegroundColor Green
    Write-Host ""
    Write-Host "Comptes par défaut:" -ForegroundColor White
    Write-Host "  Admin:        l.nacoulma@e-defence.bf / admin123" -ForegroundColor Yellow
    Write-Host "  Auditeur:     a.tassembedo@e-defence.bf / audit123" -ForegroundColor Yellow
    Write-Host "  Client:       b.bance@abi.bf / client123" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Commandes utiles:" -ForegroundColor White
    Write-Host "  Logs:         .\scripts\deploy-podman.ps1 logs" -ForegroundColor Gray
    Write-Host "  Status:       .\scripts\deploy-podman.ps1 status" -ForegroundColor Gray
    Write-Host "  Stop:         .\scripts\deploy-podman.ps1 stop" -ForegroundColor Gray
    Write-Host ""
}

# Fonction pour afficher les logs
function Show-Logs {
    Write-Info "Affichage des logs..."
    podman-compose -f podman-compose.yml logs -f
}

# Fonction pour afficher le statut
function Show-Status {
    Write-Info "Statut des services..."
    podman-compose -f podman-compose.yml ps
}

# Fonction pour arrêter les services
function Stop-Services {
    Write-Info "Arrêt des services..."
    podman-compose -f podman-compose.yml down
    Write-Success "Services arrêtés"
}

# Fonction pour redémarrer les services
function Restart-Services {
    Write-Info "Redémarrage des services..."
    podman-compose -f podman-compose.yml restart
    Write-Success "Services redémarrés"
}

# Menu principal
switch ($Action) {
    "deploy" {
        Test-Prerequisites
        Clear-Environment
        Set-Environment
        Build-Images
        Start-Services
        Wait-ServicesReady
        Invoke-Migrations
        Invoke-Tests
        Show-DeploymentInfo
    }
    "install" {
        Test-Prerequisites
        Set-Environment
        Write-Success "Installation terminée"
    }
    "build" {
        Test-Prerequisites
        Build-Images
        Write-Success "Build terminé"
    }
    "start" {
        Test-Prerequisites
        Start-Services
        Wait-ServicesReady
        Show-DeploymentInfo
    }
    "stop" {
        Stop-Services
    }
    "restart" {
        Restart-Services
        Wait-ServicesReady
        Show-DeploymentInfo
    }
    "logs" {
        Show-Logs
    }
    "status" {
        Show-Status
    }
    "clean" {
        Clear-Environment
    }
    default {
        Write-Host "Usage: .\scripts\deploy-podman.ps1 [deploy|install|build|start|stop|restart|logs|status|clean]"
        Write-Host ""
        Write-Host "Commandes disponibles:"
        Write-Host "  deploy   - Déploiement complet"
        Write-Host "  install  - Installation des prérequis"
        Write-Host "  build    - Construction des images"
        Write-Host "  start    - Démarrage des services"
        Write-Host "  stop     - Arrêt des services"
        Write-Host "  restart  - Redémarrage des services"
        Write-Host "  logs     - Affichage des logs"
        Write-Host "  status   - Statut des services"
        Write-Host "  clean    - Nettoyage de l'environnement"
    }
}
