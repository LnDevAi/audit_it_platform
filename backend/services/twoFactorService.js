const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { User } = require('../models');
const { logger } = require('../config/logger');

class TwoFactorService {
  /**
   * Génère un secret 2FA pour un utilisateur
   */
  static async generateSecret(user) {
    try {
      const secret = speakeasy.generateSecret({
        name: `E-DEFENCE (${user.email})`,
        issuer: 'E-DEFENCE Audit Platform',
        length: 32
      });

      // Sauvegarder le secret temporairement (pas encore activé)
      await user.update({
        two_factor_secret: secret.base32,
        two_factor_enabled: false
      });

      // Générer le QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32
      };
    } catch (error) {
      logger.error('Erreur génération secret 2FA:', error);
      throw new Error('Erreur lors de la génération du secret 2FA');
    }
  }

  /**
   * Vérifie un token 2FA
   */
  static async verifyToken(user, token) {
    try {
      if (!user.two_factor_enabled || !user.two_factor_secret) {
        throw new Error('2FA non activé pour cet utilisateur');
      }

      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: token,
        window: 2 // Tolérance de 2 périodes (60 secondes)
      });

      if (verified) {
        logger.info(`2FA vérifié avec succès pour l'utilisateur ${user.id}`);
        return true;
      } else {
        logger.warn(`Échec vérification 2FA pour l'utilisateur ${user.id}`);
        return false;
      }
    } catch (error) {
      logger.error('Erreur vérification token 2FA:', error);
      return false;
    }
  }

  /**
   * Active le 2FA pour un utilisateur après vérification
   */
  static async enable2FA(user, token) {
    try {
      if (!user.two_factor_secret) {
        throw new Error('Aucun secret 2FA trouvé');
      }

      // Vérifier le token avant d'activer
      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified) {
        throw new Error('Token 2FA invalide');
      }

      // Activer le 2FA
      await user.update({
        two_factor_enabled: true
      });

      logger.info(`2FA activé pour l'utilisateur ${user.id}`);
      return true;
    } catch (error) {
      logger.error('Erreur activation 2FA:', error);
      throw error;
    }
  }

  /**
   * Désactive le 2FA pour un utilisateur
   */
  static async disable2FA(user, token) {
    try {
      if (!user.two_factor_enabled) {
        throw new Error('2FA déjà désactivé');
      }

      // Vérifier le token avant de désactiver
      const verified = await this.verifyToken(user, token);
      if (!verified) {
        throw new Error('Token 2FA invalide');
      }

      // Désactiver le 2FA
      await user.update({
        two_factor_enabled: false,
        two_factor_secret: null
      });

      logger.info(`2FA désactivé pour l'utilisateur ${user.id}`);
      return true;
    } catch (error) {
      logger.error('Erreur désactivation 2FA:', error);
      throw error;
    }
  }

  /**
   * Génère des codes de récupération
   */
  static async generateRecoveryCodes(user) {
    try {
      const codes = [];
      for (let i = 0; i < 10; i++) {
        codes.push(this.generateRecoveryCode());
      }

      // Sauvegarder les codes (hashés) dans les préférences
      const hashedCodes = codes.map(code => this.hashRecoveryCode(code));
      const preferences = user.preferences || {};
      preferences.recovery_codes = hashedCodes;
      preferences.recovery_codes_used = [];

      await user.update({ preferences });

      return codes;
    } catch (error) {
      logger.error('Erreur génération codes de récupération:', error);
      throw error;
    }
  }

  /**
   * Vérifie un code de récupération
   */
  static async verifyRecoveryCode(user, code) {
    try {
      const preferences = user.preferences || {};
      const recoveryCodes = preferences.recovery_codes || [];
      const usedCodes = preferences.recovery_codes_used || [];

      const hashedCode = this.hashRecoveryCode(code);
      
      // Vérifier si le code existe et n'a pas été utilisé
      const codeIndex = recoveryCodes.findIndex(rc => rc === hashedCode);
      if (codeIndex === -1 || usedCodes.includes(codeIndex)) {
        return false;
      }

      // Marquer le code comme utilisé
      usedCodes.push(codeIndex);
      preferences.recovery_codes_used = usedCodes;
      await user.update({ preferences });

      logger.info(`Code de récupération utilisé pour l'utilisateur ${user.id}`);
      return true;
    } catch (error) {
      logger.error('Erreur vérification code de récupération:', error);
      return false;
    }
  }

  /**
   * Génère un code de récupération aléatoire
   */
  static generateRecoveryCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Hash un code de récupération
   */
  static hashRecoveryCode(code) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}

module.exports = TwoFactorService;
