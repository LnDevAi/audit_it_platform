# Script de démarrage automatique E-DEFENCE Audit Platform
# PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   E-DEFENCE Audit Platform" -ForegroundColor Cyan
Write-Host "   Démarrage automatique" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Fonction pour vérifier si une commande existe
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Vérification des prérequis
Write-Host "Vérification des prérequis..." -ForegroundColor Yellow

if (-not (Test-Command "node")) {
    Write-Host "ERREUR: Node.js n'est pas installé" -ForegroundColor Red
    Write-Host "Veuillez installer Node.js depuis https://nodejs.org/" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

if (-not (Test-Command "mysql")) {
    Write-Host "ERREUR: MySQL n'est pas installé" -ForegroundColor Red
    Write-Host "Veuillez installer MySQL depuis https://dev.mysql.com/downloads/" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

if (-not (Test-Command "redis-server")) {
    Write-Host "ERREUR: Redis n'est pas installé" -ForegroundColor Red
    Write-Host "Veuillez installer Redis depuis https://redis.io/download" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host "Vérification des prérequis... OK" -ForegroundColor Green
Write-Host ""

# Aller dans le dossier backend
Set-Location backend

# Vérifier si les dépendances sont installées
if (-not (Test-Path "node_modules")) {
    Write-Host "Installation des dépendances..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERREUR: Échec de l'installation des dépendances" -ForegroundColor Red
        Read-Host "Appuyez sur Entrée pour quitter"
        exit 1
    }
}

Write-Host "Dépendances installées... OK" -ForegroundColor Green
Write-Host ""

# Créer le fichier .env s'il n'existe pas
if (-not (Test-Path ".env")) {
    Write-Host "Création du fichier .env..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host ""
    Write-Host "ATTENTION: Veuillez configurer le fichier .env avec vos paramètres" -ForegroundColor Yellow
    Write-Host "- Base de données MySQL" -ForegroundColor Yellow
    Write-Host "- Clés de paiement Orange Money/Mobile Money" -ForegroundColor Yellow
    Write-Host "- Configuration SMTP pour les emails" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Appuyez sur Entrée pour continuer"
}

Write-Host "Configuration... OK" -ForegroundColor Green
Write-Host ""

# Démarrer les services
Write-Host "Démarrage des services..." -ForegroundColor Yellow
Write-Host ""

# Démarrer MySQL
Write-Host "Démarrage de MySQL..." -ForegroundColor Yellow
try {
    Start-Service mysql -ErrorAction SilentlyContinue
    Write-Host "MySQL démarré... OK" -ForegroundColor Green
} catch {
    Write-Host "ATTENTION: Impossible de démarrer MySQL automatiquement" -ForegroundColor Yellow
    Write-Host "Veuillez démarrer MySQL manuellement" -ForegroundColor Yellow
}

# Démarrer Redis
Write-Host "Démarrage de Redis..." -ForegroundColor Yellow
try {
    Start-Process -FilePath "redis-server" -WindowStyle Hidden
    Start-Sleep -Seconds 2
    Write-Host "Redis démarré... OK" -ForegroundColor Green
} catch {
    Write-Host "ATTENTION: Impossible de démarrer Redis automatiquement" -ForegroundColor Yellow
    Write-Host "Veuillez démarrer Redis manuellement" -ForegroundColor Yellow
}

# Démarrer le backend
Write-Host "Démarrage du backend..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Plateforme E-DEFENCE démarrée!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Backend: http://localhost:5000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "Métriques: http://localhost:9090" -ForegroundColor Green
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Yellow
Write-Host ""

# Démarrer en mode automatique
npm run auto

Read-Host "Appuyez sur Entrée pour quitter"
