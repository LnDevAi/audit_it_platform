const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const router = express.Router();

// GET /api/uploads - Liste des fichiers uploadés
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { FileUpload, AuditMission } = require('../models');
    const { page = 1, limit = 20, mission_id, category } = req.query;
    const pageNum = parseInt(page);
    const pageSize = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * pageSize;

    const where = {};
    if (mission_id) where.mission_id = parseInt(mission_id);
    if (category) where.category = category;

    const { count, rows } = await FileUpload.findAndCountAll({
      where,
      include: [{ model: AuditMission, as: 'mission', where: { organization_id: req.user.organization_id } }],
      offset,
      limit: pageSize,
      order: [['uploaded_at', 'DESC']]
    });

    res.json({ uploads: rows, pagination: { page: pageNum, limit: pageSize, total: count, pages: Math.ceil(count / pageSize) } });
  } catch (error) {
    logger.error('Erreur lors de la récupération des uploads:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;


