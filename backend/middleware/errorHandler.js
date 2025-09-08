const { ValidationError, DatabaseError } = require('sequelize');
const { logger, logApiError } = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error avec Winston
  logApiError(err, req, res, next);

  // Sequelize validation error
  if (err instanceof ValidationError) {
    const message = err.errors.map(val => val.message).join(', ');
    error = {
      message,
      code: 'VALIDATION_ERROR',
      details: err.errors
    };
    return res.status(400).json({ error });
  }

  // Sequelize database error
  if (err instanceof DatabaseError) {
    error = {
      message: 'Erreur de base de données',
      code: 'DATABASE_ERROR'
    };
    return res.status(500).json({ error });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Token invalide',
      code: 'INVALID_TOKEN'
    };
    return res.status(401).json({ error });
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expiré',
      code: 'TOKEN_EXPIRED'
    };
    return res.status(401).json({ error });
  }

  // Multer error
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      message: 'Fichier trop volumineux',
      code: 'FILE_TOO_LARGE'
    };
    return res.status(400).json({ error });
  }

  // Default error
  res.status(error.statusCode || 500).json({
    error: {
      message: error.message || 'Erreur serveur interne',
      code: error.code || 'INTERNAL_SERVER_ERROR'
    }
  });
};

module.exports = { errorHandler };
