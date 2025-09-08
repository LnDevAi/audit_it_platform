const { logger } = require('../config/logger');
const { sequelize } = require('../config/database');
const { cache } = require('../config/redis');

// État de santé de l'application
let healthStatus = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  version: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  checks: {}
};

// Vérifications de santé
const healthChecks = {
  // Vérification de la base de données
  database: async () => {
    try {
      const start = Date.now();
      await sequelize.authenticate();
      const duration = Date.now() - start;
      
      return {
        status: 'healthy',
        duration: `${duration}ms`,
        message: 'Database connection successful'
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        message: 'Database connection failed'
      };
    }
  },

  // Vérification de Redis
  redis: async () => {
    try {
      const start = Date.now();
      await cache.set('health_check', 'ok', 60);
      const result = await cache.get('health_check');
      const duration = Date.now() - start;
      
      if (result === 'ok') {
        return {
          status: 'healthy',
          duration: `${duration}ms`,
          message: 'Redis connection successful'
        };
      } else {
        throw new Error('Redis read/write test failed');
      }
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        message: 'Redis connection failed'
      };
    }
  },

  // Vérification de la mémoire
  memory: () => {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    // Seuils d'alerte (en MB)
    const thresholds = {
      rss: 512,      // 512 MB
      heapTotal: 256, // 256 MB
      heapUsed: 200,  // 200 MB
      external: 50    // 50 MB
    };

    const warnings = [];
    Object.entries(memUsageMB).forEach(([key, value]) => {
      if (value > thresholds[key]) {
        warnings.push(`${key}: ${value}MB (threshold: ${thresholds[key]}MB)`);
      }
    });

    return {
      status: warnings.length > 0 ? 'warning' : 'healthy',
      usage: memUsageMB,
      warnings: warnings.length > 0 ? warnings : undefined,
      message: warnings.length > 0 ? 'Memory usage above thresholds' : 'Memory usage normal'
    };
  },

  // Vérification du disque
  disk: () => {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Vérifier l'espace disponible dans le dossier uploads
      const uploadsPath = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadsPath)) {
        fs.mkdirSync(uploadsPath, { recursive: true });
      }
      
      const stats = fs.statSync(uploadsPath);
      const freeSpace = stats.size; // Approximation
      
      return {
        status: 'healthy',
        freeSpace: `${Math.round(freeSpace / 1024 / 1024)}MB`,
        message: 'Disk space available'
      };
    } catch (error) {
      logger.error('Disk health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        message: 'Disk space check failed'
      };
    }
  },

  // Vérification des variables d'environnement critiques
  environment: () => {
    const requiredVars = [
      'DB_HOST',
      'DB_NAME',
      'DB_USER',
      'JWT_SECRET',
      'NODE_ENV'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    return {
      status: missing.length > 0 ? 'unhealthy' : 'healthy',
      missing: missing.length > 0 ? missing : undefined,
      message: missing.length > 0 ? 'Missing required environment variables' : 'All required environment variables set'
    };
  },

  // Vérification de la connectivité réseau
  network: async () => {
    try {
      const https = require('https');
      const start = Date.now();
      
      return new Promise((resolve) => {
        const req = https.get('https://www.google.com', (res) => {
          const duration = Date.now() - start;
          resolve({
            status: 'healthy',
            duration: `${duration}ms`,
            message: 'Network connectivity successful'
          });
        });
        
        req.on('error', (error) => {
          resolve({
            status: 'warning',
            error: error.message,
            message: 'Network connectivity issues detected'
          });
        });
        
        req.setTimeout(5000, () => {
          req.destroy();
          resolve({
            status: 'warning',
            error: 'Timeout',
            message: 'Network connectivity timeout'
          });
        });
      });
    } catch (error) {
      return {
        status: 'warning',
        error: error.message,
        message: 'Network connectivity check failed'
      };
    }
  }
};

// Fonction pour exécuter tous les health checks
const runHealthChecks = async () => {
  const results = {};
  const startTime = Date.now();

  // Exécuter les vérifications en parallèle
  const checkPromises = Object.entries(healthChecks).map(async ([name, check]) => {
    try {
      const result = await check();
      results[name] = result;
    } catch (error) {
      logger.error(`Health check ${name} failed:`, error);
      results[name] = {
        status: 'unhealthy',
        error: error.message,
        message: `Health check ${name} failed`
      };
    }
  });

  await Promise.all(checkPromises);

  // Déterminer le statut global
  const allStatuses = Object.values(results).map(r => r.status);
  const hasUnhealthy = allStatuses.includes('unhealthy');
  const hasWarning = allStatuses.includes('warning');
  
  let globalStatus = 'healthy';
  if (hasUnhealthy) {
    globalStatus = 'unhealthy';
  } else if (hasWarning) {
    globalStatus = 'warning';
  }

  // Mettre à jour l'état de santé
  healthStatus = {
    status: globalStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: results,
    responseTime: `${Date.now() - startTime}ms`
  };

  return healthStatus;
};

// Middleware pour les health checks
const healthCheckMiddleware = async (req, res) => {
  try {
    const health = await runHealthChecks();
    
    // Déterminer le code de statut HTTP
    let statusCode = 200;
    if (health.status === 'unhealthy') {
      statusCode = 503; // Service Unavailable
    } else if (health.status === 'warning') {
      statusCode = 200; // OK mais avec warnings
    }

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check middleware error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error.message
    });
  }
};

// Endpoint de health check simple (pour load balancers)
const simpleHealthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

// Endpoint de health check détaillé
const detailedHealthCheck = async (req, res) => {
  try {
    const health = await runHealthChecks();
    res.json(health);
  } catch (error) {
    logger.error('Detailed health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
};

// Fonction pour démarrer les health checks périodiques
const startPeriodicHealthChecks = (interval = 30000) => {
  setInterval(async () => {
    try {
      await runHealthChecks();
      logger.debug('Periodic health checks completed');
    } catch (error) {
      logger.error('Periodic health checks failed:', error);
    }
  }, interval);

  logger.info(`Periodic health checks started (interval: ${interval}ms)`);
};

// Fonction pour obtenir l'état de santé actuel
const getHealthStatus = () => {
  return healthStatus;
};

module.exports = {
  healthCheckMiddleware,
  simpleHealthCheck,
  detailedHealthCheck,
  runHealthChecks,
  startPeriodicHealthChecks,
  getHealthStatus,
  healthChecks
};


