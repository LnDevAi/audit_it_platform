@echo off
echo ========================================
echo  E-DEFENCE Audit Platform - Podman Deploy
echo ========================================
echo.

set BACKEND_PORT=5000
set FRONTEND_PORT=3000
set PHPMYADMIN_PORT=8081
set DB_NAME=audit_platform_saas

echo [INFO] Verification des prerequis...
where podman >nul 2>&1
if errorlevel 1 (
    echo ERREUR: Podman n'est pas installe
    echo Installation: https://podman.io/getting-started/installation
    pause
    exit /b 1
)

where podman-compose >nul 2>&1
if errorlevel 1 (
    echo ERREUR: Podman Compose n'est pas installe
    echo Installation: pip install podman-compose
    pause
    exit /b 1
)

if "%1"=="install" goto install
if "%1"=="build" goto build
if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="restart" goto restart
if "%1"=="logs" goto logs
if "%1"=="status" goto status
if "%1"=="deploy" goto deploy
goto usage

:install
echo [INFO] Installation des dependances...
cd backend
call npm ci --production
if errorlevel 1 (
    echo ERREUR: Installation backend echouee
    pause
    exit /b 1
)

cd ..\frontend
call npm ci
if errorlevel 1 (
    echo ERREUR: Installation frontend echouee
    pause
    exit /b 1
)

cd ..
echo [INFO] Installation terminee avec succes!
goto end

:build
echo [INFO] Build du frontend...
cd frontend
call npm run build
if errorlevel 1 (
    echo ERREUR: Build frontend echoue
    pause
    exit /b 1
)
cd ..
echo [INFO] Build termine avec succes!
goto end

:start
echo [INFO] Demarrage des services avec Podman Compose...
if not exist "backend\uploads" mkdir backend\uploads

podman-compose -f podman-compose.yml down 2>nul
podman-compose -f podman-compose.yml up -d

if errorlevel 1 (
    echo ERREUR: Echec du demarrage des services
    pause
    exit /b 1
)

echo [INFO] Services demarres avec succes!
echo [INFO] Frontend: http://localhost:%FRONTEND_PORT%
echo [INFO] Backend API: http://localhost:%BACKEND_PORT%
echo [INFO] phpMyAdmin: http://localhost:%PHPMYADMIN_PORT%
goto end

:stop
echo [INFO] Arret des services...
podman-compose -f podman-compose.yml down
echo [INFO] Services arretes
goto end

:restart
echo [INFO] Redemarrage des services...
podman-compose -f podman-compose.yml restart
echo [INFO] Services redemarres
goto end

:logs
echo [INFO] Affichage des logs...
podman-compose -f podman-compose.yml logs -f
goto end

:status
echo [INFO] Statut des conteneurs:
podman ps --filter "name=audit_platform"
goto end

:deploy
echo [INFO] Deploiement complet...
call %0 install
if errorlevel 1 exit /b 1

call %0 build
if errorlevel 1 exit /b 1

call %0 start
if errorlevel 1 exit /b 1

echo.
echo ========================================
echo  Deploiement termine avec succes!
echo ========================================
echo.
echo Acces a la plateforme:
echo   - Frontend: http://localhost:%FRONTEND_PORT%
echo   - Backend API: http://localhost:%BACKEND_PORT%
echo   - phpMyAdmin: http://localhost:%PHPMYADMIN_PORT%
echo.
echo Comptes par defaut:
echo   - Super Admin: l.nacoulma@e-defence.bf / admin123
echo   - ABI Admin: b.bance@abi.bf / client123
echo   - Auditeur: a.tassembedo@e-defence.bf / audit123
echo.
goto end

:usage
echo Usage: %0 {install^|build^|start^|stop^|restart^|logs^|status^|deploy}
echo.
echo Commandes disponibles:
echo   install  - Installer les dependances
echo   build    - Builder le frontend pour la production
echo   start    - Demarrer la plateforme avec Podman
echo   stop     - Arreter la plateforme
echo   restart  - Redemarrer la plateforme
echo   logs     - Afficher les logs en temps reel
echo   status   - Afficher le statut des conteneurs
echo   deploy   - Deploiement complet (install + build + start)
echo.
echo Exemple: %0 deploy
exit /b 1

:end
pause
