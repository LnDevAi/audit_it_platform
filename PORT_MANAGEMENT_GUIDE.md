# 🔧 Guide de Gestion des Ports - E-DEFENCE Audit Platform

Ce guide explique comment utiliser le système de gestion automatique des ports pour éviter les conflits lors du déploiement.

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Ports par défaut](#ports-par-défaut)
3. [Utilisation du gestionnaire de ports](#utilisation-du-gestionnaire-de-ports)
4. [Intégration avec le déploiement](#intégration-avec-le-déploiement)
5. [Scénarios d'utilisation](#scénarios-dutilisation)
6. [Dépannage](#dépannage)
7. [Bonnes pratiques](#bonnes-pratiques)

## 🎯 Vue d'ensemble

Le système de gestion automatique des ports permet de :
- **Détecter** automatiquement les conflits de ports
- **Résoudre** automatiquement les conflits en utilisant des ports alternatifs
- **Sauvegarder** la configuration originale
- **Restaurer** les ports par défaut si nécessaire
- **Intégrer** la gestion dans le processus de déploiement

## 🔌 Ports par défaut

| Service | Port | Description |
|---------|------|-------------|
| **Database (MySQL)** | 3306 | Base de données principale |
| **Redis** | 6379 | Cache et sessions |
| **phpMyAdmin** | 8081 | Interface d'administration MySQL |
| **Backend API** | 5000 | API REST de la plateforme |
| **Frontend** | 3000 | Interface utilisateur React |

## 🛠️ Utilisation du gestionnaire de ports

### Vérification des ports

```powershell
# Vérifier l'état de tous les ports
.\scripts\port-manager.ps1 -Action check

# Vérifier un service spécifique
.\scripts\port-manager.ps1 -Action check -Service backend
```

**Exemple de sortie :**
```
[14:30:15] Vérification des ports...
[14:30:15] Port 3306 (database) est libre
[14:30:15] Port 6379 (redis) est libre
[14:30:15] Port 8081 (phpmyadmin) est libre
[14:30:15] Port 5000 (backend) est occupé
[14:30:15] Port 3000 (frontend) est libre
```

### Résolution automatique des conflits

```powershell
# Résoudre automatiquement tous les conflits
.\scripts\port-manager.ps1 -Action fix

# Résoudre un service spécifique
.\scripts\port-manager.ps1 -Action fix -Service backend
```

**Ce que fait la résolution :**
1. Détecte les ports occupés
2. Trouve des ports libres alternatifs
3. Modifie le fichier `docker-compose.yml`
4. Crée une sauvegarde automatique
5. Affiche un rapport des changements

### Restauration des ports par défaut

```powershell
# Restaurer la configuration originale
.\scripts\port-manager.ps1 -Action restore
```

### Liste de la configuration

```powershell
# Afficher la configuration des ports
.\scripts\port-manager.ps1 -Action list
```

## 🚀 Intégration avec le déploiement

Le gestionnaire de ports est automatiquement intégré dans le script de déploiement Podman :

```powershell
# Le déploiement inclut automatiquement la gestion des ports
.\scripts\deploy-podman.ps1
```

**Processus automatique :**
1. Vérification des prérequis
2. Nettoyage de l'environnement
3. **Vérification et résolution des conflits de ports** ← Nouveau !
4. Configuration de l'environnement
5. Construction des images
6. Démarrage des services
7. Tests automatisés

## 📊 Scénarios d'utilisation

### Scénario 1 : Déploiement initial

```powershell
# 1. Vérifier les ports avant déploiement
.\scripts\port-manager.ps1 -Action check

# 2. Si conflits détectés, les résoudre
.\scripts\port-manager.ps1 -Action fix

# 3. Déployer (gestion automatique incluse)
.\scripts\deploy-podman.ps1
```

### Scénario 2 : Conflit de port détecté

```powershell
# Le port 5000 est occupé par une autre application
[14:30:15] Port 5000 (backend) est occupé

# Résolution automatique
.\scripts\port-manager.ps1 -Action fix

# Résultat : Port 5000 → 5001
[14:30:16] Port backend: 5000 → 5001
[14:30:16] Fichier docker-compose.yml mis à jour
```

### Scénario 3 : Restauration après test

```powershell
# Après avoir testé avec des ports alternatifs
.\scripts\port-manager.ps1 -Action restore

# Résultat : Retour aux ports par défaut
[14:30:17] Ports restaurés depuis: docker-compose.yml.backup.20240101-143016
```

## 🔍 Dépannage

### Problème : Impossible de trouver un port libre

**Symptôme :**
```
[14:30:15] Impossible de trouver un port libre pour backend
```

**Solution :**
```powershell
# 1. Vérifier les ports utilisés
netstat -an | findstr :5000

# 2. Libérer le port ou utiliser un port spécifique
# 3. Modifier manuellement docker-compose.yml si nécessaire
```

### Problème : Fichier de sauvegarde manquant

**Symptôme :**
```
[14:30:15] Aucun fichier de sauvegarde trouvé
```

**Solution :**
```powershell
# Recréer la configuration par défaut
Copy-Item docker-compose.yml.example docker-compose.yml
```

### Problème : Permissions insuffisantes

**Symptôme :**
```
[14:30:15] Accès refusé lors de la modification du fichier
```

**Solution :**
```powershell
# Exécuter PowerShell en tant qu'administrateur
# Ou vérifier les permissions du fichier
```

## 💡 Bonnes pratiques

### 1. Vérification préventive

```powershell
# Toujours vérifier les ports avant déploiement
.\scripts\port-manager.ps1 -Action check
```

### 2. Sauvegarde manuelle

```powershell
# Créer une sauvegarde manuelle si nécessaire
Copy-Item docker-compose.yml "docker-compose.yml.backup.manual"
```

### 3. Documentation des changements

```powershell
# Noter les changements de ports dans un fichier
echo "Backend port changed from 5000 to 5001 on $(Get-Date)" >> port-changes.log
```

### 4. Test après changement

```powershell
# Tester après modification des ports
.\scripts\quick-test.ps1
```

### 5. Restauration régulière

```powershell
# Restaurer les ports par défaut après les tests
.\scripts\port-manager.ps1 -Action restore
```

## 🔧 Configuration avancée

### Personnalisation des ports

Pour modifier les ports par défaut, éditez le fichier `scripts/port-manager.ps1` :

```powershell
# Configuration des ports par défaut
$DefaultPorts = @{
    "database" = 3306
    "redis" = 6379
    "phpmyadmin" = 8081
    "backend" = 5000
    "frontend" = 3000
}
```

### Ajout de nouveaux services

```powershell
# Ajouter un nouveau service
$DefaultPorts["monitoring"] = 9090
```

## 📝 Exemples complets

### Déploiement complet avec gestion des ports

```powershell
# 1. Vérification initiale
.\scripts\port-manager.ps1 -Action check

# 2. Résolution des conflits si nécessaire
if ($LASTEXITCODE -eq 1) {
    .\scripts\port-manager.ps1 -Action fix
}

# 3. Déploiement
.\scripts\deploy-podman.ps1

# 4. Test rapide
.\scripts\quick-test.ps1

# 5. Tests Postman
.\scripts\test-postman.ps1
```

### Script de maintenance

```powershell
# Script de maintenance quotidienne
Write-Host "=== Maintenance quotidienne ===" -ForegroundColor Green

# Vérifier les ports
.\scripts\port-manager.ps1 -Action check

# Vérifier les services
.\scripts\quick-test.ps1 -CheckServices

# Nettoyer les conteneurs non utilisés
podman container prune -f

# Nettoyer les images non utilisées
podman image prune -f

Write-Host "=== Maintenance terminée ===" -ForegroundColor Green
```

## 🎯 Résumé

Le système de gestion automatique des ports offre :

- ✅ **Automatisation complète** de la gestion des conflits
- ✅ **Intégration transparente** dans le déploiement
- ✅ **Sauvegarde automatique** de la configuration
- ✅ **Restauration facile** des paramètres par défaut
- ✅ **Flexibilité** pour les environnements de test
- ✅ **Robustesse** pour les déploiements en production

**Commande principale :**
```powershell
.\scripts\port-manager.ps1 -Action check
```

Cette solution garantit que votre déploiement E-DEFENCE Audit Platform fonctionne toujours, même en cas de conflits de ports sur votre système.


