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
 
// Analyze feasibility to restore files lost at an incident date/range (e.g., 2022)
router.post('/restore/feasibility', authenticateToken, async (req, res) => {
  try {
    const { BackupConfig, BackupEvent, Sequelize } = require('../models');
    const { incident_date, incident_start, incident_end, file_patterns = [] } = req.body || {};
    const orgId = req.user.organization_id;
    const Op = Sequelize.Op;

    if (!incident_date && !(incident_start && incident_end)) {
      return res.status(400).json({ error: 'Fournir incident_date ou incident_start et incident_end' });
    }

    const start = incident_start ? new Date(incident_start) : new Date(incident_date);
    const end = incident_end ? new Date(incident_end) : new Date(incident_date);

    const config = await BackupConfig.findOne({ where: { organization_id: orgId } });
    const events = await BackupEvent.findAll({
      where: {
        organization_id: orgId,
        status: 'success',
        started_at: { [Op.lte]: end }
      },
      order: [['started_at', 'DESC']]
    });

    const candidate = events[0] || null; // Latest successful backup prior to incident end

    const now = new Date();
    let feasible = false;
    const reasons = [];

    if (!config) {
      reasons.push('Aucune configuration de sauvegarde trouvée');
    }

    if (!candidate) {
      reasons.push('Aucune sauvegarde antérieure à la période d\'incident');
    } else {
      // Check retention feasibility
      const ageDays = Math.round((now - candidate.started_at) / (24 * 3600 * 1000));
      const retentionDays = config?.retention_days ?? 0;
      const offsite = !!config?.offsite_enabled;

      if (retentionDays && ageDays > retentionDays && !offsite) {
        feasible = false;
        reasons.push(`Les sauvegardes anciennes (${ageDays}j) dépassent la rétention (${retentionDays}j) et aucun offsite n\'est activé`);
      } else {
        feasible = true;
        if (retentionDays && ageDays > retentionDays && offsite) {
          reasons.push('Les sauvegardes locales dépassent la rétention, mais une copie hors site est activée; récupération possible avec délai');
        }
      }
    }

    const steps = [];
    if (feasible && candidate) {
      steps.push(`Identifier l\'ensemble de sauvegarde du ${candidate.started_at.toISOString()} sur ${candidate.location || 'stockage'}`);
      if (config?.offsite_enabled) {
        steps.push('Initier la restauration hors site (Glacier/Archive) en mode Standard/Expedited selon SLA');
      }
      steps.push('Restaurer vers un environnement de staging isolé');
      if (Array.isArray(file_patterns) && file_patterns.length > 0) {
        steps.push(`Filtrer les fichiers à restaurer selon les motifs: ${file_patterns.join(', ')}`);
      }
      steps.push('Vérifier l\'intégrité (hash/horodatage) et les permissions');
      steps.push('Planifier la restauration en production (fenêtre de maintenance) et notifier les parties prenantes');
    }

    const recommendations = [];
    if (!config?.offsite_enabled) recommendations.push('Activer la réplication hors site chiffrée (3-2-1)');
    if (!config?.tested_at || (now - new Date(config.tested_at)) > 90 * 24 * 3600 * 1000) recommendations.push('Planifier un test de restauration trimestriel');
    if ((events || []).length === 0) recommendations.push('Mettre en place des sauvegardes régulières et monitorées');

    return res.json({
      feasible,
      reasons,
      candidate_backup: candidate ? { started_at: candidate.started_at, location: candidate.location, type: candidate.type } : null,
      steps,
      recommendations
    });
  } catch (error) {
    logger.error('Erreur analyse faisabilité restauration:', error);
    res.status(500).json({ error: 'Erreur lors de l\'analyse de restauration' });
  }
});

