const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, Organization } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');
const { Op } = require('sequelize');

const router = express.Router();

// Validation pour la création d'utilisateur
const validateUser = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères'),
  body('role').isIn(['admin', 'auditor_senior', 'auditor_junior', 'client']).withMessage('Rôle invalide'),
  body('organization_id').isInt().withMessage('ID d\'organisation invalide')
];

// GET /api/users - Liste des utilisateurs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      organization_id: req.user.organization_id
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const users = await User.findAndCountAll({
      where: whereClause,
      include: [{
        model: Organization,
        as: 'organization',
        attributes: ['name', 'slug']
      }],
      attributes: { exclude: ['password_hash'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      users: users.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.count,
        pages: Math.ceil(users.count / limit)
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/users/:id - Récupérer un utilisateur
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({
      where: {
        id: req.params.id,
        organization_id: req.user.organization_id
      },
      include: [{
        model: Organization,
        as: 'organization',
        attributes: ['name', 'slug']
      }],
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/users - Créer un utilisateur
router.post('/', authenticateToken, validateUser, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role, organization_id } = req.body;

    // Vérifier que l'utilisateur appartient à la même organisation
    if (organization_id !== req.user.organization_id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password_hash,
      role,
      organization_id,
      status: 'active'
    });

    const { password_hash: _, ...userWithoutPassword } = user.toJSON();
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    logger.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// PUT /api/users/:id - Mettre à jour un utilisateur
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, email, role, status } = req.body;

    const user = await User.findOne({
      where: {
        id: req.params.id,
        organization_id: req.user.organization_id
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier si l'email existe déjà (sauf pour cet utilisateur)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }
    }

    await user.update({
      name: name || user.name,
      email: email || user.email,
      role: role || user.role,
      status: status || user.status
    });

    const { password_hash: _, ...userWithoutPassword } = user.toJSON();
    res.json(userWithoutPassword);
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// DELETE /api/users/:id - Supprimer un utilisateur
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({
      where: {
        id: req.params.id,
        organization_id: req.user.organization_id
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Empêcher la suppression de son propre compte
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    await user.destroy();
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;


