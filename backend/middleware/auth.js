const jwt = require('jsonwebtoken');
const { User, Permission } = require('../models');
const JWTBlacklistService = require('../services/jwtBlacklistService');
const TwoFactorService = require('../services/twoFactorService');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Token d\'accès requis',
      code: 'NO_TOKEN'
    });
  }

  try {
    // Vérifier si le token est dans la blacklist
    const isRevoked = await JWTBlacklistService.isTokenRevoked(token);
    if (isRevoked) {
      return res.status(401).json({ 
        error: 'Token révoqué',
        code: 'TOKEN_REVOKED'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier si l'utilisateur a ses tokens révoqués
    const userTokensRevoked = await JWTBlacklistService.isUserTokensRevoked(decoded.userId);
    if (userTokensRevoked) {
      return res.status(401).json({ 
        error: 'Session révoquée',
        code: 'USER_SESSION_REVOKED'
      });
    }

    const user = await User.findByPk(decoded.userId, {
      include: [{
        model: Permission,
        through: { attributes: [] }
      }]
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({ 
        error: 'Utilisateur non autorisé',
        code: 'INVALID_USER'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ 
      error: 'Token invalide',
      code: 'INVALID_TOKEN'
    });
  }
};

// Middleware pour vérifier la 2FA
const require2FA = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentification requise',
      code: 'NOT_AUTHENTICATED'
    });
  }

  if (req.user.two_factor_enabled) {
    const twoFactorToken = req.headers['x-2fa-token'];
    if (!twoFactorToken) {
      return res.status(401).json({ 
        error: 'Token 2FA requis',
        code: '2FA_TOKEN_REQUIRED'
      });
    }

    const isValid = await TwoFactorService.verifyToken(req.user, twoFactorToken);
    if (!isValid) {
      return res.status(401).json({ 
        error: 'Token 2FA invalide',
        code: 'INVALID_2FA_TOKEN'
      });
    }
  }

  next();
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentification requise',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const userPermissions = req.user.Permissions?.map(p => p.name) || [];
    const hasPermission = userPermissions.includes(permission) || 
                         userPermissions.includes('admin') ||
                         req.user.role === 'admin';

    if (!hasPermission) {
      return res.status(403).json({ 
        error: `Permission '${permission}' requise`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

const requireRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentification requise',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Rôle insuffisant',
        code: 'INSUFFICIENT_ROLE'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requirePermission,
  requireRole,
  require2FA
};
