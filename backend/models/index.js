const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');
const { logger } = require('../config/logger');

// Import des modèles
const Organization = require('./Organization');
const User = require('./User');
const Permission = require('./Permission');
const UserPermission = require('./UserPermission');
const SubscriptionPlan = require('./SubscriptionPlan');
const Invoice = require('./Invoice');
const AuditMission = require('./AuditMission');
const AuditSite = require('./AuditSite');
const InventoryItem = require('./InventoryItem');
const Infrastructure = require('./Infrastructure');
const NetworkDevice = require('./NetworkDevice');
const Vulnerability = require('./Vulnerability');
const SecurityControl = require('./SecurityControl');
const Interview = require('./Interview');
const Report = require('./Report');
const Scan = require('./Scan');
const ActivityLog = require('./ActivityLog');
const FileUpload = require('./FileUpload');
const DataImport = require('./DataImport');
const DataExport = require('./DataExport');
const ApiKey = require('./ApiKey');

// Initialisation des modèles
const models = {
  Organization: Organization(sequelize, Sequelize.DataTypes),
  User: User(sequelize, Sequelize.DataTypes),
  Permission: Permission(sequelize, Sequelize.DataTypes),
  UserPermission: UserPermission(sequelize, Sequelize.DataTypes),
  SubscriptionPlan: SubscriptionPlan(sequelize, Sequelize.DataTypes),
  Invoice: Invoice(sequelize, Sequelize.DataTypes),
  AuditMission: AuditMission(sequelize, Sequelize.DataTypes),
  AuditSite: AuditSite(sequelize, Sequelize.DataTypes),
  InventoryItem: InventoryItem(sequelize, Sequelize.DataTypes),
  Infrastructure: Infrastructure(sequelize, Sequelize.DataTypes),
  NetworkDevice: NetworkDevice(sequelize, Sequelize.DataTypes),
  Vulnerability: Vulnerability(sequelize, Sequelize.DataTypes),
  SecurityControl: SecurityControl(sequelize, Sequelize.DataTypes),
  Interview: Interview(sequelize, Sequelize.DataTypes),
  Report: Report(sequelize, Sequelize.DataTypes),
  Scan: Scan(sequelize, Sequelize.DataTypes),
  ActivityLog: ActivityLog(sequelize, Sequelize.DataTypes),
  FileUpload: FileUpload(sequelize, Sequelize.DataTypes),
  DataImport: DataImport(sequelize, Sequelize.DataTypes),
  DataExport: DataExport(sequelize, Sequelize.DataTypes),
  ApiKey: ApiKey
};

// Configuration des associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Configuration des hooks globaux
Object.keys(models).forEach(modelName => {
  const model = models[modelName];
  
  // Hook pour logger les opérations
  model.addHook('afterCreate', (instance, options) => {
    logger.info(`Created ${modelName}`, {
      id: instance.id,
      organizationId: instance.organization_id,
      userId: options.userId
    });
  });
  
  model.addHook('afterUpdate', (instance, options) => {
    logger.info(`Updated ${modelName}`, {
      id: instance.id,
      organizationId: instance.organization_id,
      userId: options.userId
    });
  });
  
  model.addHook('afterDestroy', (instance, options) => {
    logger.info(`Deleted ${modelName}`, {
      id: instance.id,
      organizationId: instance.organization_id,
      userId: options.userId
    });
  });
});

// Fonction pour synchroniser la base de données
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force, alter: !force });
    logger.info('✅ Base de données synchronisée avec succès');
  } catch (error) {
    logger.error('❌ Erreur lors de la synchronisation de la base de données:', error);
    throw error;
  }
};

// Fonction pour tester la connexion
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Connexion à la base de données établie');
    return true;
  } catch (error) {
    logger.error('❌ Impossible de se connecter à la base de données:', error);
    return false;
  }
};

// Fonction pour fermer la connexion
const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info('✅ Connexion à la base de données fermée');
  } catch (error) {
    logger.error('❌ Erreur lors de la fermeture de la connexion:', error);
  }
};

module.exports = {
  sequelize,
  Sequelize,
  ...models,
  syncDatabase,
  testConnection,
  closeConnection
};