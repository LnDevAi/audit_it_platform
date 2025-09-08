const jwt = require('jsonwebtoken');
const { cache } = require('../config/redis');
const { logger } = require('../config/logger');

class JWTBlacklistService {
  /**
   * Révoque un token JWT en l'ajoutant à la blacklist
   */
  static async revokeToken(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        throw new Error('Token invalide');
      }

      // Calculer le TTL (temps restant avant expiration)
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl <= 0) {
        // Token déjà expiré, pas besoin de le blacklister
        return true;
      }

      // Ajouter à la blacklist avec TTL
      const blacklistKey = `blacklist:${token}`;
      await cache.set(blacklistKey, true, ttl);

      logger.info(`Token révoqué avec succès, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error('Erreur révocation token:', error);
      throw error;
    }
  }

  /**
   * Vérifie si un token est dans la blacklist
   */
  static async isTokenRevoked(token) {
    try {
      const blacklistKey = `blacklist:${token}`;
      const isRevoked = await cache.exists(blacklistKey);
      return isRevoked;
    } catch (error) {
      logger.error('Erreur vérification blacklist:', error);
      // En cas d'erreur, considérer le token comme valide pour éviter de bloquer l'utilisateur
      return false;
    }
  }

  /**
   * Révoque tous les tokens d'un utilisateur (logout global)
   */
  static async revokeAllUserTokens(userId) {
    try {
      // Créer une clé pour marquer que tous les tokens de cet utilisateur sont révoqués
      const userBlacklistKey = `user_blacklist:${userId}`;
      const ttl = 24 * 60 * 60; // 24 heures
      
      await cache.set(userBlacklistKey, Date.now(), ttl);
      
      logger.info(`Tous les tokens de l'utilisateur ${userId} ont été révoqués`);
      return true;
    } catch (error) {
      logger.error('Erreur révocation tokens utilisateur:', error);
      throw error;
    }
  }

  /**
   * Vérifie si un utilisateur a ses tokens révoqués
   */
  static async isUserTokensRevoked(userId) {
    try {
      const userBlacklistKey = `user_blacklist:${userId}`;
      const isRevoked = await cache.exists(userBlacklistKey);
      return isRevoked;
    } catch (error) {
      logger.error('Erreur vérification blacklist utilisateur:', error);
      return false;
    }
  }

  /**
   * Nettoie les tokens expirés de la blacklist
   */
  static async cleanupExpiredTokens() {
    try {
      // Redis gère automatiquement l'expiration des clés avec TTL
      // Cette méthode peut être utilisée pour des opérations de maintenance
      logger.info('Nettoyage des tokens expirés effectué');
      return true;
    } catch (error) {
      logger.error('Erreur nettoyage tokens expirés:', error);
      return false;
    }
  }

  /**
   * Obtient les statistiques de la blacklist
   */
  static async getBlacklistStats() {
    try {
      const blacklistKeys = await cache.client.keys('blacklist:*');
      const userBlacklistKeys = await cache.client.keys('user_blacklist:*');
      
      return {
        revokedTokens: blacklistKeys.length,
        revokedUsers: userBlacklistKeys.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Erreur récupération stats blacklist:', error);
      return {
        revokedTokens: 0,
        revokedUsers: 0,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = JWTBlacklistService;
