const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const router = express.Router();

// Get backup configuration and status for org
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const { BackupConfig, BackupEvent } = require('../models');
    const config = await BackupConfig.findOne({ where: { organization_id: req.user.organization_id } });
    const lastEvents = await BackupEvent.findAll({ where: { organization_id: req.user.organization_id }, order: [['started_at', 'DESC']], limit: 10 });

    // Assessment
    const recommendations = [];
    let resilience = 'unknown';
    if (!config) {
      recommendations.push('Mettre en place une stratégie de sauvegarde (3-2-1, offsite, rétention)');
      resilience = 'low';
    } else {
      const successCount = lastEvents.filter(e => e.status === 'success').length;
      if (!config.offsite_enabled) recommendations.push('Activer des sauvegardes hors site chiffrées (cloud/az)');
      if (!config.tested_at || Date.now() - new Date(config.tested_at).getTime() > 90 * 24 * 3600 * 1000) recommendations.push('Tester régulièrement la restauration (au moins trimestrielle)');
      if (successCount < Math.max(1, lastEvents.length - 1)) recommendations.push('Augmenter la fiabilité des jobs de sauvegarde (monitoring/alerting)');
      resilience = recommendations.length ? 'medium' : 'high';
    }

    res.json({ config, lastEvents, assessment: { resilience }, recommendations });
  } catch (error) {
    logger.error('Erreur statut sauvegarde:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;

