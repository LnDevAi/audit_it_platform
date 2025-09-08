const axios = require('axios');
const crypto = require('crypto');
const { Organization } = require('../models');
const { logger } = require('../config/logger');

class WebhookService {
  /**
   * Envoie un webhook à une organisation
   */
  static async sendWebhook(organizationId, event, data) {
    try {
      const organization = await Organization.findByPk(organizationId);
      if (!organization || !organization.webhook_url) {
        logger.info(`Organisation ${organizationId} sans webhook configuré`);
        return { success: false, reason: 'no_webhook_url' };
      }

      const payload = {
        event: event,
        data: data,
        timestamp: new Date().toISOString(),
        organization_id: organizationId
      };

      // Générer la signature
      const signature = this.generateSignature(payload, organization.webhook_secret);
      
      const response = await axios.post(organization.webhook_url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'User-Agent': 'E-DEFENCE-Audit-Platform/1.0'
        },
        timeout: 10000,
        validateStatus: (status) => status < 500 // Accepter les codes 4xx comme succès
      });

      logger.info(`Webhook ${event} envoyé à l'organisation ${organizationId}: ${response.status}`);
      return { 
        success: true, 
        status: response.status,
        response: response.data 
      };
    } catch (error) {
      logger.error(`Erreur envoi webhook ${event} à l'organisation ${organizationId}:`, error);
      return { 
        success: false, 
        error: error.message,
        status: error.response?.status 
      };
    }
  }

  /**
   * Envoie un webhook à toutes les organisations
   */
  static async broadcastWebhook(event, data) {
    try {
      const organizations = await Organization.findAll({
        where: { 
          webhook_url: { [require('sequelize').Op.ne]: null },
          status: 'active'
        }
      });

      const results = [];
      for (const organization of organizations) {
        const result = await this.sendWebhook(organization.id, event, data);
        results.push({
          organization_id: organization.id,
          organization_name: organization.name,
          ...result
        });
      }

      logger.info(`Webhook ${event} diffusé à ${organizations.length} organisations`);
      return results;
    } catch (error) {
      logger.error(`Erreur diffusion webhook ${event}:`, error);
      throw error;
    }
  }

  /**
   * Génère la signature d'un webhook
   */
  static generateSignature(payload, secret) {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Vérifie la signature d'un webhook entrant
   */
  static verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Envoie un webhook pour un événement de mission
   */
  static async sendMissionWebhook(organizationId, event, mission) {
    const webhookData = {
      mission: {
        id: mission.id,
        name: mission.name,
        client_name: mission.client_name,
        status: mission.status,
        progress: mission.progress,
        start_date: mission.start_date,
        end_date: mission.end_date,
        created_at: mission.created_at,
        updated_at: mission.updated_at
      }
    };

    return await this.sendWebhook(organizationId, `mission.${event}`, webhookData);
  }

  /**
   * Envoie un webhook pour un événement d'utilisateur
   */
  static async sendUserWebhook(organizationId, event, user) {
    const webhookData = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    };

    return await this.sendWebhook(organizationId, `user.${event}`, webhookData);
  }

  /**
   * Envoie un webhook pour un événement de paiement
   */
  static async sendPaymentWebhook(organizationId, event, payment) {
    const webhookData = {
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        reference: payment.reference,
        created_at: payment.created_at,
        updated_at: payment.updated_at
      }
    };

    return await this.sendWebhook(organizationId, `payment.${event}`, webhookData);
  }

  /**
   * Envoie un webhook pour un événement d'organisation
   */
  static async sendOrganizationWebhook(organizationId, event, organization) {
    const webhookData = {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        subscription_plan: organization.subscription_plan,
        subscription_status: organization.subscription_status,
        max_users: organization.max_users,
        max_missions: organization.max_missions,
        max_storage_gb: organization.max_storage_gb,
        created_at: organization.created_at,
        updated_at: organization.updated_at
      }
    };

    return await this.sendWebhook(organizationId, `organization.${event}`, webhookData);
  }

  /**
   * Envoie un webhook pour un événement de scan
   */
  static async sendScanWebhook(organizationId, event, scan) {
    const webhookData = {
      scan: {
        id: scan.id,
        type: scan.type,
        target: scan.target,
        status: scan.status,
        results_count: scan.results_count,
        started_at: scan.started_at,
        completed_at: scan.completed_at,
        created_at: scan.created_at
      }
    };

    return await this.sendWebhook(organizationId, `scan.${event}`, webhookData);
  }

  /**
   * Envoie un webhook pour un événement de vulnérabilité
   */
  static async sendVulnerabilityWebhook(organizationId, event, vulnerability) {
    const webhookData = {
      vulnerability: {
        id: vulnerability.id,
        title: vulnerability.title,
        severity: vulnerability.severity,
        cvss_score: vulnerability.cvss_score,
        status: vulnerability.status,
        discovered_at: vulnerability.discovered_at,
        resolved_at: vulnerability.resolved_at,
        created_at: vulnerability.created_at
      }
    };

    return await this.sendWebhook(organizationId, `vulnerability.${event}`, webhookData);
  }

  /**
   * Teste un webhook
   */
  static async testWebhook(organizationId) {
    const testData = {
      test: true,
      message: 'Test webhook depuis E-DEFENCE Audit Platform',
      timestamp: new Date().toISOString()
    };

    return await this.sendWebhook(organizationId, 'test', testData);
  }

  /**
   * Obtient les statistiques des webhooks
   */
  static async getWebhookStats(organizationId = null) {
    try {
      const where = { 
        webhook_url: { [require('sequelize').Op.ne]: null },
        status: 'active'
      };
      
      if (organizationId) {
        where.id = organizationId;
      }

      const organizations = await Organization.findAll({ where });
      
      return {
        total_organizations: organizations.length,
        webhook_enabled: organizations.length,
        organizations: organizations.map(org => ({
          id: org.id,
          name: org.name,
          webhook_url: org.webhook_url,
          webhook_secret: !!org.webhook_secret
        }))
      };
    } catch (error) {
      logger.error('Erreur récupération stats webhooks:', error);
      throw error;
    }
  }
}

module.exports = WebhookService;
