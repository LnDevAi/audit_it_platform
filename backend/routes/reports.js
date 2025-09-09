const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const router = express.Router();

// GET /api/reports - Liste des rapports
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { Report, AuditMission } = require('../models');
    const { page = 1, limit = 20, type, format, mission_id } = req.query;
    const pageNum = parseInt(page);
    const pageSize = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * pageSize;

    const where = {};
    if (type) where.type = type;
    if (format) where.format = format;
    if (mission_id) where.mission_id = parseInt(mission_id);

    const { count, rows } = await Report.findAndCountAll({
      where,
      include: [{ model: AuditMission, as: 'mission', where: { organization_id: req.user.organization_id } }],
      offset,
      limit: pageSize,
      order: [['generated_at', 'DESC']]
    });

    res.json({ reports: rows, pagination: { page: pageNum, limit: pageSize, total: count, pages: Math.ceil(count / pageSize) } });
  } catch (error) {
    logger.error('Erreur lors de la récupération des rapports:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;


