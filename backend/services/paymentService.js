const axios = require('axios');
const crypto = require('crypto');
const { Invoice, Organization } = require('../models');
const { logger } = require('../config/logger');

class PaymentService {
  /**
   * Initialise un paiement Orange Money
   */
  static async initiateOrangeMoneyPayment(amount, phone, reference, organizationId) {
    try {
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        throw new Error('Organisation non trouvée');
      }

      const paymentData = {
        merchant_key: process.env.ORANGE_MERCHANT_KEY,
        currency: 'XOF',
        order_id: reference,
        amount: amount,
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        notify_url: `${process.env.BACKEND_URL}/api/payments/orange-money/webhook`,
        lang: 'fr',
        reference: phone,
        customer_phone: phone,
        customer_email: organization.email,
        customer_name: organization.name
      };

      // Signature de la requête
      const signature = this.generateOrangeMoneySignature(paymentData);
      paymentData.signature = signature;

      const response = await axios.post(
        'https://api.orange.com/orange-money-webpay/cm/v1/webpayment',
        paymentData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data.status === 'SUCCESS') {
        logger.info(`Paiement Orange Money initié: ${reference}`);
        return {
          success: true,
          paymentUrl: response.data.payment_url,
          orderId: response.data.order_id,
          reference: reference
        };
      } else {
        throw new Error(`Erreur Orange Money: ${response.data.message}`);
      }
    } catch (error) {
      logger.error('Erreur initiation paiement Orange Money:', error);
      throw error;
    }
  }

  /**
   * Vérifie le statut d'un paiement Orange Money
   */
  static async verifyOrangeMoneyPayment(orderId) {
    try {
      const response = await axios.get(
        `https://api.orange.com/orange-money-webpay/cm/v1/webpayment/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.ORANGE_ACCESS_TOKEN}`,
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        status: response.data.status,
        amount: response.data.amount,
        currency: response.data.currency,
        orderId: response.data.order_id,
        transactionId: response.data.transaction_id,
        timestamp: response.data.timestamp
      };
    } catch (error) {
      logger.error('Erreur vérification paiement Orange Money:', error);
      throw error;
    }
  }

  /**
   * Initialise un paiement Mobile Money (Burkina Faso)
   */
  static async initiateMobileMoneyPayment(amount, phone, reference, organizationId) {
    try {
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        throw new Error('Organisation non trouvée');
      }

      const paymentData = {
        merchant_id: process.env.MOBILE_MONEY_MERCHANT_ID,
        amount: amount,
        currency: 'XOF',
        order_id: reference,
        customer_phone: phone,
        customer_email: organization.email,
        description: `Paiement abonnement E-DEFENCE - ${organization.name}`,
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        notify_url: `${process.env.BACKEND_URL}/api/payments/mobile-money/webhook`
      };

      const response = await axios.post(
        'https://api.mobilemoney.bf/v1/payments',
        paymentData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MOBILE_MONEY_API_KEY}`,
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data.status === 'PENDING') {
        logger.info(`Paiement Mobile Money initié: ${reference}`);
        return {
          success: true,
          paymentId: response.data.payment_id,
          status: response.data.status,
          reference: reference
        };
      } else {
        throw new Error(`Erreur Mobile Money: ${response.data.message}`);
      }
    } catch (error) {
      logger.error('Erreur initiation paiement Mobile Money:', error);
      throw error;
    }
  }

  /**
   * Vérifie le statut d'un paiement Mobile Money
   */
  static async verifyMobileMoneyPayment(paymentId) {
    try {
      const response = await axios.get(
        `https://api.mobilemoney.bf/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MOBILE_MONEY_API_KEY}`,
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        status: response.data.status,
        amount: response.data.amount,
        currency: response.data.currency,
        paymentId: response.data.payment_id,
        transactionId: response.data.transaction_id,
        timestamp: response.data.updated_at
      };
    } catch (error) {
      logger.error('Erreur vérification paiement Mobile Money:', error);
      throw error;
    }
  }

  /**
   * Traite un webhook de paiement Orange Money
   */
  static async handleOrangeMoneyWebhook(webhookData) {
    try {
      // Vérifier la signature du webhook
      if (!this.verifyOrangeMoneyWebhookSignature(webhookData)) {
        throw new Error('Signature webhook invalide');
      }

      const { order_id, status, amount, transaction_id } = webhookData;

      // Trouver la facture correspondante
      const invoice = await Invoice.findOne({
        where: { invoice_number: order_id }
      });

      if (!invoice) {
        throw new Error(`Facture non trouvée: ${order_id}`);
      }

      // Mettre à jour le statut de la facture
      if (status === 'SUCCESS') {
        await invoice.markAsPaid();
        
        // Mettre à jour l'abonnement de l'organisation
        await this.updateOrganizationSubscription(invoice.organization_id, 'active');
        
        logger.info(`Paiement confirmé pour la facture ${order_id}`);
      } else if (status === 'FAILED') {
        await invoice.update({ status: 'overdue' });
        logger.warn(`Paiement échoué pour la facture ${order_id}`);
      }

      return { success: true };
    } catch (error) {
      logger.error('Erreur traitement webhook Orange Money:', error);
      throw error;
    }
  }

  /**
   * Traite un webhook de paiement Mobile Money
   */
  static async handleMobileMoneyWebhook(webhookData) {
    try {
      // Vérifier la signature du webhook
      if (!this.verifyMobileMoneyWebhookSignature(webhookData)) {
        throw new Error('Signature webhook invalide');
      }

      const { payment_id, status, amount, transaction_id } = webhookData;

      // Trouver la facture correspondante
      const invoice = await Invoice.findOne({
        where: { 
          payment_reference: payment_id,
          status: 'sent'
        }
      });

      if (!invoice) {
        throw new Error(`Facture non trouvée: ${payment_id}`);
      }

      // Mettre à jour le statut de la facture
      if (status === 'SUCCESS') {
        await invoice.markAsPaid();
        
        // Mettre à jour l'abonnement de l'organisation
        await this.updateOrganizationSubscription(invoice.organization_id, 'active');
        
        logger.info(`Paiement confirmé pour la facture ${invoice.invoice_number}`);
      } else if (status === 'FAILED') {
        await invoice.update({ status: 'overdue' });
        logger.warn(`Paiement échoué pour la facture ${invoice.invoice_number}`);
      }

      return { success: true };
    } catch (error) {
      logger.error('Erreur traitement webhook Mobile Money:', error);
      throw error;
    }
  }

  /**
   * Met à jour l'abonnement d'une organisation
   */
  static async updateOrganizationSubscription(organizationId, status) {
    try {
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        throw new Error('Organisation non trouvée');
      }

      await organization.update({
        subscription_status: status,
        subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
      });

      logger.info(`Abonnement mis à jour pour l'organisation ${organizationId}: ${status}`);
    } catch (error) {
      logger.error('Erreur mise à jour abonnement:', error);
      throw error;
    }
  }

  /**
   * Génère la signature pour Orange Money
   */
  static generateOrangeMoneySignature(data) {
    const sortedKeys = Object.keys(data).sort();
    const signatureString = sortedKeys
      .map(key => `${key}=${data[key]}`)
      .join('&');
    
    return crypto
      .createHmac('sha256', process.env.ORANGE_MERCHANT_SECRET)
      .update(signatureString)
      .digest('hex');
  }

  /**
   * Vérifie la signature d'un webhook Orange Money
   */
  static verifyOrangeMoneyWebhookSignature(data) {
    const receivedSignature = data.signature;
    delete data.signature;
    
    const expectedSignature = this.generateOrangeMoneySignature(data);
    return receivedSignature === expectedSignature;
  }

  /**
   * Vérifie la signature d'un webhook Mobile Money
   */
  static verifyMobileMoneyWebhookSignature(data) {
    const receivedSignature = data.signature;
    delete data.signature;
    
    const signatureString = JSON.stringify(data);
    const expectedSignature = crypto
      .createHmac('sha256', process.env.MOBILE_MONEY_WEBHOOK_SECRET)
      .update(signatureString)
      .digest('hex');
    
    return receivedSignature === expectedSignature;
  }

  /**
   * Génère une facture pour un abonnement
   */
  static async generateInvoice(organizationId, plan, amount) {
    try {
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        throw new Error('Organisation non trouvée');
      }

      const invoiceNumber = `INV-${Date.now()}-${organizationId}`;
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

      const invoice = await Invoice.create({
        organization_id: organizationId,
        invoice_number: invoiceNumber,
        amount: amount,
        currency: 'XOF',
        status: 'draft',
        due_date: dueDate,
        billing_period_start: new Date(),
        billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          description: `Abonnement ${plan}`,
          quantity: 1,
          unit_price: amount,
          total: amount
        }]
      });

      logger.info(`Facture générée: ${invoiceNumber}`);
      return invoice;
    } catch (error) {
      logger.error('Erreur génération facture:', error);
      throw error;
    }
  }
}

module.exports = PaymentService;
