const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const router = express.Router();

// GET /api/scans - Liste des scans
router.get('/', authenticateToken, async (req, res) => {
  try {
    const mockScans = [
      {
        id: 1,
        name: 'Scan de vulnérabilités réseau',
        type: 'vulnerability',
        status: 'completed',
        organization_id: req.user.organization_id
      }
    ];

    res.json({ scans: mockScans });
  } catch (error) {
    logger.error('Erreur lors de la récupération des scans:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;


