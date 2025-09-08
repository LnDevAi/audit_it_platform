# ==========================================
# Script de Test Postman - E-DEFENCE Audit Platform
# ==========================================

param(
    [string]$CollectionPath = "postman/E-DEFENCE_Audit_Platform.postman_collection.json",
    [string]$EnvironmentPath = "postman/E-DEFENCE_Environment.postman_environment.json",
    [string]$ReportPath = "postman-test-report.html",
    [switch]$InstallNewman,
    [switch]$Verbose
)

# Configuration des couleurs
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$White = "White"

# Fonction pour afficher les messages
function Write-Status {
    param([string]$Message, [string]$Color = $White)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-Status $Message $Green
}

function Write-Error {
    param([string]$Message)
    Write-Status $Message $Red
}

function Write-Warning {
    param([string]$Message)
    Write-Status $Message $Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Status $Message $Blue
}

# Fonction pour vérifier les prérequis
function Test-Prerequisites {
    Write-Info "Vérification des prérequis..."
    
    # Vérifier Node.js
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Node.js n'est pas installé"
            return $false
        }
        Write-Success "Node.js détecté: $nodeVersion"
    } catch {
        Write-Error "Node.js n'est pas installé"
        return $false
    }
    
    # Vérifier npm
    try {
        $npmVersion = npm --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Error "npm n'est pas installé"
            return $false
        }
        Write-Success "npm détecté: $npmVersion"
    } catch {
        Write-Error "npm n'est pas installé"
        return $false
    }
    
    # Vérifier Newman
    try {
        $newmanVersion = newman --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Newman n'est pas installé"
            if ($InstallNewman) {
                Write-Info "Installation de Newman..."
                npm install -g newman
                if ($LASTEXITCODE -ne 0) {
                    Write-Error "Erreur lors de l'installation de Newman"
                    return $false
                }
                Write-Success "Newman installé avec succès"
            } else {
                Write-Error "Newman n'est pas installé. Utilisez -InstallNewman pour l'installer"
                return $false
            }
        } else {
            Write-Success "Newman détecté: $newmanVersion"
        }
    } catch {
        Write-Error "Erreur lors de la vérification de Newman"
        return $false
    }
    
    # Vérifier les fichiers Postman
    if (-not (Test-Path $CollectionPath)) {
        Write-Error "Collection Postman introuvable: $CollectionPath"
        return $false
    }
    
    if (-not (Test-Path $EnvironmentPath)) {
        Write-Error "Environnement Postman introuvable: $EnvironmentPath"
        return $false
    }
    
    Write-Success "Tous les prérequis sont satisfaits"
    return $true
}

# Fonction pour vérifier que l'API est accessible
function Test-APIAccessibility {
    Write-Info "Vérification de l'accessibilité de l'API..."
    
    $baseUrl = "http://localhost:5000"
    $maxAttempts = 10
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        $attempt++
        Write-Info "Tentative $attempt/$maxAttempts de connexion à l'API..."
        
        try {
            $response = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing -TimeoutSec 10 2>$null
            if ($response.StatusCode -eq 200) {
                Write-Success "API accessible sur $baseUrl"
                return $true
            }
        } catch {
            Write-Info "API pas encore accessible, attente..."
            Start-Sleep -Seconds 5
        }
    }
    
    Write-Error "L'API n'est pas accessible après $maxAttempts tentatives"
    Write-Warning "Assurez-vous que l'application est démarrée avec: .\scripts\deploy-podman.ps1"
    return $false
}

# Fonction pour exécuter les tests Postman
function Invoke-PostmanTests {
    Write-Info "Exécution des tests Postman..."
    
    # Préparer les arguments Newman
    $newmanArgs = @(
        "run",
        $CollectionPath,
        "--environment=$EnvironmentPath",
        "--reporters=cli,html",
        "--reporter-html-export=$ReportPath",
        "--timeout-request=10000",
        "--timeout-script=10000",
        "--bail"
    )
    
    if ($Verbose) {
        $newmanArgs += "--verbose"
    }
    
    # Exécuter Newman
    Write-Info "Lancement de Newman avec les arguments: $($newmanArgs -join ' ')"
    
    $newmanCommand = "newman $($newmanArgs -join ' ')"
    $result = Invoke-Expression $newmanCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Tests Postman exécutés avec succès"
        return $true
    } else {
        Write-Error "Erreur lors de l'exécution des tests Postman"
        return $false
    }
}

# Fonction pour analyser les résultats
function Analyze-Results {
    Write-Info "Analyse des résultats..."
    
    if (Test-Path $ReportPath) {
        Write-Success "Rapport HTML généré: $ReportPath"
        
        # Ouvrir le rapport dans le navigateur
        Write-Info "Ouverture du rapport dans le navigateur..."
        Start-Process $ReportPath
    } else {
        Write-Warning "Aucun rapport HTML généré"
    }
    
    # Afficher un résumé
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor $Green
    Write-Host "  Résumé des Tests Postman" -ForegroundColor $Green
    Write-Host "==========================================" -ForegroundColor $Green
    Write-Host ""
    Write-Host "📊 Fichiers générés:" -ForegroundColor $Blue
    Write-Host "  - Rapport HTML: $ReportPath" -ForegroundColor $White
    Write-Host ""
    Write-Host "🔧 Commandes utiles:" -ForegroundColor $Blue
    Write-Host "  - Relancer les tests: .\scripts\test-postman.ps1" -ForegroundColor $White
    Write-Host "  - Tests avec verbose: .\scripts\test-postman.ps1 -Verbose" -ForegroundColor $White
    Write-Host "  - Installer Newman: .\scripts\test-postman.ps1 -InstallNewman" -ForegroundColor $White
    Write-Host ""
    Write-Host "📝 Prochaines étapes:" -ForegroundColor $Blue
    Write-Host "  1. Vérifier le rapport HTML pour les détails" -ForegroundColor $White
    Write-Host "  2. Corriger les tests qui ont échoué" -ForegroundColor $White
    Write-Host "  3. Relancer les tests si nécessaire" -ForegroundColor $White
    Write-Host ""
}

# Fonction pour créer un script de test rapide
function New-QuickTest {
    Write-Info "Création d'un script de test rapide..."
    
    $quickTestScript = @"
# Test rapide de l'API E-DEFENCE Audit Platform
Write-Host "Test rapide de l'API..." -ForegroundColor Green

# Test 1: Health Check
Write-Host "1. Test Health Check..." -ForegroundColor Blue
try {
    `$response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing
    if (`$response.StatusCode -eq 200) {
        Write-Host "   ✅ Health Check OK" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Health Check FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Health Check ERROR: `$(`$_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Métriques
Write-Host "2. Test Métriques..." -ForegroundColor Blue
try {
    `$response = Invoke-WebRequest -Uri "http://localhost:5000/metrics" -UseBasicParsing
    if (`$response.StatusCode -eq 200) {
        Write-Host "   ✅ Métriques OK" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Métriques FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Métriques ERROR: `$(`$_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Documentation API
Write-Host "3. Test Documentation API..." -ForegroundColor Blue
try {
    `$response = Invoke-WebRequest -Uri "http://localhost:5000/api-docs" -UseBasicParsing
    if (`$response.StatusCode -eq 200) {
        Write-Host "   ✅ Documentation API OK" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Documentation API FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Documentation API ERROR: `$(`$_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Test rapide terminé!" -ForegroundColor Green
"@
    
    Set-Content "scripts/quick-test.ps1" $quickTestScript
    Write-Success "Script de test rapide créé: scripts/quick-test.ps1"
}

# Fonction principale
function Main {
    Write-Host "==========================================" -ForegroundColor $Green
    Write-Host "  Test Postman - E-DEFENCE Audit Platform" -ForegroundColor $Green
    Write-Host "==========================================" -ForegroundColor $Green
    Write-Host ""
    
    # Vérifier les prérequis
    if (-not (Test-Prerequisites)) {
        Write-Error "Prérequis non satisfaits. Arrêt du script."
        exit 1
    }
    
    # Vérifier l'accessibilité de l'API
    if (-not (Test-APIAccessibility)) {
        Write-Error "API non accessible. Arrêt du script."
        exit 1
    }
    
    # Exécuter les tests
    if (Invoke-PostmanTests) {
        # Analyser les résultats
        Analyze-Results
        
        # Créer un script de test rapide
        New-QuickTest
        
        Write-Host "==========================================" -ForegroundColor $Green
        Write-Success "Tests Postman terminés avec succès !"
        Write-Host "==========================================" -ForegroundColor $Green
    } else {
        Write-Host "==========================================" -ForegroundColor $Red
        Write-Error "Tests Postman échoués !"
        Write-Host "==========================================" -ForegroundColor $Red
        exit 1
    }
}

# Exécution du script
Main


