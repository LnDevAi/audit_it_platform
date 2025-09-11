const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const router = express.Router();

// List WiFi access points with recent performance and security issues
router.get('/aps', authenticateToken, async (req, res) => {
  try {
    const { WifiAccessPoint, WifiSurvey, WifiSecurityIssue, AuditSite, AuditMission } = require('../models');
    const { page = 1, limit = 20, band } = req.query;
    const pageNum = parseInt(page);
    const pageSize = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * pageSize;

    const where = {};
    if (band) where.band = band;

    const { count, rows } = await WifiAccessPoint.findAndCountAll({
      where,
      include: [
        { model: AuditSite, as: 'site', include: [{ model: AuditMission, as: 'mission', where: { organization_id: req.user.organization_id } }] },
        { model: WifiSurvey, as: 'surveys' },
      ],
      offset,
      limit: pageSize,
      order: [['updated_at', 'DESC']]
    });

    // attach last survey and issues count
    const apIds = rows.map(r => r.id);
    const issues = await WifiSecurityIssue.findAll({ where: { ap_id: apIds } });
    const issuesByAp = issues.reduce((acc, i) => { acc[i.ap_id] = (acc[i.ap_id] || 0) + 1; return acc; }, {});

    const data = rows.map(ap => {
      const s = [...(ap.surveys || [])].sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))[0] || null;
      return { ...ap.toJSON(), lastSurvey: s, issuesCount: issuesByAp[ap.id] || 0 };
    });

    res.json({ accessPoints: data, pagination: { page: pageNum, limit: pageSize, total: count, pages: Math.ceil(count / pageSize) } });
  } catch (error) {
    logger.error('Erreur liste AP WiFi:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Organization WiFi assessment
router.get('/assessment', authenticateToken, async (req, res) => {
  try {
    const { WifiAccessPoint, WifiSurvey, WifiSecurityIssue, AuditSite, AuditMission } = require('../models');
    const aps = await WifiAccessPoint.findAll({
      include: [{ model: AuditSite, as: 'site', include: [{ model: AuditMission, as: 'mission', where: { organization_id: req.user.organization_id } }] }]
    });
    const apIds = aps.map(a => a.id);
    const surveys = await WifiSurvey.findAll({ where: { ap_id: apIds } });
    const issues = await WifiSecurityIssue.findAll({ where: { ap_id: apIds } });

    // Performance aggregation
    const byAp = {};
    surveys.forEach(s => {
      byAp[s.ap_id] = byAp[s.ap_id] || [];
      byAp[s.ap_id].push(s);
    });
    const perf = Object.keys(byAp).map(apId => {
      const list = byAp[apId];
      const avg = (k) => list.reduce((a, b) => a + (b[k] || 0), 0) / (list.length || 1);
      return { ap_id: Number(apId), rssi_avg: avg('rssi_dbm'), snr_avg: avg('snr_db'), throughput_avg: avg('throughput_mbps'), jitter_avg: avg('jitter_ms'), loss_avg: avg('packet_loss_percent') };
    });

    const weakPerf = perf.filter(p => (p.throughput_avg || 0) < 20 || (p.rssi_avg || -100) < -70 || (p.loss_avg || 0) > 2);
    const insecure = issues.filter(i => ['weak_encryption', 'open_network', 'default_credentials', 'rogue_ap'].includes(i.type));

    const recommendations = [];
    if (weakPerf.length) recommendations.push('Optimiser la couverture (canaux, puissance TX, densité AP) et QoS pour trafic critique');
    if (insecure.length) recommendations.push('Passer en WPA3/WPA2-Enterprise, changer credentials par défaut, détecter et supprimer AP rogue');
    if (!aps.length) recommendations.push('Aucun AP inventorié: effectuer un site survey');

    res.json({
      summary: { total_aps: aps.length, weak_performance_aps: weakPerf.length, security_issues: insecure.length },
      performance: perf,
      recommendations
    });
  } catch (error) {
    logger.error('Erreur assessment WiFi:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;

