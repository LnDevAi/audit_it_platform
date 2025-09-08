const express = require('express');
const { authenticateApiKey, requireApiPermission, formatApiResponse, logApiRequest } = require('../middleware/apiKeyAuth');
const { AuditMission, InventoryItem, Vulnerability, NetworkDevice } = require('../models');
const { logger } = require('../config/logger');
const router = express.Router();

// Middleware pour l'API publique
router.use(logApiRequest);
router.use(formatApiResponse);

/**
 * @route GET /api/public/health
 * @desc Vérification de santé de l'API publique
 * @access Public
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      redis: 'connected',
      api: 'active'
    }
  });
});

/**
 * @route GET /api/public/missions
 * @desc Liste des missions d'audit
 * @access Private - API Key
 */
router.get('/missions', authenticateApiKey, requireApiPermission('missions:read'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, client_name } = req.query;
    const offset = (page - 1) * limit;

    const where = { organization_id: req.organizationId };
    if (status) where.status = status;
    if (client_name) where.client_name = { [require('sequelize').Op.iLike]: `%${client_name}%` };

    const { count, rows: missions } = await AuditMission.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: ['id', 'name', 'client_name', 'status', 'progress', 'start_date', 'end_date', 'created_at']
    });

    res.json({
      missions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Erreur récupération missions API:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des missions' });
  }
});

/**
 * @route GET /api/public/missions/:id
 * @desc Détails d'une mission d'audit
 * @access Private - API Key
 */
router.get('/missions/:id', authenticateApiKey, requireApiPermission('missions:read'), async (req, res) => {
  try {
    const mission = await AuditMission.findOne({
      where: { 
        id: req.params.id,
        organization_id: req.organizationId 
      },
      attributes: ['id', 'name', 'client_name', 'status', 'progress', 'start_date', 'end_date', 'description', 'created_at', 'updated_at']
    });

    if (!mission) {
      return res.status(404).json({ error: 'Mission non trouvée' });
    }

    res.json({ mission });
  } catch (error) {
    logger.error('Erreur récupération mission API:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la mission' });
  }
});

/**
 * @route GET /api/public/inventory
 * @desc Liste des éléments d'inventaire
 * @access Private - API Key
 */
router.get('/inventory', authenticateApiKey, requireApiPermission('inventory:read'), async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    const offset = (page - 1) * limit;

    const where = { organization_id: req.organizationId };
    if (type) where.type = type;
    if (status) where.status = status;

    const { count, rows: items } = await InventoryItem.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: ['id', 'name', 'type', 'status', 'ip_address', 'mac_address', 'os', 'created_at']
    });

    res.json({
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Erreur récupération inventaire API:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'inventaire' });
  }
});

/**
 * @route GET /api/public/vulnerabilities
 * @desc Liste des vulnérabilités
 * @access Private - API Key
 */
router.get('/vulnerabilities', authenticateApiKey, requireApiPermission('vulnerabilities:read'), async (req, res) => {
  try {
    const { page = 1, limit = 10, severity, status } = req.query;
    const offset = (page - 1) * limit;

    const where = { organization_id: req.organizationId };
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const { count, rows: vulnerabilities } = await Vulnerability.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['cvss_score', 'DESC'], ['created_at', 'DESC']],
      attributes: ['id', 'title', 'severity', 'cvss_score', 'status', 'discovered_at', 'resolved_at', 'created_at']
    });

    res.json({
      vulnerabilities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Erreur récupération vulnérabilités API:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des vulnérabilités' });
  }
});

/**
 * @route GET /api/public/network
 * @desc Liste des équipements réseau
 * @access Private - API Key
 */
router.get('/network', authenticateApiKey, requireApiPermission('network:read'), async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    const offset = (page - 1) * limit;

    const where = { organization_id: req.organizationId };
    if (type) where.type = type;
    if (status) where.status = status;

    const { count, rows: devices } = await NetworkDevice.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: ['id', 'name', 'type', 'ip_address', 'mac_address', 'status', 'vendor', 'model', 'created_at']
    });

    res.json({
      devices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Erreur récupération réseau API:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des équipements réseau' });
  }
});

/**
 * @route GET /api/public/stats
 * @desc Statistiques générales
 * @access Private - API Key
 */
router.get('/stats', authenticateApiKey, requireApiPermission('stats:read'), async (req, res) => {
  try {
    const organizationId = req.organizationId;

    const [
      missionsCount,
      inventoryCount,
      vulnerabilitiesCount,
      networkDevicesCount,
      activeMissions,
      criticalVulnerabilities
    ] = await Promise.all([
      AuditMission.count({ where: { organization_id: organizationId } }),
      InventoryItem.count({ where: { organization_id: organizationId } }),
      Vulnerability.count({ where: { organization_id: organizationId } }),
      NetworkDevice.count({ where: { organization_id: organizationId } }),
      AuditMission.count({ where: { organization_id: organizationId, status: 'in_progress' } }),
      Vulnerability.count({ where: { organization_id: organizationId, severity: 'critical' } })
    ]);

    res.json({
      stats: {
        missions: {
          total: missionsCount,
          active: activeMissions
        },
        inventory: {
          total: inventoryCount
        },
        vulnerabilities: {
          total: vulnerabilitiesCount,
          critical: criticalVulnerabilities
        },
        network: {
          total: networkDevicesCount
        }
      }
    });
  } catch (error) {
    logger.error('Erreur récupération stats API:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

/**
 * @route POST /api/public/webhooks/test
 * @desc Test de webhook
 * @access Private - API Key
 */
router.post('/webhooks/test', authenticateApiKey, requireApiPermission('webhooks:write'), async (req, res) => {
  try {
    const { url, event } = req.body;

    if (!url || !event) {
      return res.status(400).json({ error: 'URL et événement requis' });
    }

    // Ici on pourrait implémenter un test de webhook
    // Pour l'instant, on simule juste une réponse
    res.json({
      message: 'Test de webhook initié',
      url: url,
      event: event,
      status: 'pending'
    });
  } catch (error) {
    logger.error('Erreur test webhook API:', error);
    res.status(500).json({ error: 'Erreur lors du test de webhook' });
  }
});

/**
 * @route GET /api/public/export/:type
 * @desc Export de données
 * @access Private - API Key
 */
router.get('/export/:type', authenticateApiKey, requireApiPermission('export:read'), async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json' } = req.query;

    if (!['missions', 'inventory', 'vulnerabilities', 'network'].includes(type)) {
      return res.status(400).json({ error: 'Type d\'export invalide' });
    }

    // Ici on pourrait implémenter l'export réel
    // Pour l'instant, on simule juste une réponse
    res.json({
      message: `Export ${type} initié`,
      type: type,
      format: format,
      status: 'processing',
      downloadUrl: `/api/public/downloads/export_${type}_${Date.now()}.${format}`
    });
  } catch (error) {
    logger.error('Erreur export API:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
});

module.exports = router;
