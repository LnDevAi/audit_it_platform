const ApiKeyService = require('../services/apiKeyService');
const { logger } = require('../config/logger');

/**
 * Middleware d'authentification par clé API
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'Clé API requise',
        code: 'API_KEY_REQUIRED',
        message: 'Veuillez fournir une clé API valide dans l\'en-tête X-API-Key ou Authorization'
      });
    }

    const apiKeyData = await ApiKeyService.verifyApiKey(apiKey);
    
    if (!apiKeyData) {
      return res.status(401).json({
        error: 'Clé API invalide',
        code: 'INVALID_API_KEY',
        message: 'La clé API fournie est invalide, expirée ou révoquée'
      });
    }

    // Ajouter les données de la clé API à la requête
    req.apiKey = apiKeyData;
    req.organizationId = apiKeyData.organizationId;
    
    next();
  } catch (error) {
    logger.error('Erreur authentification clé API:', error);
    return res.status(500).json({
      error: 'Erreur d\'authentification',
      code: 'AUTH_ERROR',
      message: 'Une erreur est survenue lors de l\'authentification'
    });
  }
};

/**
 * Middleware pour vérifier les permissions de la clé API
 */
const requireApiPermission = (permission) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        error: 'Authentification requise',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!ApiKeyService.hasPermission(req.apiKey, permission)) {
      return res.status(403).json({
        error: 'Permission insuffisante',
        code: 'INSUFFICIENT_PERMISSION',
        message: `Permission '${permission}' requise pour cette opération`
      });
    }

    next();
  };
};

/**
 * Middleware pour les endpoints publics (sans authentification)
 */
const publicEndpoint = (req, res, next) => {
  // Marquer comme endpoint public
  req.isPublicEndpoint = true;
  next();
};

/**
 * Middleware de rate limiting pour l'API publique
 */
const apiRateLimit = (req, res, next) => {
  // Rate limiting basé sur la clé API
  if (req.apiKey) {
    // Logique de rate limiting personnalisée
    // Ici on pourrait implémenter un rate limiting par organisation
    req.rateLimitKey = `api:${req.apiKey.organizationId}`;
  }
  
  next();
};

/**
 * Middleware pour logger les requêtes API
 */
const logApiRequest = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    if (req.apiKey) {
      logData.apiKeyId = req.apiKey.id;
      logData.organizationId = req.apiKey.organizationId;
      logData.apiKeyName = req.apiKey.name;
    }

    if (res.statusCode >= 400) {
      logger.warn('API Request Error:', logData);
    } else {
      logger.info('API Request:', logData);
    }
  });

  next();
};

/**
 * Middleware pour valider les paramètres de requête
 */
const validateApiRequest = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          error: 'Paramètres invalides',
          code: 'INVALID_PARAMETERS',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }

      req.body = value;
      next();
    } catch (err) {
      logger.error('Erreur validation requête API:', err);
      return res.status(500).json({
        error: 'Erreur de validation',
        code: 'VALIDATION_ERROR'
      });
    }
  };
};

/**
 * Middleware pour formater les réponses API
 */
const formatApiResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    const response = {
      success: res.statusCode < 400,
      data: data,
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown'
    };

    if (req.apiKey) {
      response.organizationId = req.apiKey.organizationId;
    }

    return originalJson.call(this, response);
  };

  next();
};

/**
 * Middleware pour gérer les erreurs API
 */
const handleApiError = (err, req, res, next) => {
  logger.error('API Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    apiKeyId: req.apiKey?.id,
    organizationId: req.apiKey?.organizationId
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Erreur de validation',
      code: 'VALIDATION_ERROR',
      details: err.errors
    });
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Erreur de validation des données',
      code: 'DATABASE_VALIDATION_ERROR',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      error: 'Conflit de données',
      code: 'DUPLICATE_ENTRY',
      message: 'Une ressource avec ces données existe déjà'
    });
  }

  // Erreur par défaut
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
};

module.exports = {
  authenticateApiKey,
  requireApiPermission,
  publicEndpoint,
  apiRateLimit,
  logApiRequest,
  validateApiRequest,
  formatApiResponse,
  handleApiError
};
