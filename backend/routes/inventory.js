const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const router = express.Router();

// Validation pour les éléments d'inventaire
const validateInventoryItem = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('type').isIn(['server', 'workstation', 'network_device', 'software', 'other']).withMessage('Type invalide'),
  body('status').isIn(['active', 'inactive', 'maintenance', 'retired']).withMessage('Statut invalide'),
  body('ip_address').optional().isIP().withMessage('Adresse IP invalide'),
  body('location').optional().trim().isLength({ max: 200 }).withMessage('Localisation trop longue')
];

// GET /api/inventory - Liste de l'inventaire
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, status, search, site_id } = req.query;
    const pageNum = parseInt(page);
    const pageSize = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * pageSize;

    const { InventoryItem, AuditSite, AuditMission, Organization } = require('../models');

    const where = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (site_id) where.site_id = parseInt(site_id);

    // Jointure pour filtrer par organisation de l'utilisateur via AuditSite -> AuditMission -> Organization
    const include = [
      {
        model: AuditSite,
        as: 'site',
        include: [{
          model: AuditMission,
          as: 'mission',
          where: { organization_id: req.user.organization_id },
          attributes: ['id', 'organization_id']
        }]
      }
    ];

    // Recherche textuelle simple
    const Sequelize = require('sequelize');
    const { Op } = Sequelize;
    if (search) {
      where[Op.or] = [
        { brand: { [Op.like]: `%${search}%` } },
        { model: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
        { user_assigned: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await InventoryItem.findAndCountAll({
      where,
      include,
      offset,
      limit: pageSize,
      order: [['updated_at', 'DESC']]
    });

    res.json({
      inventory: rows,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total: count,
        pages: Math.ceil(count / pageSize)
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'inventaire:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/inventory/:id - Récupérer un élément d'inventaire
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { InventoryItem, AuditSite, AuditMission } = require('../models');
    const item = await InventoryItem.findByPk(parseInt(req.params.id), {
      include: [{
        model: AuditSite,
        as: 'site',
        include: [{
          model: AuditMission,
          as: 'mission',
          where: { organization_id: req.user.organization_id },
          attributes: ['id', 'organization_id']
        }]
      }]
    });

    if (!item) {
      return res.status(404).json({ error: 'Élément non trouvé' });
    }

    res.json(item);
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'élément d\'inventaire:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/inventory - Créer un élément d'inventaire
router.post('/', authenticateToken, validateInventoryItem, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, type, status, ip_address, location, description, specifications } = req.body;

    const { InventoryItem, AuditSite, AuditMission } = require('../models');
    // Vérifier que le site appartient à l'organisation
    const site = await AuditSite.findByPk(req.body.site_id, {
      include: [{ model: AuditMission, as: 'mission', where: { organization_id: req.user.organization_id } }]
    });
    if (!site) return res.status(403).json({ error: 'Site non autorisé' });

    const newItem = await InventoryItem.create({
      site_id: req.body.site_id,
      category: req.body.category,
      brand: req.body.brand,
      model: req.body.model,
      serial_number: req.body.serial_number,
      asset_tag: req.body.asset_tag,
      purchase_date: req.body.purchase_date,
      warranty_end: req.body.warranty_end,
      location,
      user_assigned: req.body.user_assigned,
      status,
      notes: description
    });

    logger.info(`Nouvel élément d'inventaire créé: ${newItem.id}`);
    res.status(201).json(newItem);
  } catch (error) {
    logger.error('Erreur lors de la création de l\'élément d\'inventaire:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// PUT /api/inventory/:id - Mettre à jour un élément d'inventaire
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, type, status, ip_address, location, description, specifications } = req.body;

    const { InventoryItem, AuditSite, AuditMission } = require('../models');
    const item = await InventoryItem.findByPk(parseInt(req.params.id), {
      include: [{ model: AuditSite, as: 'site', include: [{ model: AuditMission, as: 'mission' }] }]
    });
    if (!item || item.site.mission.organization_id !== req.user.organization_id) {
      return res.status(404).json({ error: 'Élément non trouvé' });
    }

    await item.update({
      category: req.body.category ?? item.category,
      brand: req.body.brand ?? item.brand,
      model: req.body.model ?? item.model,
      serial_number: req.body.serial_number ?? item.serial_number,
      asset_tag: req.body.asset_tag ?? item.asset_tag,
      purchase_date: req.body.purchase_date ?? item.purchase_date,
      warranty_end: req.body.warranty_end ?? item.warranty_end,
      location: location ?? item.location,
      user_assigned: req.body.user_assigned ?? item.user_assigned,
      status: status ?? item.status,
      notes: description ?? item.notes
    });

    logger.info(`Élément d'inventaire mis à jour: ${item.id}`);
    res.json(item);
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'élément d\'inventaire:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// DELETE /api/inventory/:id - Supprimer un élément d'inventaire
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { InventoryItem, AuditSite, AuditMission } = require('../models');
    const item = await InventoryItem.findByPk(parseInt(req.params.id), {
      include: [{ model: AuditSite, as: 'site', include: [{ model: AuditMission, as: 'mission' }] }]
    });
    if (!item || item.site.mission.organization_id !== req.user.organization_id) {
      return res.status(404).json({ error: 'Élément non trouvé' });
    }
    await item.destroy();
    logger.info(`Élément d'inventaire supprimé: ID ${item.id}`);
    res.json({ message: 'Élément d\'inventaire supprimé avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'élément d\'inventaire:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/inventory/stats - Statistiques de l'inventaire
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { InventoryItem, AuditSite, AuditMission, Sequelize } = require('../models');
    const { Op } = Sequelize;
    // Compter par catégorie et statut pour l'organisation
    const [counts] = await Promise.all([
      InventoryItem.findAll({
        include: [{ model: require('../models').AuditSite, as: 'site', include: [{ model: require('../models').AuditMission, as: 'mission', where: { organization_id: req.user.organization_id } }] }],
        attributes: [
          'category',
          [Sequelize.fn('COUNT', Sequelize.col('InventoryItem.id')), 'count']
        ],
        group: ['category']
      })
    ]);

    const by_type = counts.reduce((acc, row) => { acc[row.category] = parseInt(row.get('count')); return acc; }, {});
    const total_items = Object.values(by_type).reduce((a, b) => a + b, 0);

    res.json({ total_items, by_type });
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;


