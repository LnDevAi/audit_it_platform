const nodemailer = require('nodemailer');
const { logger } = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialise le transporteur email
   */
  initializeTransporter() {
    try {
        this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_PORT == 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      logger.info('Transporteur email initialisé');
    } catch (error) {
      logger.error('Erreur initialisation transporteur email:', error);
    }
  }

  /**
   * Envoie un email
   */
  async sendEmail(to, subject, template, data = {}) {
    try {
      if (!this.transporter) {
        throw new Error('Transporteur email non initialisé');
      }

      const html = this.generateEmailHTML(template, data);
      const text = this.generateEmailText(template, data);

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@e-defence.bf',
        to: to,
        subject: subject,
        text: text,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email envoyé à ${to}: ${result.messageId}`);
      return result;
    } catch (error) {
      logger.error(`Erreur envoi email à ${to}:`, error);
      throw error;
    }
  }

  /**
   * Génère le HTML de l'email
   */
  generateEmailHTML(template, data) {
    const templates = {
      welcome: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Bienvenue sur E-DEFENCE Audit Platform</h2>
          <p>Bonjour ${data.name},</p>
          <p>Votre compte a été créé avec succès. Vous pouvez maintenant accéder à la plateforme.</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Organisation:</strong> ${data.organization}</p>
          <a href="${data.loginUrl}" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Se connecter</a>
          <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
          <p>Cordialement,<br>L'équipe E-DEFENCE</p>
        </div>
      `,
      passwordReset: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e74c3c;">Réinitialisation de mot de passe</h2>
          <p>Bonjour ${data.name},</p>
          <p>Vous avez demandé une réinitialisation de votre mot de passe.</p>
          <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
          <a href="${data.resetUrl}" style="background-color: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Réinitialiser le mot de passe</a>
          <p><strong>Ce lien expire dans 1 heure.</strong></p>
          <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
          <p>Cordialement,<br>L'équipe E-DEFENCE</p>
        </div>
      `,
      invoice: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Nouvelle facture disponible</h2>
          <p>Bonjour ${data.organizationName},</p>
          <p>Une nouvelle facture est disponible pour votre abonnement.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Numéro de facture:</strong> ${data.invoiceNumber}</p>
            <p><strong>Montant:</strong> ${data.amount} ${data.currency}</p>
            <p><strong>Date d'échéance:</strong> ${data.dueDate}</p>
            <p><strong>Plan:</strong> ${data.plan}</p>
          </div>
          <a href="${data.paymentUrl}" style="background-color: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Payer maintenant</a>
          <p>Cordialement,<br>L'équipe E-DEFENCE</p>
        </div>
      `,
      missionUpdate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Mise à jour de mission</h2>
          <p>Bonjour ${data.name},</p>
          <p>La mission "${data.missionName}" a été mise à jour.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Statut:</strong> ${data.status}</p>
            <p><strong>Progression:</strong> ${data.progress}%</p>
            <p><strong>Phase actuelle:</strong> ${data.currentPhase}</p>
            ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
          </div>
          <a href="${data.missionUrl}" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir la mission</a>
          <p>Cordialement,<br>L'équipe E-DEFENCE</p>
        </div>
      `,
      scanComplete: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #27ae60;">Scan terminé</h2>
          <p>Bonjour ${data.name},</p>
          <p>Le scan "${data.scanName}" a été terminé avec succès.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Type de scan:</strong> ${data.scanType}</p>
            <p><strong>Cible:</strong> ${data.target}</p>
            <p><strong>Résultats trouvés:</strong> ${data.resultsCount}</p>
            <p><strong>Durée:</strong> ${data.duration}</p>
          </div>
          <a href="${data.resultsUrl}" style="background-color: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir les résultats</a>
          <p>Cordialement,<br>L'équipe E-DEFENCE</p>
        </div>
      `
    };

    return templates[template] || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>E-DEFENCE Audit Platform</h2>
        <p>${data.message || 'Notification de la plateforme E-DEFENCE'}</p>
        <p>Cordialement,<br>L'équipe E-DEFENCE</p>
      </div>
    `;
  }

  /**
   * Génère le texte de l'email
   */
  generateEmailText(template, data) {
    const templates = {
      welcome: `
        Bienvenue sur E-DEFENCE Audit Platform
        
        Bonjour ${data.name},
        
        Votre compte a été créé avec succès. Vous pouvez maintenant accéder à la plateforme.
        
        Email: ${data.email}
        Organisation: ${data.organization}
        
        Lien de connexion: ${data.loginUrl}
        
        Si vous avez des questions, n'hésitez pas à nous contacter.
        
        Cordialement,
        L'équipe E-DEFENCE
      `,
      passwordReset: `
        Réinitialisation de mot de passe
        
        Bonjour ${data.name},
        
        Vous avez demandé une réinitialisation de votre mot de passe.
        
        Lien de réinitialisation: ${data.resetUrl}
        
        Ce lien expire dans 1 heure.
        
        Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        
        Cordialement,
        L'équipe E-DEFENCE
      `,
      invoice: `
        Nouvelle facture disponible
        
        Bonjour ${data.organizationName},
        
        Une nouvelle facture est disponible pour votre abonnement.
        
        Numéro de facture: ${data.invoiceNumber}
        Montant: ${data.amount} ${data.currency}
        Date d'échéance: ${data.dueDate}
        Plan: ${data.plan}
        
        Lien de paiement: ${data.paymentUrl}
        
        Cordialement,
        L'équipe E-DEFENCE
      `
    };

    return templates[template] || `
      E-DEFENCE Audit Platform
      
      ${data.message || 'Notification de la plateforme E-DEFENCE'}
      
      Cordialement,
      L'équipe E-DEFENCE
    `;
  }

  /**
   * Envoie un email de bienvenue
   */
  async sendWelcomeEmail(user, organization) {
    const data = {
      name: user.name,
      email: user.email,
      organization: organization.name,
      loginUrl: `${process.env.FRONTEND_URL}/login`
    };

    return await this.sendEmail(
      user.email,
      'Bienvenue sur E-DEFENCE Audit Platform',
      'welcome',
      data
    );
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(user, resetToken) {
    const data = {
      name: user.name,
      resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    };

    return await this.sendEmail(
      user.email,
      'Réinitialisation de votre mot de passe',
      'passwordReset',
      data
    );
  }

  /**
   * Envoie un email de facture
   */
  async sendInvoiceEmail(organization, invoice) {
    const data = {
      organizationName: organization.name,
      invoiceNumber: invoice.invoice_number,
      amount: invoice.amount,
      currency: invoice.currency,
      dueDate: invoice.due_date,
      plan: organization.subscription_plan,
      paymentUrl: `${process.env.FRONTEND_URL}/billing/pay/${invoice.id}`
    };

    return await this.sendEmail(
      organization.email,
      `Facture ${invoice.invoice_number} - E-DEFENCE Audit Platform`,
      'invoice',
      data
    );
  }

  /**
   * Envoie un email de mise à jour de mission
   */
  async sendMissionUpdateEmail(user, mission, update) {
    const data = {
      name: user.name,
      missionName: mission.name,
      status: mission.status,
      progress: mission.progress,
      currentPhase: mission.current_phase,
      notes: update.notes,
      missionUrl: `${process.env.FRONTEND_URL}/missions/${mission.id}`
    };

    return await this.sendEmail(
      user.email,
      `Mise à jour de la mission "${mission.name}"`,
      'missionUpdate',
      data
    );
  }

  /**
   * Envoie un email de scan terminé
   */
  async sendScanCompleteEmail(user, scan) {
    const data = {
      name: user.name,
      scanName: scan.name,
      scanType: scan.type,
      target: scan.target,
      resultsCount: scan.results_count,
      duration: scan.duration,
      resultsUrl: `${process.env.FRONTEND_URL}/scans/${scan.id}`
    };

    return await this.sendEmail(
      user.email,
      `Scan "${scan.name}" terminé`,
      'scanComplete',
      data
    );
  }

  /**
   * Teste la configuration email
   */
  async testEmail(to) {
    const data = {
      message: 'Ceci est un email de test pour vérifier la configuration email de la plateforme E-DEFENCE Audit.'
    };

    return await this.sendEmail(
      to,
      'Test Email - E-DEFENCE Audit Platform',
      'test',
      data
    );
  }
}

// Instance singleton
const emailService = new EmailService();

module.exports = emailService;
