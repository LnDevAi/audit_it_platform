const crypto = require('crypto');
const { Organization, ApiKey } = require('../models');
const { logger } = require('../config/logger');

class ApiKeyService {
  /**
   * Génère une nouvelle clé API
   */
  static async generateApiKey(organizationId, name, permissions = []) {
    try {
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        throw new Error('Organisation non trouvée');
      }

      // Générer la clé API
      const keyId = crypto.randomBytes(16).toString('hex');
      const keySecret = crypto.randomBytes(32).toString('hex');
      const apiKey = `${keyId}.${keySecret}`;
      
      // Hash de la clé pour stockage sécurisé
      const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

      // Créer l'enregistrement en base
      const apiKeyRecord = await ApiKey.create({
        organization_id: organizationId,
        name: name,
        key_id: keyId,
        key_hash: hashedKey,
        permissions: permissions,
        status: 'active',
        last_used_at: null,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 an
      });

      logger.info(`Clé API générée pour l'organisation ${organizationId}: ${name}`);
      
      return {
        id: apiKeyRecord.id,
        name: apiKeyRecord.name,
        apiKey: apiKey, // Retourner la clé complète une seule fois
        keyId: keyId,
        permissions: permissions,
        expiresAt: apiKeyRecord.expires_at
      };
    } catch (error) {
      logger.error('Erreur génération clé API:', error);
      throw error;
    }
  }

  /**
   * Vérifie une clé API
   */
  static async verifyApiKey(apiKey) {
    try {
      if (!apiKey || !apiKey.includes('.')) {
        return null;
      }

      const [keyId, keySecret] = apiKey.split('.');
      if (!keyId || !keySecret) {
        return null;
      }

      // Trouver la clé par ID
      const apiKeyRecord = await ApiKey.findOne({
        where: { 
          key_id: keyId,
          status: 'active'
        },
        include: [{
          model: Organization,
          where: { status: 'active' }
        }]
      });

      if (!apiKeyRecord) {
        return null;
      }

      // Vérifier si la clé a expiré
      if (apiKeyRecord.expires_at && new Date() > apiKeyRecord.expires_at) {
        await apiKeyRecord.update({ status: 'expired' });
        return null;
      }

      // Vérifier le hash de la clé
      const fullKey = `${keyId}.${keySecret}`;
      const hashedKey = crypto.createHash('sha256').update(fullKey).digest('hex');
      
      if (hashedKey !== apiKeyRecord.key_hash) {
        return null;
      }

      // Mettre à jour la dernière utilisation
      await apiKeyRecord.update({ 
        last_used_at: new Date(),
        usage_count: (apiKeyRecord.usage_count || 0) + 1
      });

      return {
        id: apiKeyRecord.id,
        organizationId: apiKeyRecord.organization_id,
        name: apiKeyRecord.name,
        permissions: apiKeyRecord.permissions,
        organization: apiKeyRecord.Organization
      };
    } catch (error) {
      logger.error('Erreur vérification clé API:', error);
      return null;
    }
  }

  /**
   * Révoque une clé API
   */
  static async revokeApiKey(apiKeyId, organizationId) {
    try {
      const apiKey = await ApiKey.findOne({
        where: { 
          id: apiKeyId,
          organization_id: organizationId
        }
      });

      if (!apiKey) {
        throw new Error('Clé API non trouvée');
      }

      await apiKey.update({ status: 'revoked' });
      
      logger.info(`Clé API ${apiKeyId} révoquée pour l'organisation ${organizationId}`);
      return true;
    } catch (error) {
      logger.error('Erreur révocation clé API:', error);
      throw error;
    }
  }

  /**
   * Liste les clés API d'une organisation
   */
  static async listApiKeys(organizationId) {
    try {
      const apiKeys = await ApiKey.findAll({
        where: { organization_id: organizationId },
        order: [['created_at', 'DESC']],
        attributes: ['id', 'name', 'key_id', 'permissions', 'status', 'last_used_at', 'expires_at', 'usage_count', 'created_at']
      });

      return apiKeys.map(key => ({
        id: key.id,
        name: key.name,
        keyId: key.key_id,
        permissions: key.permissions,
        status: key.status,
        lastUsedAt: key.last_used_at,
        expiresAt: key.expires_at,
        usageCount: key.usage_count,
        createdAt: key.created_at
      }));
    } catch (error) {
      logger.error('Erreur liste clés API:', error);
      throw error;
    }
  }

  /**
   * Met à jour les permissions d'une clé API
   */
  static async updateApiKeyPermissions(apiKeyId, organizationId, permissions) {
    try {
      const apiKey = await ApiKey.findOne({
        where: { 
          id: apiKeyId,
          organization_id: organizationId
        }
      });

      if (!apiKey) {
        throw new Error('Clé API non trouvée');
      }

      await apiKey.update({ permissions: permissions });
      
      logger.info(`Permissions mises à jour pour la clé API ${apiKeyId}`);
      return true;
    } catch (error) {
      logger.error('Erreur mise à jour permissions clé API:', error);
      throw error;
    }
  }

  /**
   * Vérifie si une clé API a une permission spécifique
   */
  static hasPermission(apiKeyData, permission) {
    if (!apiKeyData || !apiKeyData.permissions) {
      return false;
    }

    return apiKeyData.permissions.includes(permission) || 
           apiKeyData.permissions.includes('*'); // Permission globale
  }

  /**
   * Obtient les statistiques d'utilisation des clés API
   */
  static async getApiKeyStats(organizationId) {
    try {
      const stats = await ApiKey.findAll({
        where: { organization_id: organizationId },
        attributes: [
          'status',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
          [require('sequelize').fn('SUM', require('sequelize').col('usage_count')), 'total_usage']
        ],
        group: ['status'],
        raw: true
      });

      const totalKeys = await ApiKey.count({
        where: { organization_id: organizationId }
      });

      const activeKeys = await ApiKey.count({
        where: { 
          organization_id: organizationId,
          status: 'active'
        }
      });

      return {
        total: totalKeys,
        active: activeKeys,
        revoked: totalKeys - activeKeys,
        stats: stats
      };
    } catch (error) {
      logger.error('Erreur statistiques clés API:', error);
      throw error;
    }
  }

  /**
   * Nettoie les clés API expirées
   */
  static async cleanupExpiredKeys() {
    try {
      const expiredKeys = await ApiKey.findAll({
        where: {
          expires_at: {
            [require('sequelize').Op.lt]: new Date()
          },
          status: 'active'
        }
      });

      for (const key of expiredKeys) {
        await key.update({ status: 'expired' });
      }

      logger.info(`${expiredKeys.length} clés API expirées nettoyées`);
      return expiredKeys.length;
    } catch (error) {
      logger.error('Erreur nettoyage clés API expirées:', error);
      throw error;
    }
  }

  /**
   * Génère un nouveau secret pour une clé API existante
   */
  static async regenerateApiKeySecret(apiKeyId, organizationId) {
    try {
      const apiKey = await ApiKey.findOne({
        where: { 
          id: apiKeyId,
          organization_id: organizationId
        }
      });

      if (!apiKey) {
        throw new Error('Clé API non trouvée');
      }

      // Générer un nouveau secret
      const newSecret = crypto.randomBytes(32).toString('hex');
      const newApiKey = `${apiKey.key_id}.${newSecret}`;
      const newHashedKey = crypto.createHash('sha256').update(newApiKey).digest('hex');

      // Mettre à jour en base
      await apiKey.update({ 
        key_hash: newHashedKey,
        last_used_at: null,
        usage_count: 0
      });

      logger.info(`Secret régénéré pour la clé API ${apiKeyId}`);
      
      return {
        id: apiKey.id,
        name: apiKey.name,
        apiKey: newApiKey,
        keyId: apiKey.key_id
      };
    } catch (error) {
      logger.error('Erreur régénération secret clé API:', error);
      throw error;
    }
  }
}

module.exports = ApiKeyService;
