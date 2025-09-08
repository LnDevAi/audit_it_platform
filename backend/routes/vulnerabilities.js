const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const router = express.Router();

// GET /api/vulnerabilities - Liste des vulnérabilités
router.get('/', authenticateToken, async (req, res) => {
  try {
    const mockVulnerabilities = [
      {
        id: 1,
        title: 'CVE-2023-1234',
        severity: 'high',
        status: 'open',
        organization_id: req.user.organization_id
      }
    ];

    res.json({ vulnerabilities: mockVulnerabilities });
  } catch (error) {
    logger.error('Erreur lors de la récupération des vulnérabilités:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;


