const promClient = require('prom-client');
const { logger } = require('./logger');
const { sequelize } = require('../models');

// Configuration des métriques Prometheus
const register = new promClient.Registry();

// Ajouter les métriques par défaut
promClient.collectDefaultMetrics({ register });

// Métriques personnalisées
const metrics = {
  // Compteur de requêtes HTTP
  httpRequestsTotal: new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'organization_id'],
    registers: [register]
  }),

  // Histogram des temps de réponse
  httpRequestDuration: new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'organization_id'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [register]
  }),

  // Compteur d'erreurs
  httpErrorsTotal: new promClient.Counter({
    name: 'http_errors_total',
    help: 'Total number of HTTP errors',
    labelNames: ['method', 'route', 'error_type', 'organization_id'],
    registers: [register]
  }),

  // Gauge des utilisateurs actifs
  activeUsers: new promClient.Gauge({
    name: 'active_users_total',
    help: 'Total number of active users',
    labelNames: ['organization_id'],
    registers: [register]
  }),

  // Gauge des missions actives
  activeMissions: new promClient.Gauge({
    name: 'active_missions_total',
    help: 'Total number of active missions',
    labelNames: ['organization_id', 'status'],
    registers: [register]
  }),

  // Compteur d'opérations de base de données
  databaseOperations: new promClient.Counter({
    name: 'database_operations_total',
    help: 'Total number of database operations',
    labelNames: ['operation', 'table', 'organization_id'],
    registers: [register]
  }),

  // Histogram des temps de requête DB
  databaseQueryDuration: new promClient.Histogram({
    name: 'database_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register]
  }),

  // Compteur d'opérations de cache
  cacheOperations: new promClient.Counter({
    name: 'cache_operations_total',
    help: 'Total number of cache operations',
    labelNames: ['operation', 'hit_miss'],
    registers: [register]
  }),

  // Gauge de l'utilisation de la mémoire
  memoryUsage: new promClient.Gauge({
    name: 'nodejs_memory_usage_bytes',
    help: 'Node.js memory usage in bytes',
    labelNames: ['type'],
    registers: [register]
  }),

  // Gauge de l'utilisation CPU
  cpuUsage: new promClient.Gauge({
    name: 'nodejs_cpu_usage_percent',
    help: 'Node.js CPU usage percentage',
    registers: [register]
  }),

  // Compteur d'événements de sécurité
  securityEvents: new promClient.Counter({
    name: 'security_events_total',
    help: 'Total number of security events',
    labelNames: ['event_type', 'severity', 'organization_id'],
    registers: [register]
  }),

  // Gauge des exports/imports en cours
  dataOperations: new promClient.Gauge({
    name: 'data_operations_total',
    help: 'Total number of data import/export operations',
    labelNames: ['operation_type', 'status', 'organization_id'],
    registers: [register]
  })
};

// Middleware pour collecter les métriques HTTP
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  const organizationId = req.user?.organization_id || 'anonymous';

  // Intercepter la fin de la réponse
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;

    // Incrémenter le compteur de requêtes
    metrics.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode,
      organization_id: organizationId
    });

    // Enregistrer la durée de la requête
    metrics.httpRequestDuration.observe({
      method,
      route,
      organization_id: organizationId
    }, duration);

    // Compter les erreurs
    if (statusCode >= 400) {
      const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
      metrics.httpErrorsTotal.inc({
        method,
        route,
        error_type: errorType,
        organization_id: organizationId
      });
    }
  });

  next();
};

// Fonction pour mettre à jour les métriques système
const updateSystemMetrics = () => {
  const memUsage = process.memoryUsage();
  
  metrics.memoryUsage.set({ type: 'rss' }, memUsage.rss);
  metrics.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
  metrics.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
  metrics.memoryUsage.set({ type: 'external' }, memUsage.external);

  // CPU usage (approximation)
  const startUsage = process.cpuUsage();
  setTimeout(() => {
    const endUsage = process.cpuUsage(startUsage);
    const cpuPercent = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
    metrics.cpuUsage.set(cpuPercent);
  }, 100);
};

// Fonction pour mettre à jour les métriques métier
const updateBusinessMetrics = async () => {
  try {
    const { User, AuditMission, Organization } = require('../models');

    // Compter les utilisateurs actifs par organisation
    const usersByOrg = await User.findAll({
      attributes: ['organization_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { status: 'active' },
      group: ['organization_id']
    });

    usersByOrg.forEach(({ organization_id, dataValues }) => {
      metrics.activeUsers.set({ organization_id }, parseInt(dataValues.count));
    });

    // Compter les missions actives par organisation et statut
    const missionsByOrg = await AuditMission.findAll({
      attributes: ['organization_id', 'status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['organization_id', 'status']
    });

    missionsByOrg.forEach(({ organization_id, status, dataValues }) => {
      metrics.activeMissions.set({ organization_id, status }, parseInt(dataValues.count));
    });

  } catch (error) {
    logger.error('Error updating business metrics:', error);
  }
};

// Endpoint pour exposer les métriques
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
};

// Fonction pour initialiser les métriques
const initMetrics = () => {
  // Mettre à jour les métriques système toutes les 30 secondes
  setInterval(updateSystemMetrics, 30000);

  // Mettre à jour les métriques métier toutes les 5 minutes
  setInterval(updateBusinessMetrics, 300000);

  logger.info('Metrics system initialized');
};

// Fonctions utilitaires pour les métriques
const recordDatabaseOperation = (operation, table, organizationId = null, duration = null) => {
  metrics.databaseOperations.inc({
    operation,
    table,
    organization_id: organizationId || 'system'
  });

  if (duration !== null) {
    metrics.databaseQueryDuration.observe({ operation, table }, duration);
  }
};

const recordCacheOperation = (operation, hitMiss) => {
  metrics.cacheOperations.inc({ operation, hit_miss: hitMiss });
};

const recordSecurityEvent = (eventType, severity, organizationId = null) => {
  metrics.securityEvents.inc({
    event_type: eventType,
    severity,
    organization_id: organizationId || 'system'
  });
};

const recordDataOperation = (operationType, status, organizationId = null) => {
  metrics.dataOperations.inc({
    operation_type: operationType,
    status,
    organization_id: organizationId || 'system'
  });
};

module.exports = {
  register,
  metrics,
  metricsMiddleware,
  metricsEndpoint,
  initMetrics,
  recordDatabaseOperation,
  recordCacheOperation,
  recordSecurityEvent,
  recordDataOperation,
  updateSystemMetrics,
  updateBusinessMetrics
};


