const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const router = express.Router();

// GET /api/network - Liste des équipements réseau
router.get('/', authenticateToken, async (req, res) => {
  try {
    const mockDevices = [
      {
        id: 1,
        name: 'Switch Core',
        type: 'switch',
        ip_address: '192.168.1.1',
        status: 'active',
        organization_id: req.user.organization_id
      }
    ];

    res.json({ devices: mockDevices });
  } catch (error) {
    logger.error('Erreur lors de la récupération des équipements réseau:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;


