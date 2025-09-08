@echo off
echo ========================================
echo   E-DEFENCE Audit Platform
echo   Demarrage automatique
echo ========================================
echo.

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Node.js n'est pas installe
    echo Veuillez installer Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)

REM Vérifier si MySQL est installé
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: MySQL n'est pas installe
    echo Veuillez installer MySQL depuis https://dev.mysql.com/downloads/
    pause
    exit /b 1
)

REM Vérifier si Redis est installé
redis-server --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Redis n'est pas installe
    echo Veuillez installer Redis depuis https://redis.io/download
    pause
    exit /b 1
)

echo Verification des prerequis... OK
echo.

REM Aller dans le dossier backend
cd backend

REM Vérifier si les dépendances sont installées
if not exist node_modules (
    echo Installation des dependances...
    npm install
    if %errorlevel% neq 0 (
        echo ERREUR: Echec de l'installation des dependances
        pause
        exit /b 1
    )
)

echo Dependances installees... OK
echo.

REM Créer le fichier .env s'il n'existe pas
if not exist .env (
    echo Creation du fichier .env...
    copy env.example .env
    echo.
    echo ATTENTION: Veuillez configurer le fichier .env avec vos parametres
    echo - Base de donnees MySQL
    echo - Clés de paiement Orange Money/Mobile Money
    echo - Configuration SMTP pour les emails
    echo.
    pause
)

echo Configuration... OK
echo.

REM Démarrer les services
echo Demarrage des services...
echo.

REM Démarrer MySQL
echo Demarrage de MySQL...
net start mysql >nul 2>&1
if %errorlevel% neq 0 (
    echo ATTENTION: Impossible de demarrer MySQL automatiquement
    echo Veuillez demarrer MySQL manuellement
)

REM Démarrer Redis
echo Demarrage de Redis...
start /B redis-server
timeout /t 2 >nul

REM Démarrer le backend
echo Demarrage du backend...
echo.
echo ========================================
echo   Plateforme E-DEFENCE demarree!
echo ========================================
echo.
echo API Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo Metriques: http://localhost:9090
echo.
echo Appuyez sur Ctrl+C pour arreter
echo.

REM Démarrer en mode automatique
npm run auto

pause
