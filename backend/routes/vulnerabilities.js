const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const router = express.Router();

// GET /api/vulnerabilities - Liste des vulnérabilités
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { Vulnerability, AuditSite, AuditMission, NetworkDevice } = require('../models');
    const { page = 1, limit = 20, severity, status, site_id, device_id, search } = req.query;
    const pageNum = parseInt(page);
    const pageSize = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * pageSize;

    const Sequelize = require('sequelize');
    const { Op } = Sequelize;
    const where = {};
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (site_id) where.site_id = parseInt(site_id);
    if (device_id) where.device_id = parseInt(device_id);
    if (search) where.title = { [Op.like]: `%${search}%` };

    const { count, rows } = await Vulnerability.findAndCountAll({
      where,
      include: [
        { model: AuditSite, as: 'site', include: [{ model: AuditMission, as: 'mission', where: { organization_id: req.user.organization_id } }] },
        { model: NetworkDevice, as: 'device' }
      ],
      offset,
      limit: pageSize,
      order: [['updated_at', 'DESC']]
    });

    res.json({ vulnerabilities: rows, pagination: { page: pageNum, limit: pageSize, total: count, pages: Math.ceil(count / pageSize) } });
  } catch (error) {
    logger.error('Erreur lors de la récupération des vulnérabilités:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;


