const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const router = express.Router();

// GET /api/reports - Liste des rapports
router.get('/', authenticateToken, async (req, res) => {
  try {
    const mockReports = [
      {
        id: 1,
        title: 'Rapport d\'audit Q1 2024',
        type: 'audit',
        status: 'completed',
        organization_id: req.user.organization_id
      }
    ];

    res.json({ reports: mockReports });
  } catch (error) {
    logger.error('Erreur lors de la récupération des rapports:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;


