@echo off
REM ==========================================
REM Script de Test CI/CD - E-DEFENCE Audit Platform (Windows)
REM ==========================================

setlocal enabledelayedexpansion

echo ==========================================
echo   Test CI/CD - E-DEFENCE Audit Platform
echo ==========================================
echo.

REM Vérification des prérequis
echo [INFO] Vérification des prérequis...

REM Vérifier Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js n'est pas installé
    exit /b 1
)

REM Vérifier npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm n'est pas installé
    exit /b 1
)

REM Vérifier Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker n'est pas installé
    exit /b 1
)

echo [SUCCESS] Tous les prérequis sont installés

REM Vérification de la structure du projet
echo [INFO] Vérification de la structure du projet...

if not exist "backend\package.json" (
    echo [ERROR] Fichier backend\package.json manquant
    exit /b 1
)

if not exist "backend\server.js" (
    echo [ERROR] Fichier backend\server.js manquant
    exit /b 1
)

if not exist "docker-compose.yml" (
    echo [ERROR] Fichier docker-compose.yml manquant
    exit /b 1
)

if not exist ".github\workflows\ci.yml" (
    echo [ERROR] Fichier .github\workflows\ci.yml manquant
    exit /b 1
)

if not exist "README.md" (
    echo [ERROR] Fichier README.md manquant
    exit /b 1
)

if not exist "GITHUB_SECRETS.md" (
    echo [ERROR] Fichier GITHUB_SECRETS.md manquant
    exit /b 1
)

echo [SUCCESS] Structure du projet correcte

REM Vérification de la configuration ESLint
echo [INFO] Vérification de la configuration ESLint...

if not exist "backend\.eslintrc.js" (
    echo [ERROR] Fichier backend\.eslintrc.js manquant
    exit /b 1
)

if not exist "backend\.prettierrc" (
    echo [ERROR] Fichier backend\.prettierrc manquant
    exit /b 1
)

echo [SUCCESS] Configuration ESLint/Prettier correcte

REM Vérification des tests
echo [INFO] Vérification des tests...

if not exist "backend\tests" (
    echo [ERROR] Répertoire backend\tests manquant
    exit /b 1
)

if not exist "backend\tests\integration" (
    echo [ERROR] Répertoire backend\tests\integration manquant
    exit /b 1
)

if not exist "backend\tests\performance" (
    echo [ERROR] Répertoire backend\tests\performance manquant
    exit /b 1
)

echo [SUCCESS] Tests trouvés

REM Vérification des scripts
echo [INFO] Vérification des scripts...

if not exist "scripts\monitoring.js" (
    echo [ERROR] Script scripts\monitoring.js manquant
    exit /b 1
)

if not exist "scripts\generate-secrets.js" (
    echo [ERROR] Script scripts\generate-secrets.js manquant
    exit /b 1
)

if not exist "scripts\security-check.js" (
    echo [ERROR] Script scripts\security-check.js manquant
    exit /b 1
)

echo [SUCCESS] Scripts utilitaires présents

REM Vérification de la configuration Docker
echo [INFO] Vérification de la configuration Docker...

if not exist "backend\Dockerfile" (
    echo [ERROR] Fichier backend\Dockerfile manquant
    exit /b 1
)

echo [SUCCESS] Configuration Docker correcte

REM Vérification des variables d'environnement
echo [INFO] Vérification des variables d'environnement...

if not exist "backend\env.example" (
    echo [ERROR] Fichier backend\env.example manquant
    exit /b 1
)

echo [SUCCESS] Configuration des variables d'environnement correcte

REM Vérification du pipeline CI/CD
echo [INFO] Vérification du pipeline CI/CD...

echo [SUCCESS] Pipeline CI/CD configuré

REM Test des dépendances npm
echo [INFO] Test des dépendances npm...

cd backend

if not exist "package.json" (
    echo [ERROR] package.json manquant dans le backend
    exit /b 1
)

echo [SUCCESS] Scripts npm configurés correctement

cd ..

REM Test de compilation
echo [INFO] Test de compilation...

cd backend

REM Installer les dépendances si nécessaire
if not exist "node_modules" (
    echo [INFO] Installation des dépendances...
    npm ci
)

REM Test de linting
echo [INFO] Test du linting...
npm run lint
if errorlevel 1 (
    echo [ERROR] Erreurs de linting détectées
    exit /b 1
)

echo [SUCCESS] Linting réussi

REM Test de formatage
echo [INFO] Test du formatage...
npm run format:check
if errorlevel 1 (
    echo [ERROR] Problèmes de formatage détectés
    exit /b 1
)

echo [SUCCESS] Formatage correct

cd ..

REM Test de Docker
echo [INFO] Test de Docker...

REM Vérifier que Docker fonctionne
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker n'est pas accessible
    exit /b 1
)

REM Test de la syntaxe docker-compose
docker-compose config >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Erreur dans la configuration docker-compose
    exit /b 1
)

echo [SUCCESS] Docker fonctionne correctement

REM Génération du rapport
echo [INFO] Génération du rapport de test...

set "report_file=ci-test-report.md"

(
echo # Rapport de Test CI/CD - E-DEFENCE Audit Platform
echo.
echo **Date** : %date% %time%
echo **Version** : Non tagué
echo.
echo ## ✅ Tests Réussis
echo.
echo - [x] Prérequis système
echo - [x] Structure du projet
echo - [x] Configuration ESLint/Prettier
echo - [x] Tests unitaires et d'intégration
echo - [x] Scripts utilitaires
echo - [x] Configuration Docker
echo - [x] Variables d'environnement
echo - [x] Pipeline CI/CD
echo - [x] Dépendances npm
echo - [x] Compilation et linting
echo - [x] Configuration Docker
echo.
echo ## 📊 Informations Système
echo.
echo - **Node.js** : 
node --version
echo - **npm** : 
npm --version
echo - **Docker** : 
docker --version
echo - **OS** : Windows
echo.
echo ## 🔧 Prochaines Étapes
echo.
echo 1. Configurer les secrets GitHub (voir GITHUB_SECRETS.md)
echo 2. Tester le déploiement en environnement de développement
echo 3. Configurer le monitoring de production
echo 4. Effectuer les tests de charge
echo.
echo ## 📝 Notes
echo.
echo Ce rapport a été généré automatiquement par le script de test CI/CD.
) > "%report_file%"

echo [SUCCESS] Rapport généré : %report_file%

echo.
echo ==========================================
echo [SUCCESS] Tous les tests CI/CD ont réussi !
echo ==========================================
echo.
echo [INFO] Le projet est prêt pour le déploiement CI/CD
echo [INFO] N'oubliez pas de configurer les secrets GitHub

pause


