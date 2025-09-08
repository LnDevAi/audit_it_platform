const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const ApiKeyService = require('../services/apiKeyService');
const { logger } = require('../config/logger');
const router = express.Router();

/**
 * @route POST /api/api-keys
 * @desc Créer une nouvelle clé API
 * @access Private - Admin
 */
router.post('/', authenticateToken, requireRole(['super_admin', 'org_admin']), async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const user = req.user;

    if (!name) {
      return res.status(400).json({
        error: 'Nom de la clé API requis'
      });
    }

    const result = await ApiKeyService.generateApiKey(
      user.organization_id,
      name,
      permissions || []
    );

    res.status(201).json({
      message: 'Clé API créée avec succès',
      apiKey: result
    });
  } catch (error) {
    logger.error('Erreur création clé API:', error);
    res.status(500).json({
      error: error.message || 'Erreur lors de la création de la clé API'
    });
  }
});

/**
 * @route GET /api/api-keys
 * @desc Liste des clés API de l'organisation
 * @access Private - Admin
 */
router.get('/', authenticateToken, requireRole(['super_admin', 'org_admin']), async (req, res) => {
  try {
    const user = req.user;
    const apiKeys = await ApiKeyService.listApiKeys(user.organization_id);

    res.json({
      apiKeys: apiKeys
    });
  } catch (error) {
    logger.error('Erreur liste clés API:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des clés API'
    });
  }
});

/**
 * @route GET /api/api-keys/:id
 * @desc Détails d'une clé API
 * @access Private - Admin
 */
router.get('/:id', authenticateToken, requireRole(['super_admin', 'org_admin']), async (req, res) => {
  try {
    const user = req.user;
    const apiKeys = await ApiKeyService.listApiKeys(user.organization_id);
    const apiKey = apiKeys.find(key => key.id === parseInt(req.params.id));

    if (!apiKey) {
      return res.status(404).json({
        error: 'Clé API non trouvée'
      });
    }

    res.json({
      apiKey: apiKey
    });
  } catch (error) {
    logger.error('Erreur récupération clé API:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la clé API'
    });
  }
});

/**
 * @route PUT /api/api-keys/:id/permissions
 * @desc Mettre à jour les permissions d'une clé API
 * @access Private - Admin
 */
router.put('/:id/permissions', authenticateToken, requireRole(['super_admin', 'org_admin']), async (req, res) => {
  try {
    const { permissions } = req.body;
    const user = req.user;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        error: 'Permissions doit être un tableau'
      });
    }

    await ApiKeyService.updateApiKeyPermissions(
      req.params.id,
      user.organization_id,
      permissions
    );

    res.json({
      message: 'Permissions mises à jour avec succès'
    });
  } catch (error) {
    logger.error('Erreur mise à jour permissions clé API:', error);
    res.status(500).json({
      error: error.message || 'Erreur lors de la mise à jour des permissions'
    });
  }
});

/**
 * @route DELETE /api/api-keys/:id
 * @desc Révoquer une clé API
 * @access Private - Admin
 */
router.delete('/:id', authenticateToken, requireRole(['super_admin', 'org_admin']), async (req, res) => {
  try {
    const user = req.user;

    await ApiKeyService.revokeApiKey(req.params.id, user.organization_id);

    res.json({
      message: 'Clé API révoquée avec succès'
    });
  } catch (error) {
    logger.error('Erreur révocation clé API:', error);
    res.status(500).json({
      error: error.message || 'Erreur lors de la révocation de la clé API'
    });
  }
});

/**
 * @route POST /api/api-keys/:id/regenerate
 * @desc Régénérer le secret d'une clé API
 * @access Private - Admin
 */
router.post('/:id/regenerate', authenticateToken, requireRole(['super_admin', 'org_admin']), async (req, res) => {
  try {
    const user = req.user;

    const result = await ApiKeyService.regenerateApiKeySecret(
      req.params.id,
      user.organization_id
    );

    res.json({
      message: 'Secret régénéré avec succès',
      apiKey: result
    });
  } catch (error) {
    logger.error('Erreur régénération secret clé API:', error);
    res.status(500).json({
      error: error.message || 'Erreur lors de la régénération du secret'
    });
  }
});

/**
 * @route GET /api/api-keys/stats
 * @desc Statistiques des clés API
 * @access Private - Admin
 */
router.get('/stats', authenticateToken, requireRole(['super_admin', 'org_admin']), async (req, res) => {
  try {
    const user = req.user;
    const stats = await ApiKeyService.getApiKeyStats(user.organization_id);

    res.json({
      stats: stats
    });
  } catch (error) {
    logger.error('Erreur stats clés API:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

/**
 * @route POST /api/api-keys/cleanup
 * @desc Nettoyer les clés API expirées
 * @access Private - Super Admin
 */
router.post('/cleanup', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const cleanedCount = await ApiKeyService.cleanupExpiredKeys();

    res.json({
      message: `${cleanedCount} clés API expirées nettoyées`,
      cleanedCount: cleanedCount
    });
  } catch (error) {
    logger.error('Erreur nettoyage clés API:', error);
    res.status(500).json({
      error: 'Erreur lors du nettoyage des clés API'
    });
  }
});

module.exports = router;
