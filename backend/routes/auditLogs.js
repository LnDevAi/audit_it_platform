const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const router = express.Router();

// GET /api/audit-logs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { ActivityLog, User } = require('../models');
    const { page = 1, limit = 50, user_id, action } = req.query;
    const pageNum = parseInt(page);
    const pageSize = Math.min(parseInt(limit), 200);
    const offset = (pageNum - 1) * pageSize;

    const where = {};
    if (user_id) where.user_id = parseInt(user_id);
    if (action) where.action = action;

    const { count, rows } = await ActivityLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'organization_id'] }],
      order: [['created_at', 'DESC']],
      offset,
      limit: pageSize
    });

    // Filter by org: only logs where user.organization_id matches requester
    const filtered = rows.filter(r => !r.user || r.user.organization_id === req.user.organization_id);

    res.json({ logs: filtered, pagination: { page: pageNum, limit: pageSize, total: count, pages: Math.ceil(count / pageSize) } });
  } catch (error) {
    logger.error('Erreur récupération des audit logs:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;

