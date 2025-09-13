const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const PaymentService = require('../services/paymentService');
const { logger } = require('../config/logger');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const paypal = require('@paypal/checkout-server-sdk');

function getPayPalClient() {
  const environment = process.env.PAYPAL_MODE === 'live'
    ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
  return new paypal.core.PayPalHttpClient(environment);
}
/**
 * @route POST /api/payments/checkout
 * @desc Créer commande + facture puis initier paiement (stripe|paypal)
 * @access Private
 */
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const { method, offering_id, amount_cents, currency = 'XOF' } = req.body;
    if (!method || !offering_id || !amount_cents) {
      return res.status(400).json({ error: 'method, offering_id, amount_cents requis' });
    }

    const { ServiceOrder, ServiceOffering, Invoice } = require('../models');
    const offering = await ServiceOffering.findByPk(offering_id);
    if (!offering || offering.active !== true) return res.status(404).json({ error: 'Offre introuvable' });

    const order = await ServiceOrder.create({
      organization_id: req.user.organization_id,
      offering_id: offering.id,
      created_by: req.user.id,
      status: 'requested',
      priority: 'medium',
      requested_date: new Date(),
      details: { checkout: true }
    });

    const invoiceNumber = `INV-${Date.now()}-${order.id}`;
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invoice = await Invoice.create({
      organization_id: req.user.organization_id,
      service_order_id: order.id,
      invoice_number: invoiceNumber,
      amount: (amount_cents / 100).toFixed(2),
      currency,
      status: 'sent',
      due_date: dueDate,
      customer_name: req.user.name,
      customer_email: req.user.email,
      items: [{ description: offering.name, quantity: 1, unit_price: (amount_cents / 100), total: (amount_cents / 100) }]
    });

    if (method === 'stripe') {
      const intent = await stripe.paymentIntents.create({
        amount: amount_cents,
        currency: currency.toLowerCase(),
        metadata: { invoice_number: invoice.invoice_number, service_order_id: String(order.id) },
        automatic_payment_methods: { enabled: true },
      });
      await invoice.update({ payment_reference: intent.id });
      return res.json({ provider: 'stripe', clientSecret: intent.client_secret, invoice_number: invoice.invoice_number });
    } else if (method === 'paypal') {
      const request = new paypal.orders.OrdersCreateRequest();
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: currency, value: (amount_cents / 100).toFixed(2) },
          custom_id: invoice.invoice_number,
          description: offering.name
        }],
        application_context: {
          return_url: `${process.env.BACKEND_URL}/api/payments/paypal/return`,
          cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
        }
      });
      const client = getPayPalClient();
      const orderRes = await client.execute(request);
      const approveLink = orderRes.result.links.find(l => l.rel === 'approve');
      await invoice.update({ payment_reference: orderRes.result.id });
      return res.json({ provider: 'paypal', approveUrl: approveLink?.href, invoice_number: invoice.invoice_number });
    } else {
      return res.status(400).json({ error: 'Méthode de paiement non supportée' });
    }
  } catch (error) {
    logger.error('Erreur checkout:', error);
    res.status(500).json({ error: 'Erreur lors du checkout' });
  }
});

// Stripe webhook
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const event = require('stripe')(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(req.body, sig, endpointSecret);
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const { Invoice, ServiceOrder } = require('../models');
      const invoice = await Invoice.findOne({ where: { payment_reference: intent.id } });
      if (invoice) {
        await invoice.markAsPaid();
        await ServiceOrder.update({ status: 'in_progress' }, { where: { id: invoice.service_order_id } });
      }
    }
    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// PayPal return (capture)
router.get('/paypal/return', async (req, res) => {
  try {
    const { token } = req.query; // PayPal order ID
    const client = getPayPalClient();
    const request = new paypal.orders.OrdersCaptureRequest(token);
    request.requestBody({});
    const capture = await client.execute(request);
    if (capture.result.status === 'COMPLETED') {
      const { Invoice, ServiceOrder } = require('../models');
      const invoice = await Invoice.findOne({ where: { payment_reference: token } });
      if (invoice) {
        await invoice.markAsPaid();
        await ServiceOrder.update({ status: 'in_progress' }, { where: { id: invoice.service_order_id } });
      }
      return res.redirect(`${process.env.FRONTEND_URL}/payment/success`);
    }
    return res.redirect(`${process.env.FRONTEND_URL}/payment/cancel`);
  } catch (error) {
    logger.error('PayPal return error:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/payment/cancel`);
  }
});

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
