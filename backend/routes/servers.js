const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const router = express.Router();

// List servers (NetworkDevice of type server) with applications and latest metrics
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { NetworkDevice, ServerApplication, ServerMetric, AuditSite, AuditMission } = require('../models');
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const pageSize = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * pageSize;

    const { count, rows } = await NetworkDevice.findAndCountAll({
      where: { device_type: 'server' },
      include: [
        { model: AuditSite, as: 'site', include: [{ model: AuditMission, as: 'mission', where: { organization_id: req.user.organization_id } }] },
        { model: ServerApplication, as: 'applications' }
      ],
      offset,
      limit: pageSize,
      order: [['updated_at', 'DESC']]
    });

    // Attach latest metric per server
    const deviceIds = rows.map(r => r.id);
    const metrics = await ServerMetric.findAll({ where: { network_device_id: deviceIds }, order: [['collected_at', 'DESC']] });
    const latestByDevice = {};
    metrics.forEach(m => { if (!latestByDevice[m.network_device_id]) latestByDevice[m.network_device_id] = m; });

    const servers = rows.map(r => ({ ...r.toJSON(), latestMetric: latestByDevice[r.id] || null }));
    res.json({ servers, pagination: { page: pageNum, limit: pageSize, total: count, pages: Math.ceil(count / pageSize) } });
  } catch (error) {
    logger.error('Erreur liste serveurs:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Utilization assessment and recommendations
router.get('/:id/assessment', authenticateToken, async (req, res) => {
  try {
    const { NetworkDevice, ServerMetric, ServerApplication, AuditSite, AuditMission } = require('../models');
    const server = await NetworkDevice.findByPk(parseInt(req.params.id), { include: [{ model: AuditSite, as: 'site', include: [{ model: AuditMission, as: 'mission' }] }] });
    if (!server || server.site.mission.organization_id !== req.user.organization_id) return res.status(404).json({ error: 'Serveur non trouvé' });

    const metrics = await ServerMetric.findAll({ where: { network_device_id: server.id }, order: [['collected_at', 'DESC']], limit: 30 });
    const apps = await ServerApplication.findAll({ where: { network_device_id: server.id } });

    const avg = (arr) => arr.reduce((a, b) => a + (b || 0), 0) / (arr.length || 1);
    const cpuAvg = avg(metrics.map(m => m.cpu_percent));
    const memAvg = avg(metrics.map(m => m.mem_percent));
    const diskAvg = avg(metrics.map(m => m.disk_percent));

    const status = (val) => val >= 85 ? 'high' : val >= 60 ? 'medium' : 'low';
    const assessment = {
      cpu: { average: cpuAvg, level: status(cpuAvg) },
      memory: { average: memAvg, level: status(memAvg) },
      disk: { average: diskAvg, level: status(diskAvg) },
      applications: apps.map(a => ({ name: a.name, version: a.version, port: a.port, status: a.status }))
    };

    const recommendations = [];
    if (assessment.cpu.level !== 'low') recommendations.push('Optimiser ou scaler la CPU (droitsizing, tuning services)');
    if (assessment.memory.level !== 'low') recommendations.push('Ajouter de la RAM ou optimiser les caches');
    if (assessment.disk.level !== 'low') recommendations.push('Augmenter l’espace disque ou archiver les logs');
    if (!apps.length) recommendations.push('Aucune application détectée, vérifier le monitoring agent');

    res.json({ assessment, recommendations });
  } catch (error) {
    logger.error('Erreur assessment serveur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;

