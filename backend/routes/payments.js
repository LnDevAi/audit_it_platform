const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const PaymentService = require('../services/paymentService');
const { logger } = require('../config/logger');
const router = express.Router();

/**
 * @route POST /api/payments/orange-money/initiate
 * @desc Initier un paiement Orange Money
 * @access Private
 */
router.post('/orange-money/initiate', authenticateToken, async (req, res) => {
  try {
    const { amount, phone, reference } = req.body;
    const user = req.user;

    if (!amount || !phone || !reference) {
      return res.status(400).json({
        error: 'Montant, téléphone et référence requis'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'Le montant doit être positif'
      });
    }

    const result = await PaymentService.initiateOrangeMoneyPayment(
      amount,
      phone,
      reference,
      user.organization_id
    );

    res.json({
      message: 'Paiement Orange Money initié',
      ...result
    });
  } catch (error) {
    logger.error('Erreur initiation paiement Orange Money:', error);
    res.status(500).json({
      error: error.message || 'Erreur lors de l\'initiation du paiement'
    });
  }
});

/**
 * @route POST /api/payments/mobile-money/initiate
 * @desc Initier un paiement Mobile Money
 * @access Private
 */
router.post('/mobile-money/initiate', authenticateToken, async (req, res) => {
  try {
    const { amount, phone, reference } = req.body;
    const user = req.user;

    if (!amount || !phone || !reference) {
      return res.status(400).json({
        error: 'Montant, téléphone et référence requis'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'Le montant doit être positif'
      });
    }

    const result = await PaymentService.initiateMobileMoneyPayment(
      amount,
      phone,
      reference,
      user.organization_id
    );

    res.json({
      message: 'Paiement Mobile Money initié',
      ...result
    });
  } catch (error) {
    logger.error('Erreur initiation paiement Mobile Money:', error);
    res.status(500).json({
      error: error.message || 'Erreur lors de l\'initiation du paiement'
    });
  }
});

/**
 * @route POST /api/payments/orange-money/verify
 * @desc Vérifier le statut d'un paiement Orange Money
 * @access Private
 */
router.post('/orange-money/verify', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        error: 'ID de commande requis'
      });
    }

    const result = await PaymentService.verifyOrangeMoneyPayment(orderId);

    res.json({
      message: 'Statut du paiement récupéré',
      ...result
    });
  } catch (error) {
    logger.error('Erreur vérification paiement Orange Money:', error);
    res.status(500).json({
      error: error.message || 'Erreur lors de la vérification du paiement'
    });
  }
});

/**
 * @route POST /api/payments/mobile-money/verify
 * @desc Vérifier le statut d'un paiement Mobile Money
 * @access Private
 */
router.post('/mobile-money/verify', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        error: 'ID de paiement requis'
      });
    }

    const result = await PaymentService.verifyMobileMoneyPayment(paymentId);

    res.json({
      message: 'Statut du paiement récupéré',
      ...result
    });
  } catch (error) {
    logger.error('Erreur vérification paiement Mobile Money:', error);
    res.status(500).json({
      error: error.message || 'Erreur lors de la vérification du paiement'
    });
  }
});

/**
 * @route POST /api/payments/orange-money/webhook
 * @desc Webhook pour les notifications Orange Money
 * @access Public (vérification signature)
 */
router.post('/orange-money/webhook', async (req, res) => {
  try {
    const webhookData = req.body;

    await PaymentService.handleOrangeMoneyWebhook(webhookData);

    res.json({ success: true });
  } catch (error) {
    logger.error('Erreur webhook Orange Money:', error);
    res.status(400).json({
      error: 'Erreur traitement webhook'
    });
  }
});

/**
 * @route POST /api/payments/mobile-money/webhook
 * @desc Webhook pour les notifications Mobile Money
 * @access Public (vérification signature)
 */
router.post('/mobile-money/webhook', async (req, res) => {
  try {
    const webhookData = req.body;

    await PaymentService.handleMobileMoneyWebhook(webhookData);

    res.json({ success: true });
  } catch (error) {
    logger.error('Erreur webhook Mobile Money:', error);
    res.status(400).json({
      error: 'Erreur traitement webhook'
    });
  }
});

/**
 * @route POST /api/payments/generate-invoice
 * @desc Générer une facture pour un abonnement
 * @access Private - Admin
 */
router.post('/generate-invoice', authenticateToken, requireRole(['super_admin', 'org_admin']), async (req, res) => {
  try {
    const { organizationId, plan, amount } = req.body;

    if (!organizationId || !plan || !amount) {
      return res.status(400).json({
        error: 'ID organisation, plan et montant requis'
      });
    }

    const invoice = await PaymentService.generateInvoice(organizationId, plan, amount);

    res.json({
      message: 'Facture générée avec succès',
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        due_date: invoice.due_date
      }
    });
  } catch (error) {
    logger.error('Erreur génération facture:', error);
    res.status(500).json({
      error: error.message || 'Erreur lors de la génération de la facture'
    });
  }
});

/**
 * @route GET /api/payments/invoices
 * @desc Liste des factures de l'organisation
 * @access Private
 */
router.get('/invoices', authenticateToken, async (req, res) => {
  try {
    const { Invoice } = require('../models');
    const user = req.user;

    const invoices = await Invoice.findAll({
      where: { organization_id: user.organization_id },
      order: [['created_at', 'DESC']]
    });

    res.json({
      invoices: invoices
    });
  } catch (error) {
    logger.error('Erreur récupération factures:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des factures'
    });
  }
});

/**
 * @route GET /api/payments/invoices/:id
 * @desc Détails d'une facture
 * @access Private
 */
router.get('/invoices/:id', authenticateToken, async (req, res) => {
  try {
    const { Invoice } = require('../models');
    const user = req.user;

    const invoice = await Invoice.findOne({
      where: { 
        id: req.params.id,
        organization_id: user.organization_id 
      }
    });

    if (!invoice) {
      return res.status(404).json({
        error: 'Facture non trouvée'
      });
    }

    res.json({
      invoice: invoice
    });
  } catch (error) {
    logger.error('Erreur récupération facture:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la facture'
    });
  }
});

module.exports = router;
