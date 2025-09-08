const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const router = express.Router();

// GET /api/uploads - Liste des fichiers uploadés
router.get('/', authenticateToken, async (req, res) => {
  try {
    const mockUploads = [
      {
        id: 1,
        filename: 'inventory.csv',
        type: 'inventory',
        size: 1024,
        organization_id: req.user.organization_id
      }
    ];

    res.json({ uploads: mockUploads });
  } catch (error) {
    logger.error('Erreur lors de la récupération des uploads:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;


