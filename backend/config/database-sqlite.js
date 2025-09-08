const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Créer le dossier data s'il n'existe pas
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Configuration SQLite pour le développement
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(dataDir, 'audit_platform.db'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

// Test de connexion
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion SQLite établie avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur connexion SQLite:', error);
    return false;
  }
};

module.exports = { sequelize, testConnection };
