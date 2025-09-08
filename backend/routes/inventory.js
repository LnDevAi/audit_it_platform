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
    const { page = 1, limit = 10, type, status, search } = req.query;
    const offset = (page - 1) * limit;

    // Simulation d'une base de données d'inventaire
    const mockInventory = [
      {
        id: 1,
        name: 'Serveur Web Principal',
        type: 'server',
        status: 'active',
        ip_address: '192.168.1.10',
        location: 'Salle serveurs A',
        organization_id: req.user.organization_id,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 2,
        name: 'Switch Core',
        type: 'network_device',
        status: 'active',
        ip_address: '192.168.1.1',
        location: 'Salle réseau',
        organization_id: req.user.organization_id,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // Filtrage
    let filteredInventory = mockInventory.filter(item => 
      item.organization_id === req.user.organization_id
    );

    if (type) {
      filteredInventory = filteredInventory.filter(item => item.type === type);
    }

    if (status) {
      filteredInventory = filteredInventory.filter(item => item.status === status);
    }

    if (search) {
      filteredInventory = filteredInventory.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.ip_address?.includes(search)
      );
    }

    // Pagination
    const total = filteredInventory.length;
    const items = filteredInventory.slice(offset, offset + parseInt(limit));

    res.json({
      inventory: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
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
    // Simulation - en réalité, on récupérerait depuis la base de données
    const item = {
      id: parseInt(req.params.id),
      name: 'Serveur Web Principal',
      type: 'server',
      status: 'active',
      ip_address: '192.168.1.10',
      location: 'Salle serveurs A',
      description: 'Serveur principal pour les applications web',
      specifications: {
        cpu: 'Intel Xeon E5-2680',
        ram: '32GB',
        storage: '2TB SSD'
      },
      organization_id: req.user.organization_id,
      created_at: new Date(),
      updated_at: new Date()
    };

    if (item.organization_id !== req.user.organization_id) {
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

    // Simulation de création
    const newItem = {
      id: Date.now(), // En réalité, ce serait généré par la DB
      name,
      type,
      status,
      ip_address,
      location,
      description,
      specifications,
      organization_id: req.user.organization_id,
      created_at: new Date(),
      updated_at: new Date()
    };

    logger.info(`Nouvel élément d'inventaire créé: ${name} (${type})`);
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

    // Simulation de mise à jour
    const updatedItem = {
      id: parseInt(req.params.id),
      name: name || 'Serveur Web Principal',
      type: type || 'server',
      status: status || 'active',
      ip_address: ip_address || '192.168.1.10',
      location: location || 'Salle serveurs A',
      description: description || 'Serveur principal pour les applications web',
      specifications: specifications || {
        cpu: 'Intel Xeon E5-2680',
        ram: '32GB',
        storage: '2TB SSD'
      },
      organization_id: req.user.organization_id,
      updated_at: new Date()
    };

    logger.info(`Élément d'inventaire mis à jour: ${updatedItem.name}`);
    res.json(updatedItem);
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'élément d\'inventaire:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// DELETE /api/inventory/:id - Supprimer un élément d'inventaire
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);

    // Simulation de suppression
    logger.info(`Élément d'inventaire supprimé: ID ${itemId}`);
    res.json({ message: 'Élément d\'inventaire supprimé avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'élément d\'inventaire:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/inventory/stats - Statistiques de l'inventaire
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    // Simulation de statistiques
    const stats = {
      total_items: 150,
      by_type: {
        server: 25,
        workstation: 80,
        network_device: 15,
        software: 20,
        other: 10
      },
      by_status: {
        active: 120,
        inactive: 20,
        maintenance: 8,
        retired: 2
      },
      recent_additions: 5,
      items_needing_attention: 3
    };

    res.json(stats);
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;


