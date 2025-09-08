#!/usr/bin/env node

/**
 * Script de test de déploiement
 * E-DEFENCE Audit Platform
 */

const axios = require('axios');
const { logger } = require('../config/logger');

// Configuration
const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:5000',
  apiKey: process.env.TEST_API_KEY || null,
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

// Tests des endpoints
const tests = [
  {
    name: 'Health Check',
    url: '/health',
    method: 'GET',
    expectedStatus: 200,
    public: true
  },
  {
    name: 'API Health Check',
    url: '/api/health',
    method: 'GET',
    expectedStatus: 200,
    public: true
  },
  {
    name: 'API Public Health',
    url: '/api/public/health',
    method: 'GET',
    expectedStatus: 200,
    public: true
  },
  {
    name: 'API Public Missions (sans clé)',
    url: '/api/public/missions',
    method: 'GET',
    expectedStatus: 401,
    public: true
  },
  {
    name: 'API Public Missions (avec clé)',
    url: '/api/public/missions',
    method: 'GET',
    expectedStatus: 200,
    public: false,
    requiresApiKey: true
  },
  {
    name: 'API Public Stats',
    url: '/api/public/stats',
    method: 'GET',
    expectedStatus: 200,
    public: false,
    requiresApiKey: true
  },
  {
    name: 'API Public Inventory',
    url: '/api/public/inventory',
    method: 'GET',
    expectedStatus: 200,
    public: false,
    requiresApiKey: true
  },
  {
    name: 'API Public Vulnerabilities',
    url: '/api/public/vulnerabilities',
    method: 'GET',
    expectedStatus: 200,
    public: false,
    requiresApiKey: true
  },
  {
    name: 'API Public Network',
    url: '/api/public/network',
    method: 'GET',
    expectedStatus: 200,
    public: false,
    requiresApiKey: true
  }
];

// Fonction de test
async function runTest(test) {
  try {
    const url = `${config.baseUrl}${test.url}`;
    const headers = {};
    
    if (test.requiresApiKey && config.apiKey) {
      headers['X-API-Key'] = config.apiKey;
    }

    const response = await axios({
      method: test.method,
      url: url,
      headers: headers,
      timeout: config.timeout,
      validateStatus: () => true // Accepter tous les codes de statut
    });

    if (response.status === test.expectedStatus) {
      success(`${test.name}: ${response.status} (attendu: ${test.expectedStatus})`);
      return true;
    } else {
      error(`${test.name}: ${response.status} (attendu: ${test.expectedStatus})`);
      if (response.data) {
        console.log(`   Réponse: ${JSON.stringify(response.data, null, 2)}`);
      }
      return false;
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      error(`${test.name}: Connexion refusée - Le serveur n'est pas démarré`);
    } else if (err.code === 'ETIMEDOUT') {
      error(`${test.name}: Timeout - Le serveur met trop de temps à répondre`);
    } else {
      error(`${test.name}: Erreur - ${err.message}`);
    }
    return false;
  }
}

// Test de performance
async function performanceTest() {
  info('Test de performance...');
  
  const startTime = Date.now();
  const promises = [];
  
  // Lancer 10 requêtes simultanées
  for (let i = 0; i < 10; i++) {
    promises.push(
      axios.get(`${config.baseUrl}/api/public/health`, {
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
    } else {
      warn(`Performance: ${successCount}/${responses.length} requêtes réussies en ${duration}ms`);
    }
    
    return successCount === responses.length;
  } catch (err) {
    error(`Erreur test de performance: ${err.message}`);
    return false;
  }
}

// Test de la base de données
async function databaseTest() {
  info('Test de la base de données...');
  
  try {
    const { sequelize } = require('../models');
    await sequelize.authenticate();
    success('Base de données: Connexion établie');
    
    // Test d'une requête simple
    const result = await sequelize.query('SELECT 1 as test', { type: sequelize.QueryTypes.SELECT });
    if (result && result[0] && result[0].test === 1) {
      success('Base de données: Requête de test réussie');
      return true;
    } else {
      error('Base de données: Requête de test échouée');
      return false;
    }
  } catch (err) {
    error(`Base de données: Erreur - ${err.message}`);
    return false;
  }
}

// Test de Redis
async function redisTest() {
  info('Test de Redis...');
  
  try {
    const { cache } = require('../config/redis');
    await cache.set('test_key', 'test_value', 10);
    const value = await cache.get('test_key');
    
    if (value === 'test_value') {
      success('Redis: Connexion et opérations réussies');
      await cache.del('test_key');
      return true;
    } else {
      error('Redis: Valeur incorrecte récupérée');
      return false;
    }
  } catch (err) {
    error(`Redis: Erreur - ${err.message}`);
    return false;
  }
}

// Fonction principale
async function main() {
  log('🧪 Test de déploiement E-DEFENCE Audit Platform', 'cyan');
  log('================================================', 'cyan');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test de la base de données
  const dbTest = await databaseTest();
  if (dbTest) passedTests++;
  totalTests++;
  
  // Test de Redis
  const redisTestResult = await redisTest();
  if (redisTestResult) passedTests++;
  totalTests++;
  
  // Tests des endpoints
  info('Tests des endpoints...');
  for (const test of tests) {
    const result = await runTest(test);
    if (result) passedTests++;
    totalTests++;
    
    // Petite pause entre les tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Test de performance
  const perfTest = await performanceTest();
  if (perfTest) passedTests++;
  totalTests++;
  
  // Résumé
  log('\n📊 Résumé des tests:', 'cyan');
  log('===================', 'cyan');
  log(`Tests réussis: ${passedTests}/${totalTests}`, passedTests === totalTests ? 'green' : 'yellow');
  
  if (passedTests === totalTests) {
    success('🎉 Tous les tests sont passés! La plateforme est opérationnelle.');
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
    
  case 'health':
    runTest(tests[0]);
    break;
    
  case 'api':
    runTest(tests[1]);
    break;
    
  case 'public':
    runTest(tests[2]);
    break;
    
  case 'performance':
    performanceTest();
    break;
    
  case 'database':
    databaseTest();
    break;
    
  case 'redis':
    redisTest();
    break;
    
  default:
    console.log('🧪 Script de test de déploiement E-DEFENCE Audit Platform');
    console.log('=========================================================');
    console.log('');
    console.log('Usage: node test-deployment.js <command>');
    console.log('');
    console.log('Commandes disponibles:');
    console.log('  test, run      - Exécuter tous les tests');
    console.log('  health         - Test du health check');
    console.log('  api            - Test de l\'API');
    console.log('  public         - Test de l\'API publique');
    console.log('  performance    - Test de performance');
    console.log('  database       - Test de la base de données');
    console.log('  redis          - Test de Redis');
    console.log('');
    console.log('Variables d\'environnement:');
    console.log('  BASE_URL       - URL de base (défaut: http://localhost:5000)');
    console.log('  TEST_API_KEY   - Clé API pour les tests (optionnel)');
    console.log('');
    console.log('Exemples:');
    console.log('  node test-deployment.js test');
    console.log('  BASE_URL=http://localhost:5000 node test-deployment.js health');
    break;
}

module.exports = {
  runTest,
  performanceTest,
  databaseTest,
  redisTest
};
