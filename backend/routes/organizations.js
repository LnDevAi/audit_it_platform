const express = require('express');
const { Op } = require('sequelize');
const { Organization, User, SubscriptionPlan, Invoice, AuditMission } = require('../models');
const { authenticateToken, requirePermission, requireRole } = require('../middleware/auth');
const router = express.Router();

/**
 * @route GET /api/organizations
 * @desc Liste des organisations (super admin uniquement)
 * @access Private - Super Admin
 */
router.get('/', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, subscription_plan, status } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    if (subscription_plan) where.subscription_plan = subscription_plan;
    if (status) where.status = status;

    const organizations = await Organization.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'name', 'email', 'role', 'status']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      organizations: organizations.rows,
      total: organizations.count,
      page: parseInt(page),
      totalPages: Math.ceil(organizations.count / limit)
    });

  } catch (error) {
    console.error('Erreur récupération organisations:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des organisations' });
  }
});

/**
 * @route GET /api/organizations/current
 * @desc Informations de l'organisation courante
 * @access Private
 */
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const organization = await Organization.findByPk(req.user.organization_id, {
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'name', 'email', 'role', 'status', 'last_login']
        }
      ]
    });

    if (!organization) {
      return res.status(404).json({ message: 'Organisation non trouvée' });
    }

    // Statistiques de l'organisation
    const stats = await getOrganizationStats(organization.id);

    res.json({
      organization,
      stats
    });

  } catch (error) {
    console.error('Erreur récupération organisation:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'organisation' });
  }
});

/**
 * @route PUT /api/organizations/current
 * @desc Mise à jour de l'organisation courante
 * @access Private - Org Admin
 */
router.put('/current', authenticateToken, requireRole('org_admin'), async (req, res) => {
  try {
    const { name, address, phone, email, contact_person, settings } = req.body;

    const organization = await Organization.findByPk(req.user.organization_id);
    if (!organization) {
      return res.status(404).json({ message: 'Organisation non trouvée' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (address) updateData.address = address;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;
    if (contact_person) updateData.contact_person = contact_person;
    if (settings) updateData.settings = { ...organization.settings, ...settings };

    await organization.update(updateData);

    res.json({
      message: 'Organisation mise à jour avec succès',
      organization
    });

  } catch (error) {
    console.error('Erreur mise à jour organisation:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'organisation' });
  }
});

/**
 * @route POST /api/organizations
 * @desc Créer une nouvelle organisation
 * @access Private - Super Admin
 */
router.post('/', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const {
      name,
      slug,
      domain,
      address,
      phone,
      email,
      contact_person,
      subscription_plan = 'trial'
    } = req.body;

    if (!name || !slug || !email) {
      return res.status(400).json({ message: 'Nom, slug et email requis' });
    }

    // Vérifier que le slug est unique
    const existingOrg = await Organization.findOne({ where: { slug } });
    if (existingOrg) {
      return res.status(400).json({ message: 'Ce slug est déjà utilisé' });
    }

    // Récupérer les détails du plan d'abonnement
    const plan = await SubscriptionPlan.findOne({ where: { slug: subscription_plan } });
    if (!plan) {
      return res.status(400).json({ message: 'Plan d\'abonnement invalide' });
    }

    const organization = await Organization.create({
      name,
      slug,
      domain,
      address,
      phone,
      email,
      contact_person,
      subscription_plan,
      subscription_status: 'active',
      subscription_start_date: new Date(),
      subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
      max_users: plan.max_users,
      max_missions: plan.max_missions,
      max_storage_gb: plan.max_storage_gb,
      features: plan.features
    });

    res.status(201).json({
      message: 'Organisation créée avec succès',
      organization
    });

  } catch (error) {
    console.error('Erreur création organisation:', error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'organisation' });
  }
});

/**
 * @route PUT /api/organizations/:id/subscription
 * @desc Mettre à jour l'abonnement d'une organisation
 * @access Private - Super Admin
 */
router.put('/:id/subscription', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const { subscription_plan, subscription_status, subscription_end_date } = req.body;

    const organization = await Organization.findByPk(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organisation non trouvée' });
    }

    const updateData = {};
    
    if (subscription_plan) {
      const plan = await SubscriptionPlan.findOne({ where: { slug: subscription_plan } });
      if (!plan) {
        return res.status(400).json({ message: 'Plan d\'abonnement invalide' });
      }
      
      updateData.subscription_plan = subscription_plan;
      updateData.max_users = plan.max_users;
      updateData.max_missions = plan.max_missions;
      updateData.max_storage_gb = plan.max_storage_gb;
      updateData.features = plan.features;
    }

    if (subscription_status) updateData.subscription_status = subscription_status;
    if (subscription_end_date) updateData.subscription_end_date = subscription_end_date;

    await organization.update(updateData);

    res.json({
      message: 'Abonnement mis à jour avec succès',
      organization
    });

  } catch (error) {
    console.error('Erreur mise à jour abonnement:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'abonnement' });
  }
});

/**
 * @route GET /api/organizations/:id/stats
 * @desc Statistiques d'une organisation
 * @access Private - Super Admin ou Org Admin
 */
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.params.id;

    // Vérifier les permissions
    if (req.user.role !== 'super_admin' && req.user.organization_id !== parseInt(organizationId)) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const stats = await getOrganizationStats(organizationId);

    res.json(stats);

  } catch (error) {
    console.error('Erreur récupération stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
});

/**
 * @route GET /api/organizations/plans
 * @desc Liste des plans d'abonnement disponibles
 * @access Private
 */
router.get('/plans', authenticateToken, async (req, res) => {
  try {
    const plans = await SubscriptionPlan.findAll({
      where: { is_active: true },
      order: [['price_monthly', 'ASC']]
    });

    res.json(plans);

  } catch (error) {
    console.error('Erreur récupération plans:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des plans' });
  }
});

// Fonction utilitaire pour récupérer les statistiques d'une organisation
async function getOrganizationStats(organizationId) {
  const [
    userCount,
    missionCount,
    activeMissions,
    completedMissions
  ] = await Promise.all([
    User.count({ where: { organization_id: organizationId, status: 'active' } }),
    AuditMission.count({ where: { organization_id: organizationId } }),
    AuditMission.count({ where: { organization_id: organizationId, status: 'in_progress' } }),
    AuditMission.count({ where: { organization_id: organizationId, status: 'completed' } })
  ]);

  return {
    users: {
      total: userCount
    },
    missions: {
      total: missionCount,
      active: activeMissions,
      completed: completedMissions
    }
  };
}

module.exports = router;
