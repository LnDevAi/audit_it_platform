const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { logger, logRequest } = require('./config/logger');
const correlationId = require('./middleware/correlationId');
const { connect: connectRedis } = require('./config/redis');
const { initMetrics, metricsMiddleware, metricsEndpoint } = require('./config/metrics');
const { healthCheckMiddleware, simpleHealthCheck, detailedHealthCheck, startPeriodicHealthChecks } = require('./middleware/healthCheck');
require('dotenv').config();

const inventoryRoutes = require('./routes/inventory');
const networkRoutes = require('./routes/network');
const vulnerabilityRoutes = require('./routes/vulnerabilities');
const reportRoutes = require('./routes/reports');
const scanRoutes = require('./routes/scans');
const uploadRoutes = require('./routes/uploads');

const { sequelize } = require('./models');
const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');

const app = express();
// Behind reverse proxies (e.g., Nginx) to get correct IP and enable secure cookies
app.set('trust proxy', 1);
// Remove Express fingerprinting
app.disable('x-powered-by');
const PORT = process.env.PORT || 5000;

// Middleware de sécurité
app.use(helmet());
// Correlation ID for tracing
app.use(correlationId);
// Optionnel: HSTS uniquement si servi derrière HTTPS
if (process.env.ENABLE_HSTS === 'true') {
  app.use(
    helmet.hsts({
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    })
  );
}
app.use(compression());

// Rate limiting
const rateLimitWindowMinutes = parseInt(
  process.env.RATE_LIMIT_WINDOW_MINUTES || process.env.RATE_LIMIT_WINDOW || '15',
  10
);
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
const limiter = rateLimit({
  windowMs: rateLimitWindowMinutes * 60 * 1000,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
});
app.use('/api/', limiter);

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Non-browser or same-origin
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Parsing
const requestLimit = process.env.REQUEST_LIMIT || '10mb';
app.use(express.json({ limit: requestLimit }));
app.use(express.urlencoded({ extended: true, limit: requestLimit }));

// Logging avec Winston
if (process.env.NODE_ENV !== 'test') {
  app.use(logRequest);
}

// Métriques Prometheus
if (process.env.ENABLE_METRICS === 'true') {
  app.use(metricsMiddleware);
  initMetrics();
}

// Routes statiques pour les uploads
app.use(
  '/uploads',
  express.static('uploads', {
    dotfiles: 'ignore',
    etag: true,
    maxAge: '7d',
    redirect: false,
  })
);

// Routes
app.use('/api/health', require('./routes/health'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/imports', require('./routes/imports'));
app.use('/api/exports', require('./routes/exports'));
app.use('/api/missions', require('./routes/missions'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/network', require('./routes/network'));
app.use('/api/servers', require('./routes/servers'));
app.use('/api/vulnerabilities', require('./routes/vulnerabilities'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/scans', require('./routes/scans'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/antivirus', require('./routes/antivirus'));
app.use('/api/wifi', require('./routes/wifi'));
app.use('/api/services', require('./routes/services'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/oidc', require('./routes/oidc'));

// Nouvelles routes sécurisées
app.use('/api/2fa', require('./routes/twoFactor'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/ports', require('./routes/portManager'));
app.use('/api/api-keys', require('./routes/apiKeys'));

// API publique
app.use('/api/public', require('./routes/apiPublic'));

// Endpoints de monitoring
if (process.env.ENABLE_METRICS === 'true') {
  app.get('/metrics', metricsEndpoint);
}
app.get('/health', simpleHealthCheck);
app.get('/health/detailed', detailedHealthCheck);


// Middleware d'erreur
app.use(notFound);
app.use(errorHandler);

// Démarrage du serveur
const startServer = async () => {
  try {
    // Test de connexion à la base de données
    await sequelize.authenticate();
    logger.info('✅ Connexion à la base de données établie');

    // Configuration automatique des ports au démarrage
    if (process.env.AUTO_PORT_CONFIG === 'true') {
      try {
        const portManagerService = require('./services/portManagerService');
        await portManagerService.autoConfigurePorts();
        portManagerService.updateEnvironmentVariables();
        logger.info('✅ Ports configurés automatiquement');
      } catch (err) {
        logger.warn('⚠️  Erreur configuration automatique des ports:', err.message);
      }
    }

    // Connexion à Redis
    if (process.env.REDIS_HOST) {
      const redisConnected = await connectRedis();
      if (redisConnected) {
        logger.info('✅ Connexion à Redis établie');
        
        // Initialisation du système de queue
        try {
          const queueService = require('./services/queueService');
          logger.info('✅ Système de queue initialisé');
        } catch (err) {
          logger.warn('⚠️  Erreur initialisation queue:', err.message);
        }
      } else {
        logger.warn('⚠️ Connexion à Redis échouée, le cache sera désactivé');
      }
    }

    // Synchronisation des modèles (en développement uniquement)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('✅ Modèles synchronisés avec la base de données');
    }

    // Démarrer les health checks périodiques
    startPeriodicHealthChecks();

    app.listen(PORT, () => {
      logger.info(`🚀 Serveur démarré sur le port ${PORT}`);
      logger.info(`📊 Dashboard API: http://localhost:${PORT}/api/health`);
      logger.info(`🔍 Health Check: http://localhost:${PORT}/health`);
      logger.info(`📈 Métriques: http://localhost:${PORT}/metrics`);
      logger.info(`🔒 Environnement: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Gestion des arrêts gracieux
process.on('SIGTERM', async () => {
  logger.info('🛑 Signal SIGTERM reçu, arrêt du serveur...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('🛑 Signal SIGINT reçu, arrêt du serveur...');
  await sequelize.close();
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = app;
