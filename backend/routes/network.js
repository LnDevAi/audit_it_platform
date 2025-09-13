const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const router = express.Router();

// GET /api/network - Liste des équipements réseau
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { NetworkDevice, AuditSite, AuditMission } = require('../models');
    const { page = 1, limit = 20, device_type, status, search } = req.query;
    const pageNum = parseInt(page);
    const pageSize = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * pageSize;

    const Sequelize = require('sequelize');
    const { Op } = Sequelize;
    const where = {};
    if (device_type) where.device_type = device_type;
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { hostname: { [Op.like]: `%${search}%` } },
        { ip_address: { [Op.like]: `%${search}%` } },
        { manufacturer: { [Op.like]: `%${search}%` } },
        { model: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await NetworkDevice.findAndCountAll({
      where,
      include: [{
        model: AuditSite,
        as: 'site',
        include: [{ model: AuditMission, as: 'mission', where: { organization_id: req.user.organization_id } }]
      }],
      offset,
      limit: pageSize,
      order: [['updated_at', 'DESC']]
    });

    res.json({ devices: rows, pagination: { page: pageNum, limit: pageSize, total: count, pages: Math.ceil(count / pageSize) } });
  } catch (error) {
    logger.error('Erreur lors de la récupération des équipements réseau:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;


