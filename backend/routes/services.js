const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const router = express.Router();

// List offerings
router.get('/offerings', authenticateToken, async (req, res) => {
  try {
    const { ServiceOffering } = require('../models');
    const { page = 1, limit = 20, category, active } = req.query;
    const pageNum = parseInt(page);
    const pageSize = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * pageSize;

    const where = {};
    if (category) where.category = category;
    if (active !== undefined) where.active = active === 'true';

    const { count, rows } = await ServiceOffering.findAndCountAll({
      where,
      offset,
      limit: pageSize,
      order: [['updated_at', 'DESC']]
    });
    res.json({ offerings: rows, pagination: { page: pageNum, limit: pageSize, total: count, pages: Math.ceil(count / pageSize) } });
  } catch (error) {
    logger.error('Erreur lors de la récupération des offres:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Create service order
router.post('/orders', authenticateToken, [
  body('offering_id').isInt({ min: 1 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { ServiceOrder, ServiceOffering } = require('../models');
    const offering = await ServiceOffering.findByPk(req.body.offering_id);
    if (!offering || offering.active !== true) return res.status(404).json({ error: 'Offre introuvable' });

    const order = await ServiceOrder.create({
      organization_id: req.user.organization_id,
      offering_id: offering.id,
      created_by: req.user.id,
      status: 'requested',
      priority: req.body.priority || 'medium',
      requested_date: new Date(),
      details: req.body.details || {}
    });

    res.status(201).json(order);
  } catch (error) {
    logger.error('Erreur lors de la création de la commande:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// List service orders for org
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const { ServiceOrder, ServiceOffering, User } = require('../models');
    const { page = 1, limit = 20, status, priority } = req.query;
    const pageNum = parseInt(page);
    const pageSize = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * pageSize;

    const where = { organization_id: req.user.organization_id };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const { count, rows } = await ServiceOrder.findAndCountAll({
      where,
      include: [
        { model: ServiceOffering, as: 'offering' },
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
      ],
      offset,
      limit: pageSize,
      order: [['updated_at', 'DESC']]
    });
    res.json({ orders: rows, pagination: { page: pageNum, limit: pageSize, total: count, pages: Math.ceil(count / pageSize) } });
  } catch (error) {
    logger.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Create a task under an order
router.post('/orders/:id/tasks', authenticateToken, [
  body('title').isLength({ min: 3 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { ServiceOrder, ServiceTask } = require('../models');
    const order = await ServiceOrder.findByPk(parseInt(req.params.id));
    if (!order || order.organization_id !== req.user.organization_id) return res.status(404).json({ error: 'Commande introuvable' });
    const task = await ServiceTask.create({ service_order_id: order.id, title: req.body.title, description: req.body.description || null });
    res.status(201).json(task);
  } catch (error) {
    logger.error('Erreur lors de la création de la tâche:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Schedule an appointment
router.post('/orders/:id/appointments', authenticateToken, [
  body('scheduled_at').isISO8601(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { ServiceOrder, Appointment } = require('../models');
    const order = await ServiceOrder.findByPk(parseInt(req.params.id));
    if (!order || order.organization_id !== req.user.organization_id) return res.status(404).json({ error: 'Commande introuvable' });
    const appt = await Appointment.create({ service_order_id: order.id, scheduled_at: new Date(req.body.scheduled_at), duration_minutes: req.body.duration_minutes || 60, location: req.body.location || null, meeting_link: req.body.meeting_link || null });
    res.status(201).json(appt);
  } catch (error) {
    logger.error('Erreur lors de la planification du rendez-vous:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Generate service report metadata (content generation handled by worker)
router.post('/orders/:id/report', authenticateToken, [
  body('title').isLength({ min: 5 }),
  body('format').optional().isIn(['pdf', 'html', 'markdown'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { ServiceOrder, ServiceReport } = require('../models');
    const order = await ServiceOrder.findByPk(parseInt(req.params.id));
    if (!order || order.organization_id !== req.user.organization_id) return res.status(404).json({ error: 'Commande introuvable' });
    const report = await ServiceReport.create({ service_order_id: order.id, title: req.body.title, format: req.body.format || 'pdf', generated_by: req.user.id });
    res.status(201).json(report);
  } catch (error) {
    logger.error('Erreur lors de la génération du rapport de prestation:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;

