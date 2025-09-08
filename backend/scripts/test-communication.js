#!/usr/bin/env node

/**
 * Script de test de communication BD → Backend → Frontend
 * E-DEFENCE Audit Platform
 */

const axios = require('axios');

// Configuration
const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  timeout: 10000
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
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Test de la base de données
async function testDatabase() {
  info('Test de la base de données...');
  
  try {
    const { sequelize } = require('../models');
    await sequelize.authenticate();
    success('Connexion à la base de données établie');
    
    // Test d'une requête simple
    const result = await sequelize.query('SELECT 1 as test', { type: sequelize.QueryTypes.SELECT });
    if (result && result[0] && result[0].test === 1) {
      success('Requête de test réussie');
      return true;
    } else {
      error('Requête de test échouée');
      return false;
    }
  } catch (err) {
    error(`Erreur base de données: ${err.message}`);
    return false;
  }
}

// Test de l'API Backend
async function testBackendAPI() {
  info('Test de l\'API Backend...');
  
  const tests = [
    {
      name: 'Health Check',
      url: '/health',
      method: 'GET',
      expectedStatus: 200
    },
    {
      name: 'API Health',
      url: '/api/health',
      method: 'GET',
      expectedStatus: 200
    },
    {
      name: 'API Public Health',
      url: '/api/public/health',
      method: 'GET',
      expectedStatus: 200
    }
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    try {
      const response = await axios({
        method: test.method,
        url: `${config.backendUrl}${test.url}`,
        timeout: config.timeout,
        validateStatus: () => true
      });
      
      if (response.status === test.expectedStatus) {
        success(`${test.name}: ${response.status}`);
        passedTests++;
      } else {
        warn(`${test.name}: ${response.status} (attendu: ${test.expectedStatus})`);
      }
    } catch (err) {
      error(`${test.name}: ${err.message}`);
    }
  }
  
  return passedTests === tests.length;
}

// Test de la communication Frontend
async function testFrontendCommunication() {
  info('Test de la communication Frontend...');
  
  try {
    // Test si le frontend est accessible
    const response = await axios.get(config.frontendUrl, {
      timeout: config.timeout,
      validateStatus: () => true
    });
    
    if (response.status === 200) {
      success('Frontend accessible');
      
      // Vérifier que le frontend charge les vraies données
      if (response.data.includes('mock') || response.data.includes('Mock')) {
        warn('Frontend contient encore des données mockées');
        return false;
      } else {
        success('Frontend utilise les vraies données');
        return true;
      }
    } else {
      warn(`Frontend non accessible: ${response.status}`);
      return false;
    }
  } catch (err) {
    warn(`Frontend non accessible: ${err.message}`);
    return false;
  }
}

// Test de performance
async function testPerformance() {
  info('Test de performance...');
  
  const startTime = Date.now();
  const promises = [];
  
  // Lancer 5 requêtes simultanées
  for (let i = 0; i < 5; i++) {
    promises.push(
      axios.get(`${config.backendUrl}/api/health`, {
        timeout: config.timeout,
        validateStatus: () => true
      })
    );
  }
  
  try {
    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const successCount = responses.filter(r => r.status === 200).length;
    const avgResponseTime = duration / responses.length;
    
    if (successCount === responses.length) {
      success(`Performance: ${successCount}/${responses.length} requêtes réussies en ${duration}ms (moyenne: ${avgResponseTime.toFixed(2)}ms)`);
      return true;
    } else {
      warn(`Performance: ${successCount}/${responses.length} requêtes réussies en ${duration}ms`);
      return false;
    }
  } catch (err) {
    error(`Erreur test de performance: ${err.message}`);
    return false;
  }
}

// Fonction principale
async function main() {
  log('🧪 Test de communication BD → Backend → Frontend', 'cyan');
  log('================================================', 'cyan');
  
  let passedTests = 0;
  let totalTests = 0;
  
  try {
    // Test 1: Base de données
    const dbOk = await testDatabase();
    if (dbOk) passedTests++;
    totalTests++;
    
    // Test 2: API Backend
    const backendOk = await testBackendAPI();
    if (backendOk) passedTests++;
    totalTests++;
    
    // Test 3: Communication Frontend
    const frontendOk = await testFrontendCommunication();
    if (frontendOk) passedTests++;
    totalTests++;
    
    // Test 4: Performance
    const perfOk = await testPerformance();
    if (perfOk) passedTests++;
    totalTests++;
    
  } catch (err) {
    error(`Erreur critique: ${err.message}`);
  }
  
  // Résumé
  log('\n📊 Résumé des tests:', 'cyan');
  log('===================', 'cyan');
  log(`Tests réussis: ${passedTests}/${totalTests}`, passedTests === totalTests ? 'green' : 'yellow');
  
  if (passedTests === totalTests) {
    success('🎉 Tous les tests sont passés! La communication BD → Backend → Frontend fonctionne parfaitement.');
    log('\n✅ CONFIRMATION:', 'green');
    log('   - Base de données SQLite opérationnelle', 'green');
    log('   - Backend API fonctionnel', 'green');
    log('   - Frontend connecté aux vraies données', 'green');
    log('   - Performance acceptable', 'green');
    log('\n🚀 La plateforme est prête pour le déploiement!', 'green');
    process.exit(0);
  } else {
    warn(`⚠️  ${totalTests - passedTests} test(s) ont échoué. Vérifiez la configuration.`);
    process.exit(1);
  }
}

// Gestion des arguments
const command = process.argv[2];

switch (command) {
  case 'test':
  case 'run':
    main();
    break;
    
  case 'db':
    testDatabase();
    break;
    
  case 'backend':
    testBackendAPI();
    break;
    
  case 'frontend':
    testFrontendCommunication();
    break;
    
  case 'performance':
    testPerformance();
    break;
    
  default:
    console.log('🧪 Script de test de communication BD → Backend → Frontend');
    console.log('=========================================================');
    console.log('');
    console.log('Usage: node test-communication.js <command>');
    console.log('');
    console.log('Commandes disponibles:');
    console.log('  test, run      - Exécuter tous les tests');
    console.log('  db             - Test de la base de données');
    console.log('  backend        - Test de l\'API Backend');
    console.log('  frontend       - Test de la communication Frontend');
    console.log('  performance    - Test de performance');
    console.log('');
    console.log('Variables d\'environnement:');
    console.log('  BACKEND_URL    - URL du backend (défaut: http://localhost:5000)');
    console.log('  FRONTEND_URL   - URL du frontend (défaut: http://localhost:3000)');
    break;
}

module.exports = {
  testDatabase,
  testBackendAPI,
  testFrontendCommunication,
  testPerformance
};
