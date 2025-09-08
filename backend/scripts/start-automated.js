#!/usr/bin/env node

/**
 * Script de démarrage automatique
 * E-DEFENCE Audit Platform
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const config = {
  services: {
    database: {
      name: 'MySQL',
      command: 'mysql',
      args: ['-u', 'root', '-e', 'SELECT 1'],
      required: true
    },
    redis: {
      name: 'Redis',
      command: 'redis-cli',
      args: ['ping'],
      required: true
    },
    backend: {
      name: 'Backend API',
      command: 'node',
      args: ['server.js'],
      cwd: path.join(__dirname, '..'),
      required: true
    }
  },
  checks: {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'audit_platform_saas'
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    }
  }
};

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Vérification des prérequis
async function checkPrerequisites() {
  info('Vérification des prérequis...');
  
  const checks = [
    { name: 'Node.js', check: () => process.version, required: true },
    { name: 'NPM', check: () => require('child_process').execSync('npm --version', { encoding: 'utf8' }).trim(), required: true }
  ];
  
  // Vérifier MySQL seulement si pas en mode SQLite
  if (process.env.USE_SQLITE !== 'true' && process.env.DB_HOST) {
    checks.push({ name: 'MySQL', check: () => require('child_process').execSync('mysql --version', { encoding: 'utf8' }).trim(), required: true });
  }
  
  // Vérifier Redis seulement si pas en mode mock
  if (process.env.USE_MOCK_REDIS !== 'true' && process.env.REDIS_HOST) {
    checks.push({ name: 'Redis', check: () => require('child_process').execSync('redis-server --version', { encoding: 'utf8' }).trim(), required: true });
  }
  
  for (const check of checks) {
    try {
      const version = check.check();
      success(`${check.name}: ${version}`);
    } catch (err) {
      if (check.required) {
        error(`${check.name}: Non installé`);
        process.exit(1);
      } else {
        warn(`${check.name}: Non installé (optionnel)`);
      }
    }
  }
  
  // Afficher le mode de base de données
  if (process.env.USE_SQLITE === 'true' || !process.env.DB_HOST) {
    info('Mode base de données: SQLite (développement)');
  } else {
    info('Mode base de données: MySQL (production)');
  }
  
  // Afficher le mode Redis
  if (process.env.USE_MOCK_REDIS === 'true' || !process.env.REDIS_HOST) {
    info('Mode cache: Mock Redis (développement)');
  } else {
    info('Mode cache: Redis (production)');
  }
}

// Vérification de la base de données
async function checkDatabase() {
  info('Vérification de la base de données...');
  
  try {
    const { sequelize } = require('../models');
    await sequelize.authenticate();
    success('Base de données accessible');
    return true;
  } catch (error) {
    error(`Erreur base de données: ${error.message}`);
    return false;
  }
}

// Vérification de Redis
async function checkRedis() {
  info('Vérification de Redis...');
  
  try {
    const { cache } = require('../config/redis');
    const result = await cache.ping();
    if (result === 'PONG') {
      success('Redis accessible');
      return true;
    } else {
      error('Redis inaccessible');
      return false;
    }
  } catch (error) {
    error(`Erreur Redis: ${error.message}`);
    return false;
  }
}

// Configuration automatique des ports
async function configurePorts() {
  info('Configuration automatique des ports...');
  
  try {
    const portManager = require('../services/portManagerService');
    const results = await portManager.autoConfigurePorts();
    
    for (const [service, result] of Object.entries(results)) {
      if (result.status === 'configured') {
        success(`Port ${result.port} configuré pour ${service}`);
      } else if (result.status === 'available') {
        info(`Port ${result.port} disponible pour ${service}`);
      } else {
        warn(`Problème avec le port ${service}: ${result.error}`);
      }
    }
    
    // Mise à jour des variables d'environnement
    portManager.updateEnvironmentVariables();
    success('Variables d\'environnement mises à jour');
    
  } catch (err) {
    warn(`Erreur configuration ports: ${err.message}`);
  }
}

// Synchronisation de la base de données
async function syncDatabase() {
  info('Synchronisation de la base de données...');
  
  try {
    const { sequelize } = require('../models');
    await sequelize.sync({ alter: true });
    success('Base de données synchronisée');
  } catch (err) {
    error(`Erreur synchronisation DB: ${err.message}`);
    throw err;
  }
}

// Démarrage des services
async function startServices() {
  info('Démarrage des services...');
  
  const services = [];
  
  // Démarrage du backend
  const backend = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  services.push(backend);
  
  backend.on('error', (err) => {
    error(`Erreur démarrage backend: ${err.message}`);
  });
  
  backend.on('exit', (code) => {
    if (code !== 0) {
      error(`Backend arrêté avec le code ${code}`);
    }
  });
  
  success('Backend démarré');
  
  // Gestion de l'arrêt propre
  process.on('SIGINT', () => {
    info('Arrêt des services...');
    services.forEach(service => {
      if (service && !service.killed) {
        service.kill('SIGTERM');
      }
    });
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    info('Arrêt des services...');
    services.forEach(service => {
      if (service && !service.killed) {
        service.kill('SIGTERM');
      }
    });
    process.exit(0);
  });
}

// Fonction principale
async function main() {
  try {
    log('🚀 Démarrage automatique E-DEFENCE Audit Platform', 'cyan');
    log('================================================', 'cyan');
    
    // Vérifications
    await checkPrerequisites();
    await checkDatabase();
    await checkRedis();
    
    // Configuration
    await configurePorts();
    await syncDatabase();
    
    // Démarrage
    await startServices();
    
    success('🎉 Plateforme E-DEFENCE démarrée avec succès!');
    info('API Backend: http://localhost:5000');
    info('Frontend: http://localhost:3000');
    info('Métriques: http://localhost:9090');
    info('Appuyez sur Ctrl+C pour arrêter');
    
  } catch (err) {
    error(`Erreur démarrage: ${err.message}`);
    process.exit(1);
  }
}

// Gestion des arguments
const command = process.argv[2];

switch (command) {
  case 'start':
  case 'run':
    main();
    break;
    
  case 'check':
    checkPrerequisites()
      .then(() => checkDatabase())
      .then(() => checkRedis())
      .then(() => success('Toutes les vérifications sont OK'))
      .catch(err => {
        error(`Vérification échouée: ${err.message}`);
        process.exit(1);
      });
    break;
    
  case 'ports':
    configurePorts()
      .then(() => success('Configuration des ports terminée'))
      .catch(err => {
        error(`Erreur configuration ports: ${err.message}`);
        process.exit(1);
      });
    break;
    
  case 'db':
    syncDatabase()
      .then(() => success('Synchronisation DB terminée'))
      .catch(err => {
        error(`Erreur synchronisation DB: ${err.message}`);
        process.exit(1);
      });
    break;
    
  default:
    console.log('🚀 Script de démarrage automatique E-DEFENCE Audit Platform');
    console.log('===========================================================');
    console.log('');
    console.log('Usage: node start-automated.js <command>');
    console.log('');
    console.log('Commandes disponibles:');
    console.log('  start, run  - Démarrage complet de la plateforme');
    console.log('  check       - Vérification des prérequis');
    console.log('  ports       - Configuration automatique des ports');
    console.log('  db          - Synchronisation de la base de données');
    console.log('');
    console.log('Exemples:');
    console.log('  node start-automated.js start');
    console.log('  node start-automated.js check');
    console.log('  node start-automated.js ports');
    break;
}

module.exports = {
  checkPrerequisites,
  checkDatabase,
  checkRedis,
  configurePorts,
  syncDatabase,
  startServices
};
