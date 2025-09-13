const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const router = express.Router();

// List antivirus status per host
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { AntivirusStatus, InventoryItem, AuditSite, AuditMission } = require('../models');
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const pageSize = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * pageSize;

    const { count, rows } = await AntivirusStatus.findAndCountAll({
      include: [{
        model: InventoryItem,
        as: 'inventoryItem',
        include: [{ model: AuditSite, as: 'site', include: [{ model: AuditMission, as: 'mission', where: { organization_id: req.user.organization_id } }] }]
      }],
      offset,
      limit: pageSize,
      order: [['updated_at', 'DESC']]
    });
    res.json({ antivirus: rows, pagination: { page: pageNum, limit: pageSize, total: count, pages: Math.ceil(count / pageSize) } });
  } catch (error) {
    logger.error('Erreur liste antivirus:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Organization-wide assessment
router.get('/assessment', authenticateToken, async (req, res) => {
  try {
    const { AntivirusStatus, InventoryItem, AuditSite, AuditMission, Sequelize } = require('../models');
    const { Op } = Sequelize;
    const statuses = await AntivirusStatus.findAll({
      include: [{ model: InventoryItem, as: 'inventoryItem', include: [{ model: AuditSite, as: 'site', include: [{ model: AuditMission, as: 'mission', where: { organization_id: req.user.organization_id } }] }] }]
    });

    const total = statuses.length;
    const enabled = statuses.filter(s => s.real_time_protection).length;
    const outdatedDefs = statuses.filter(s => s.defs_date && (Date.now() - new Date(s.defs_date).getTime() > 14 * 24 * 3600 * 1000)).length;
    const highImpact = statuses.filter(s => s.performance_impact === 'high').length;

    const recommendations = [];
    if (enabled < total) recommendations.push('Activer la protection en temps réel sur tous les postes/serveurs');
    if (outdatedDefs > 0) recommendations.push('Mettre à jour les signatures antivirus (définitions > 14 jours)');
    if (highImpact > 0) recommendations.push('Optimiser les politiques AV (exclusions, planification scans) pour réduire l’impact performance');

    res.json({
      coverage: { total_hosts: total, protected: enabled, protection_rate: total ? Math.round((enabled / total) * 100) : 0 },
      hygiene: { outdated_definitions: outdatedDefs },
      performance: { high_impact: highImpact },
      recommendations
    });
  } catch (error) {
    logger.error('Erreur assessment antivirus:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;

