const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const TwoFactorService = require('../services/twoFactorService');
const { logger } = require('../config/logger');
const router = express.Router();

/**
 * @route POST /api/2fa/setup
 * @desc Initialiser la configuration 2FA
 * @access Private
 */
router.post('/setup', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (user.two_factor_enabled) {
      return res.status(400).json({
        error: '2FA déjà activé pour cet utilisateur'
      });
    }

    const result = await TwoFactorService.generateSecret(user);
    
    res.json({
      message: 'Configuration 2FA initialisée',
      qrCode: result.qrCode,
      manualEntryKey: result.manualEntryKey,
      secret: result.secret
    });
  } catch (error) {
    logger.error('Erreur setup 2FA:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'initialisation de la 2FA'
    });
  }
});

/**
 * @route POST /api/2fa/enable
 * @desc Activer la 2FA après vérification du token
 * @access Private
 */
router.post('/enable', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    const user = req.user;

    if (!token) {
      return res.status(400).json({
        error: 'Token 2FA requis'
      });
    }

    if (user.two_factor_enabled) {
      return res.status(400).json({
        error: '2FA déjà activé'
      });
    }

    await TwoFactorService.enable2FA(user, token);
    
    // Générer les codes de récupération
    const recoveryCodes = await TwoFactorService.generateRecoveryCodes(user);
    
    res.json({
      message: '2FA activé avec succès',
      recoveryCodes: recoveryCodes
    });
  } catch (error) {
    logger.error('Erreur activation 2FA:', error);
    res.status(400).json({
      error: error.message || 'Erreur lors de l\'activation de la 2FA'
    });
  }
});

/**
 * @route POST /api/2fa/disable
 * @desc Désactiver la 2FA
 * @access Private
 */
router.post('/disable', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    const user = req.user;

    if (!user.two_factor_enabled) {
      return res.status(400).json({
        error: '2FA non activé'
      });
    }

    await TwoFactorService.disable2FA(user, token);
    
    res.json({
      message: '2FA désactivé avec succès'
    });
  } catch (error) {
    logger.error('Erreur désactivation 2FA:', error);
    res.status(400).json({
      error: error.message || 'Erreur lors de la désactivation de la 2FA'
    });
  }
});

/**
 * @route POST /api/2fa/verify
 * @desc Vérifier un token 2FA
 * @access Private
 */
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    const user = req.user;

    if (!token) {
      return res.status(400).json({
        error: 'Token 2FA requis'
      });
    }

    if (!user.two_factor_enabled) {
      return res.status(400).json({
        error: '2FA non activé'
      });
    }

    const isValid = await TwoFactorService.verifyToken(user, token);
    
    if (isValid) {
      res.json({
        message: 'Token 2FA valide',
        valid: true
      });
    } else {
      res.status(400).json({
        error: 'Token 2FA invalide',
        valid: false
      });
    }
  } catch (error) {
    logger.error('Erreur vérification 2FA:', error);
    res.status(500).json({
      error: 'Erreur lors de la vérification du token 2FA'
    });
  }
});

/**
 * @route POST /api/2fa/recovery-codes
 * @desc Générer de nouveaux codes de récupération
 * @access Private
 */
router.post('/recovery-codes', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    if (!user.two_factor_enabled) {
      return res.status(400).json({
        error: '2FA non activé'
      });
    }

    const recoveryCodes = await TwoFactorService.generateRecoveryCodes(user);
    
    res.json({
      message: 'Nouveaux codes de récupération générés',
      recoveryCodes: recoveryCodes
    });
  } catch (error) {
    logger.error('Erreur génération codes de récupération:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération des codes de récupération'
    });
  }
});

/**
 * @route POST /api/2fa/recovery
 * @desc Utiliser un code de récupération
 * @access Private
 */
router.post('/recovery', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    const user = req.user;

    if (!code) {
      return res.status(400).json({
        error: 'Code de récupération requis'
      });
    }

    if (!user.two_factor_enabled) {
      return res.status(400).json({
        error: '2FA non activé'
      });
    }

    const isValid = await TwoFactorService.verifyRecoveryCode(user, code);
    
    if (isValid) {
      res.json({
        message: 'Code de récupération valide',
        valid: true
      });
    } else {
      res.status(400).json({
        error: 'Code de récupération invalide ou déjà utilisé',
        valid: false
      });
    }
  } catch (error) {
    logger.error('Erreur vérification code de récupération:', error);
    res.status(500).json({
      error: 'Erreur lors de la vérification du code de récupération'
    });
  }
});

/**
 * @route GET /api/2fa/status
 * @desc Obtenir le statut 2FA de l'utilisateur
 * @access Private
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      enabled: user.two_factor_enabled,
      hasSecret: !!user.two_factor_secret,
      hasRecoveryCodes: !!(user.preferences && user.preferences.recovery_codes)
    });
  } catch (error) {
    logger.error('Erreur récupération statut 2FA:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du statut 2FA'
    });
  }
});

module.exports = router;
