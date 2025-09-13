const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const router = express.Router();

// GET /api/scans - Liste des scans
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { Scan, AuditSite, AuditMission } = require('../models');
    const { page = 1, limit = 20, scan_type, status, site_id } = req.query;
    const pageNum = parseInt(page);
    const pageSize = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * pageSize;

    const where = {};
    if (scan_type) where.scan_type = scan_type;
    if (status) where.status = status;
    if (site_id) where.site_id = parseInt(site_id);

    const { count, rows } = await Scan.findAndCountAll({
      where,
      include: [{
        model: AuditSite,
        as: 'site',
        include: [{ model: AuditMission, as: 'mission', where: { organization_id: req.user.organization_id } }]
      }],
      offset,
      limit: pageSize,
      order: [['id', 'DESC']]
    });

    res.json({ scans: rows, pagination: { page: pageNum, limit: pageSize, total: count, pages: Math.ceil(count / pageSize) } });
  } catch (error) {
    logger.error('Erreur lors de la récupération des scans:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;


