const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Permission, ActivityLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Login with optional TOTP enforcement
router.post('/login', async (req, res) => {
  try {
    const { email, password, twoFactorToken, recoveryCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email et mot de passe requis'
      });
    }

    const user = await User.findOne({
      where: { email },
      include: [{
        model: Permission,
        through: { attributes: [] }
      }]
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        error: 'Identifiants invalides'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Identifiants invalides'
      });
    }

    // Enforce TOTP if enabled
    if (user.two_factor_enabled) {
      const TwoFactorService = require('../services/twoFactorService');
      let totpOk = false;
      if (twoFactorToken) {
        totpOk = await TwoFactorService.verifyToken(user, twoFactorToken);
      } else if (recoveryCode) {
        totpOk = await TwoFactorService.verifyRecoveryCode(user, recoveryCode);
      }
      if (!totpOk) {
        return res.status(401).json({ error: 'Validation 2FA requise', requires2FA: true });
      }
    }

    // Update last login
    await user.update({ last_login: new Date() });

    // Log activity
    await ActivityLog.create({
      user_id: user.id,
      action: 'LOGIN',
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    const userPermissions = user.Permissions?.map(p => p.name) || [];

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
        permissions: userPermissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await ActivityLog.create({
      user_id: req.user.id,
      action: 'LOGOUT',
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Erreur lors de la déconnexion' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{
        model: Permission,
        through: { attributes: [] }
      }],
      attributes: { exclude: ['password_hash'] }
    });

    const userPermissions = user.Permissions?.map(p => p.name) || [];

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.organization,
      status: user.status,
      last_login: user.last_login,
      permissions: userPermissions
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Mot de passe actuel et nouveau mot de passe requis'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Le nouveau mot de passe doit contenir au moins 8 caractères'
      });
    }

    const user = await User.findByPk(req.user.id);
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Mot de passe actuel incorrect'
      });
    }

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await user.update({ password_hash: hashedPassword });

    await ActivityLog.create({
      user_id: user.id,
      action: 'PASSWORD_CHANGE',
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du mot de passe' });
  }
});

module.exports = router;
