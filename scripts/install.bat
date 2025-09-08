@echo off
echo ========================================
echo  Installation E-DEFENCE Audit Platform
echo ========================================
echo.

echo [1/6] Verification des prerequis...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERREUR: Node.js n'est pas installe. Veuillez installer Node.js 16+ depuis https://nodejs.org
    pause
    exit /b 1
)

mysql --version >nul 2>&1
if errorlevel 1 (
    echo ERREUR: MySQL n'est pas installe. Veuillez installer MySQL/MariaDB
    pause
    exit /b 1
)

echo [2/6] Installation des dependances backend...
cd backend
if not exist .env (
    copy .env.example .env
    echo ATTENTION: Veuillez configurer le fichier backend\.env avant de continuer
    pause
)
call npm install
if errorlevel 1 (
    echo ERREUR: Installation des dependances backend echouee
    pause
    exit /b 1
)

echo [3/6] Installation des dependances frontend...
cd ..\frontend
call npm install
if errorlevel 1 (
    echo ERREUR: Installation des dependances frontend echouee
    pause
    exit /b 1
)

echo [4/6] Configuration de la base de donnees...
cd ..\database
echo Veuillez saisir les informations de connexion MySQL:
set /p DB_HOST="Host MySQL (localhost): "
if "%DB_HOST%"=="" set DB_HOST=localhost

set /p DB_USER="Utilisateur MySQL (root): "
if "%DB_USER%"=="" set DB_USER=root

set /p DB_PASSWORD="Mot de passe MySQL: "

echo [5/6] Creation de la base de donnees...
mysql -h %DB_HOST% -u %DB_USER% -p%DB_PASSWORD% < schema.sql
if errorlevel 1 (
    echo ERREUR: Creation de la base de donnees echouee
    pause
    exit /b 1
)

echo [6/6] Generation des scripts de demarrage...
cd ..

echo @echo off > start_backend.bat
echo echo Demarrage du backend... >> start_backend.bat
echo cd backend >> start_backend.bat
echo npm run dev >> start_backend.bat

echo @echo off > start_frontend.bat
echo echo Demarrage du frontend... >> start_frontend.bat
echo cd frontend >> start_frontend.bat
echo npm start >> start_frontend.bat

echo @echo off > start_platform.bat
echo echo Demarrage de la plateforme complete... >> start_platform.bat
echo start "Backend" cmd /k "start_backend.bat" >> start_platform.bat
echo timeout /t 5 >> start_platform.bat
echo start "Frontend" cmd /k "start_frontend.bat" >> start_platform.bat

echo.
echo ========================================
echo  Installation terminee avec succes!
echo ========================================
echo.
echo Pour demarrer la plateforme:
echo   1. Executez start_platform.bat
echo   2. Ou demarrez separement:
echo      - Backend: start_backend.bat
echo      - Frontend: start_frontend.bat
echo.
echo Acces a la plateforme:
echo   - Frontend: http://localhost:3000
echo   - Backend API: http://localhost:5000
echo   - phpMyAdmin: http://localhost:8080 (si Docker)
echo.
echo Comptes par defaut:
echo   - Admin: l.nacoulma@e-defence.bf / admin123
echo   - Auditeur: a.tassembedo@e-defence.bf / audit123
echo   - Client: b.bance@abi.bf / client123
echo.
pause
