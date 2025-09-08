#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Génération de secrets sécurisés pour E-DEFENCE Audit Platform');
console.log('===============================================================\n');

// Fonction pour générer une chaîne aléatoire
function generateRandomString(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

// Fonction pour générer un mot de passe fort
function generateStrongPassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Génération des secrets
const secrets = {
  // Base de données
  MYSQL_ROOT_PASSWORD: generateStrongPassword(20),
  MYSQL_DATABASE: 'audit_platform_saas',
  MYSQL_USER: 'audit_user',
  MYSQL_PASSWORD: generateStrongPassword(16),
  
  // JWT
  JWT_SECRET: generateRandomString(128),
  JWT_REFRESH_SECRET: generateRandomString(128),
  
  // Session
  SESSION_SECRET: generateRandomString(64),
  
  // Serveur
  NODE_ENV: 'production',
  PORT: '5000',
  
  // Email (à configurer manuellement)
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_USER: 'your_email@gmail.com',
  SMTP_PASS: 'your_app_password',
  
  // Sécurité
  BCRYPT_ROUNDS: '12',
  RATE_LIMIT_WINDOW: '15',
  RATE_LIMIT_MAX: '100',
  
  // SaaS
  SAAS_MODE: 'true',
  DEFAULT_PLAN: 'trial',
  TRIAL_DURATION_DAYS: '30',
  
  // Billing
  BILLING_ENABLED: 'true',
  PAYMENT_GATEWAY: 'orange_money',
  INVOICE_PREFIX: 'INV-',
  
  // Multi-tenant
  TENANT_ISOLATION: 'strict',
  MAX_ORGS_PER_SERVER: '1000',
  
  // Logging
  LOG_LEVEL: 'info',
  LOG_FILE: './logs/app.log',
  
  // Monitoring
  ENABLE_METRICS: 'true',
  METRICS_PORT: '9090',
  
  // Backup
  BACKUP_ENABLED: 'true',
  BACKUP_RETENTION_DAYS: '30',
  BACKUP_PATH: './backups',
  
  // File Upload
  MAX_FILE_SIZE: '10485760',
  UPLOAD_PATH: './uploads',
  ALLOWED_FILE_TYPES: 'image/jpeg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv',
  
  // CORS
  CORS_ORIGIN: 'http://localhost:3000',
  FRONTEND_URL: 'http://localhost:3000'
};

// Génération du contenu du fichier .env
let envContent = '# ==========================================\n';
envContent += '# E-DEFENCE Audit Platform - Production Environment\n';
envContent += '# Généré automatiquement - ' + new Date().toISOString() + '\n';
envContent += '# ==========================================\n\n';

for (const [key, value] of Object.entries(secrets)) {
  envContent += `${key}=${value}\n`;
}

// Écriture du fichier .env
const envPath = path.join(__dirname, '..', 'backend', '.env');
fs.writeFileSync(envPath, envContent);

console.log('✅ Fichier .env généré avec succès !');
console.log(`📁 Emplacement: ${envPath}\n`);

// Affichage des secrets importants (à noter en lieu sûr)
console.log('🔑 SECRETS IMPORTANTS À NOTER EN LIEU SÛR:');
console.log('==========================================');
console.log(`MYSQL_ROOT_PASSWORD: ${secrets.MYSQL_ROOT_PASSWORD}`);
console.log(`MYSQL_PASSWORD: ${secrets.MYSQL_PASSWORD}`);
console.log(`JWT_SECRET: ${secrets.JWT_SECRET.substring(0, 32)}...`);
console.log(`JWT_REFRESH_SECRET: ${secrets.JWT_REFRESH_SECRET.substring(0, 32)}...`);
console.log(`SESSION_SECRET: ${secrets.SESSION_SECRET.substring(0, 32)}...\n`);

console.log('⚠️  AVERTISSEMENTS:');
console.log('==================');
console.log('1. Changez les mots de passe par défaut en production');
console.log('2. Configurez les paramètres SMTP pour les emails');
console.log('3. Ajustez CORS_ORIGIN pour votre domaine de production');
console.log('4. Sauvegardez ces secrets en lieu sûr');
console.log('5. Ne committez jamais le fichier .env dans Git\n');

console.log('🚀 Prochaines étapes:');
console.log('=====================');
console.log('1. Vérifiez le fichier .env généré');
console.log('2. Configurez les paramètres spécifiques à votre environnement');
console.log('3. Démarrez l\'application avec: npm run start');
console.log('4. Testez l\'authentification avec les comptes par défaut\n');

console.log('✅ Génération terminée avec succès !');


