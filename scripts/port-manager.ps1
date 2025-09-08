# ==========================================
# Gestionnaire de Ports - E-DEFENCE Audit Platform
# ==========================================

param(
    [string]$Action = "check",
    [string]$Service = "all",
    [switch]$AutoFix,
    [switch]$Verbose
)

# Configuration des couleurs
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$White = "White"

# Configuration des ports par défaut
$DefaultPorts = @{
    "database" = 3306
    "redis" = 6379
    "phpmyadmin" = 8081
    "backend" = 5000
    "frontend" = 3000
}

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

# Fonction pour vérifier si un port est utilisé
function Test-Port {
    param([int]$Port)
    
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Fonction pour trouver un port libre
function Find-FreePort {
    param([int]$StartPort, [int]$MaxAttempts = 10)
    
    for ($i = 0; $i -lt $MaxAttempts; $i++) {
        $testPort = $StartPort + $i
        if (-not (Test-Port -Port $testPort)) {
            return $testPort
        }
    }
    return $null
}

# Fonction pour vérifier les ports
function Check-Ports {
    param([string]$TargetService = "all")
    
    Write-Info "Vérification des ports..."
    
    $results = @{}
    $conflicts = @()
    
    foreach ($service in $DefaultPorts.Keys) {
        if ($TargetService -eq "all" -or $TargetService -eq $service) {
            $port = $DefaultPorts[$service]
            $isUsed = Test-Port -Port $port
            
            $results[$service] = @{
                Port = $port
                IsUsed = $isUsed
                Status = if ($isUsed) { "OCCUPE" } else { "LIBRE" }
            }
            
            if ($isUsed) {
                $conflicts += $service
                Write-Warning "Port $port ($service) est occupe"
            } else {
                Write-Success "Port $port ($service) est libre"
            }
        }
    }
    
    return @{
        Results = $results
        Conflicts = $conflicts
    }
}

# Fonction pour résoudre automatiquement les conflits
function Resolve-PortConflicts {
    param([hashtable]$PortResults)
    
    Write-Info "Resolution automatique des conflits de ports..."
    
    $newPorts = @{}
    $changes = @{}
    
    foreach ($service in $PortResults.Conflicts) {
        $originalPort = $DefaultPorts[$service]
        $newPort = Find-FreePort -StartPort ($originalPort + 1)
        
        if ($newPort) {
            $newPorts[$service] = $newPort
            $changes[$service] = @{
                Old = $originalPort
                New = $newPort
            }
            Write-Success "Port $service`: $originalPort -> $newPort"
        } else {
            Write-Error "Impossible de trouver un port libre pour $service"
            return $null
        }
    }
    
    return @{
        NewPorts = $newPorts
        Changes = $changes
    }
}

# Fonction pour générer un fichier docker-compose avec les nouveaux ports
function Generate-DockerCompose {
    param([hashtable]$PortChanges)
    
    Write-Info "Generation du fichier docker-compose avec les nouveaux ports..."
    
    $composeContent = Get-Content "docker-compose.yml" -Raw
    
    foreach ($service in $PortChanges.Changes.Keys) {
        $oldPort = $PortChanges.Changes[$service].Old
        $newPort = $PortChanges.Changes[$service].New
        
        # Remplacer le port dans le fichier docker-compose.yml
        $pattern = "`"$oldPort`:$oldPort`""
        $replacement = "`"$newPort`:$oldPort`""
        $composeContent = $composeContent -replace $pattern, $replacement
        
        Write-Info "Port $service mis a jour: $oldPort -> $newPort"
    }
    
    # Sauvegarder le fichier original
    $backupFile = "docker-compose.yml.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item "docker-compose.yml" $backupFile
    Write-Info "Sauvegarde creee: $backupFile"
    
    # Écrire le nouveau fichier
    Set-Content "docker-compose.yml" $composeContent -NoNewline
    Write-Success "Fichier docker-compose.yml mis a jour"
    
    return $backupFile
}

# Fonction pour afficher un rapport
function Show-PortReport {
    param([hashtable]$PortResults, [hashtable]$PortChanges = $null)
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor $Blue
    Write-Host "  RAPPORT DE GESTION DES PORTS" -ForegroundColor $Blue
    Write-Host "==========================================" -ForegroundColor $Blue
    
    Write-Host ""
    Write-Host "Etat des ports:" -ForegroundColor $White
    foreach ($service in $PortResults.Results.Keys) {
        $result = $PortResults.Results[$service]
        $color = if ($result.IsUsed) { $Red } else { $Green }
        Write-Host "  $service`: $($result.Port) [$($result.Status)]" -ForegroundColor $color
    }
    
    if ($PortResults.Conflicts.Count -gt 0) {
        Write-Host ""
        Write-Host "Conflits detectes:" -ForegroundColor $Yellow
        foreach ($conflict in $PortResults.Conflicts) {
            Write-Host "  - $conflict" -ForegroundColor $Yellow
        }
        
        if ($PortChanges) {
            Write-Host ""
            Write-Host "Resolutions appliquees:" -ForegroundColor $Green
            foreach ($service in $PortChanges.Changes.Keys) {
                $change = $PortChanges.Changes[$service]
                Write-Host "  $service`: $($change.Old) -> $($change.New)" -ForegroundColor $Green
            }
        }
    } else {
        Write-Host ""
        Write-Host "Aucun conflit detecte" -ForegroundColor $Green
    }
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor $Blue
}

# Fonction pour restaurer les ports par défaut
function Restore-DefaultPorts {
    Write-Info "Restauration des ports par defaut..."
    
    $backupFiles = Get-ChildItem "docker-compose.yml.backup.*" | Sort-Object LastWriteTime -Descending
    
    if ($backupFiles.Count -eq 0) {
        Write-Warning "Aucun fichier de sauvegarde trouve"
        return
    }
    
    $latestBackup = $backupFiles[0]
    Copy-Item $latestBackup.FullName "docker-compose.yml" -Force
    Write-Success "Ports restaures depuis: $($latestBackup.Name)"
}

# Fonction principale
function Main {
    switch ($Action.ToLower()) {
        "check" {
            $portResults = Check-Ports -TargetService $Service
            Show-PortReport -PortResults $portResults
            
            if ($portResults.Conflicts.Count -gt 0) {
                Write-Warning "Conflits detectes. Utilisez -AutoFix pour les resoudre automatiquement."
                exit 1
            }
        }
        
        "fix" {
            $portResults = Check-Ports -TargetService $Service
            
            if ($portResults.Conflicts.Count -eq 0) {
                Write-Success "Aucun conflit a resoudre"
                return
            }
            
            $portChanges = Resolve-PortConflicts -PortResults $portResults
            
            if ($portChanges) {
                $backupFile = Generate-DockerCompose -PortChanges $portChanges
                Show-PortReport -PortResults $portResults -PortChanges $portChanges
                Write-Success "Conflits resolus. Fichier de sauvegarde: $backupFile"
            } else {
                Write-Error "Impossible de resoudre les conflits"
                exit 1
            }
        }
        
        "restore" {
            Restore-DefaultPorts
        }
        
        "list" {
            Write-Info "Configuration des ports par defaut:"
            foreach ($service in $DefaultPorts.Keys) {
                Write-Host "  $service`: $($DefaultPorts[$service])" -ForegroundColor $White
            }
        }
        
        default {
            Write-Error "Action non reconnue: $Action"
            Write-Host "Actions disponibles: check, fix, restore, list" -ForegroundColor $Yellow
            exit 1
        }
    }
}

# Exécution du script
Main


