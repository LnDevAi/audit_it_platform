#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { logger } = require('../backend/config/logger');

console.log('📊 Monitoring E-DEFENCE Audit Platform');
console.log('=====================================\n');

// Configuration
const config = {
  baseUrl: process.env.API_URL || 'http://localhost:5000',
  interval: parseInt(process.env.MONITORING_INTERVAL) || 30000, // 30 secondes
  logFile: process.env.MONITORING_LOG_FILE || './logs/monitoring.log',
  alertThresholds: {
    responseTime: 2000, // 2 secondes
    errorRate: 0.05,    // 5%
    memoryUsage: 0.8,   // 80%
    cpuUsage: 0.7       // 70%
  }
};

// Métriques collectées
let metrics = {
  requests: 0,
  errors: 0,
  responseTimes: [],
  startTime: Date.now()
};

// Fonction pour tester les endpoints
const testEndpoints = async () => {
  const endpoints = [
    { name: 'Health Check', url: '/health', method: 'GET' },
    { name: 'API Health', url: '/api/health', method: 'GET' },
    { name: 'Metrics', url: '/metrics', method: 'GET' },
    { name: 'Auth Status', url: '/api/auth/me', method: 'GET' }
  ];

  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const start = Date.now();
      const response = await axios({
        method: endpoint.method,
        url: `${config.baseUrl}${endpoint.url}`,
        timeout: 10000,
        validateStatus: () => true // Accepter tous les codes de statut
      });
      const duration = Date.now() - start;

      results.push({
        name: endpoint.name,
        url: endpoint.url,
        status: response.status,
        duration,
        success: response.status < 400,
        timestamp: new Date().toISOString()
      });

      // Mettre à jour les métriques globales
      metrics.requests++;
      metrics.responseTimes.push(duration);
      
      if (response.status >= 400) {
        metrics.errors++;
      }

    } catch (error) {
      results.push({
        name: endpoint.name,
        url: endpoint.url,
        status: 'ERROR',
        duration: 0,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      metrics.requests++;
      metrics.errors++;
    }
  }

  return results;
};

// Fonction pour analyser les métriques
const analyzeMetrics = () => {
  const uptime = Date.now() - metrics.startTime;
  const errorRate = metrics.errors / metrics.requests;
  const avgResponseTime = metrics.responseTimes.length > 0 
    ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length 
    : 0;
  const maxResponseTime = Math.max(...metrics.responseTimes, 0);
  const minResponseTime = Math.min(...metrics.responseTimes, 0);

  return {
    uptime: Math.round(uptime / 1000),
    requests: metrics.requests,
    errors: metrics.errors,
    errorRate: errorRate.toFixed(4),
    avgResponseTime: Math.round(avgResponseTime),
    maxResponseTime,
    minResponseTime,
    requestsPerSecond: (metrics.requests / (uptime / 1000)).toFixed(2)
  };
};

// Fonction pour détecter les alertes
const checkAlerts = (analysis) => {
  const alerts = [];

  if (analysis.avgResponseTime > config.alertThresholds.responseTime) {
    alerts.push({
      level: 'WARNING',
      message: `Response time élevé: ${analysis.avgResponseTime}ms (seuil: ${config.alertThresholds.responseTime}ms)`
    });
  }

  if (analysis.errorRate > config.alertThresholds.errorRate) {
    alerts.push({
      level: 'ERROR',
      message: `Taux d'erreur élevé: ${(analysis.errorRate * 100).toFixed(2)}% (seuil: ${(config.alertThresholds.errorRate * 100).toFixed(2)}%)`
    });
  }

  return alerts;
};

// Fonction pour logger les résultats
const logResults = (results, analysis, alerts) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    results,
    analysis,
    alerts
  };

  // Créer le dossier de logs s'il n'existe pas
  const logDir = path.dirname(config.logFile);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Écrire dans le fichier de log
  fs.appendFileSync(config.logFile, JSON.stringify(logEntry) + '\n');

  // Afficher les résultats
  console.log(`\n🕐 ${new Date().toLocaleTimeString()}`);
  console.log('📊 Métriques:');
  console.log(`   Requêtes: ${analysis.requests}`);
  console.log(`   Erreurs: ${analysis.errors} (${(analysis.errorRate * 100).toFixed(2)}%)`);
  console.log(`   Temps de réponse moyen: ${analysis.avgResponseTime}ms`);
  console.log(`   Requêtes/seconde: ${analysis.requestsPerSecond}`);

  // Afficher les alertes
  if (alerts.length > 0) {
    console.log('\n🚨 Alertes:');
    alerts.forEach(alert => {
      console.log(`   ${alert.level}: ${alert.message}`);
    });
  }

  // Afficher le statut des endpoints
  console.log('\n🔍 Statut des endpoints:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.name}: ${result.status} (${result.duration}ms)`);
  });
};

// Fonction pour nettoyer les anciens logs
const cleanupOldLogs = () => {
  try {
    if (fs.existsSync(config.logFile)) {
      const stats = fs.statSync(config.logFile);
      const fileSize = stats.size;
      const maxSize = 10 * 1024 * 1024; // 10 MB

      if (fileSize > maxSize) {
        // Garder seulement les 1000 dernières lignes
        const lines = fs.readFileSync(config.logFile, 'utf8').split('\n');
        const recentLines = lines.slice(-1000);
        fs.writeFileSync(config.logFile, recentLines.join('\n'));
        console.log('🧹 Logs nettoyés');
      }
    }
  } catch (error) {
    console.error('Erreur lors du nettoyage des logs:', error);
  }
};

// Fonction pour générer un rapport
const generateReport = () => {
  const analysis = analyzeMetrics();
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      uptime: `${Math.floor(analysis.uptime / 3600)}h ${Math.floor((analysis.uptime % 3600) / 60)}m`,
      totalRequests: analysis.requests,
      errorRate: `${(analysis.errorRate * 100).toFixed(2)}%`,
      avgResponseTime: `${analysis.avgResponseTime}ms`,
      requestsPerSecond: analysis.requestsPerSecond
    },
    recommendations: []
  };

  // Recommandations basées sur les métriques
  if (analysis.errorRate > 0.01) {
    report.recommendations.push('Vérifier les logs d\'erreur et corriger les problèmes identifiés');
  }

  if (analysis.avgResponseTime > 1000) {
    report.recommendations.push('Optimiser les requêtes de base de données et implémenter du cache');
  }

  if (analysis.requestsPerSecond > 100) {
    report.recommendations.push('Considérer la mise à l\'échelle horizontale');
  }

  return report;
};

// Fonction principale de monitoring
const startMonitoring = async () => {
  console.log(`🚀 Démarrage du monitoring sur ${config.baseUrl}`);
  console.log(`⏱️  Intervalle: ${config.interval}ms`);
  console.log(`📝 Log file: ${config.logFile}\n`);

  // Test initial
  try {
    const results = await testEndpoints();
    const analysis = analyzeMetrics();
    const alerts = checkAlerts(analysis);
    logResults(results, analysis, alerts);
  } catch (error) {
    console.error('Erreur lors du test initial:', error);
  }

  // Monitoring continu
  setInterval(async () => {
    try {
      const results = await testEndpoints();
      const analysis = analyzeMetrics();
      const alerts = checkAlerts(analysis);
      logResults(results, analysis, alerts);

      // Nettoyer les logs toutes les heures
      if (new Date().getMinutes() === 0) {
        cleanupOldLogs();
      }

      // Générer un rapport toutes les 6 heures
      if (new Date().getHours() % 6 === 0 && new Date().getMinutes() === 0) {
        const report = generateReport();
        console.log('\n📋 RAPPORT PERIODIQUE:');
        console.log(JSON.stringify(report, null, 2));
      }

    } catch (error) {
      console.error('Erreur lors du monitoring:', error);
    }
  }, config.interval);
};

// Gestion des signaux d'arrêt
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du monitoring...');
  const report = generateReport();
  console.log('\n📋 RAPPORT FINAL:');
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt du monitoring...');
  process.exit(0);
});

// Démarrage si appelé directement
if (require.main === module) {
  startMonitoring();
}

module.exports = {
  startMonitoring,
  testEndpoints,
  analyzeMetrics,
  generateReport
};


