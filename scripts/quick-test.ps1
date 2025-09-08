# ==========================================
# Test Rapide - E-DEFENCE Audit Platform
# ==========================================

param(
    [switch]$CheckPorts,
    [switch]$CheckServices,
    [switch]$All
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

# Fonction pour tester les ports
function Test-Ports {
    Write-Info "Test des ports..."
    
    if (Test-Path "scripts\port-manager.ps1") {
        & "scripts\port-manager.ps1" -Action "check"
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Ports OK"
        } else {
            Write-Warning "Conflits de ports detectes"
            Write-Info "Utilisez: .\scripts\port-manager.ps1 -Action fix"
        }
    } else {
        Write-Error "Script port-manager.ps1 non trouve"
    }
}

# Fonction pour tester les services
function Test-Services {
    Write-Info "Test des services..."
    
    $services = @("database", "redis", "backend", "frontend")
    $results = @{}
    
    foreach ($service in $services) {
        $containerName = "audit_platform_$service"
        
        # Vérifier si le conteneur existe et fonctionne
        $containerStatus = podman ps --filter "name=$containerName" --format "table {{.Names}}\t{{.Status}}" 2>$null
        
        if ($containerStatus -and $containerStatus -notmatch "No such object") {
            if ($containerStatus -match "Up") {
                $results[$service] = "En cours"
                Write-Success "$service`: En cours"
            } else {
                $results[$service] = "Arrete"
                Write-Warning "$service`: Arrete"
            }
        } else {
            $results[$service] = "Non trouve"
            Write-Error "$service`: Non trouve"
        }
    }
    
    return $results
}

# Fonction pour tester l'API
function Test-API {
    Write-Info "Test de l'API..."
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET -TimeoutSec 5 2>$null
        if ($response.StatusCode -eq 200) {
            Write-Success "API accessible"
            return $true
        } else {
            Write-Warning "API repond avec le code: $($response.StatusCode)"
            return $false
        }
    } catch {
        Write-Error "API non accessible: $($_.Exception.Message)"
        return $false
    }
}

# Fonction pour afficher le rapport
function Show-QuickReport {
    param([hashtable]$ServiceResults, [bool]$ApiStatus)
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor $Blue
    Write-Host "  RAPPORT DE TEST RAPIDE" -ForegroundColor $Blue
    Write-Host "==========================================" -ForegroundColor $Blue
    
    Write-Host ""
    Write-Host "Etat des services:" -ForegroundColor $White
    foreach ($service in $ServiceResults.Keys) {
        $status = $ServiceResults[$service]
        $color = if ($status -match "En cours") { $Green } elseif ($status -match "Arrete") { $Yellow } else { $Red }
        Write-Host "  $service`: $status" -ForegroundColor $color
    }
    
    Write-Host ""
    Write-Host "Etat de l'API:" -ForegroundColor $White
    if ($ApiStatus) {
        Write-Host "  API`: Accessible" -ForegroundColor $Green
    } else {
        Write-Host "  API`: Non accessible" -ForegroundColor $Red
    }
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor $Blue
}

# Fonction principale
function Main {
    Write-Host "==========================================" -ForegroundColor $Blue
    Write-Host "  Test Rapide - E-DEFENCE Audit Platform" -ForegroundColor $Blue
    Write-Host "==========================================" -ForegroundColor $Blue
    Write-Host ""
    
    $serviceResults = @{}
    $apiStatus = $false
    
    # Tests à effectuer
    if ($CheckPorts -or $All) {
        Test-Ports
    }
    
    if ($CheckServices -or $All) {
        $serviceResults = Test-Services
        $apiStatus = Test-API
    }
    
    # Si aucun paramètre spécifié, faire tous les tests
    if (-not $CheckPorts -and -not $CheckServices -and -not $All) {
        Test-Ports
        $serviceResults = Test-Services
        $apiStatus = Test-API
    }
    
    # Afficher le rapport
    if ($serviceResults.Count -gt 0) {
        Show-QuickReport -ServiceResults $serviceResults -ApiStatus $apiStatus
    }
    
    Write-Host ""
    Write-Host "Actions recommandees:" -ForegroundColor $Yellow
    Write-Host "  - Deploiement: .\scripts\deploy-podman.ps1" -ForegroundColor $White
    Write-Host "  - Tests Postman: .\scripts\test-postman.ps1" -ForegroundColor $White
    Write-Host "  - Gestion ports: .\scripts\port-manager.ps1 -Action check" -ForegroundColor $White
}

# Exécution du script
Main


