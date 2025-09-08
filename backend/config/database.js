const { Sequelize } = require('sequelize');
const { logger } = require('./logger');
const { recordDatabaseOperation } = require('./metrics');
require('dotenv').config();

// Détection automatique du type de base de données
const useSQLite = process.env.USE_SQLITE === 'true' || !process.env.DB_HOST;

let sequelize;

if (useSQLite) {
  // Configuration SQLite pour le développement
  const path = require('path');
  const fs = require('fs');
  
  // Créer le dossier data s'il n'existe pas
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  sequelize = new Sequelize({
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
  
  console.log('📁 Utilisation de SQLite (mode développement)');
} else {
  // Configuration MySQL pour la production
  sequelize = new Sequelize(
    process.env.DB_NAME || 'audit_platform_saas',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      timezone: '+00:00',
      
      // Logging optimisé
      logging: process.env.NODE_ENV === 'development' ? 
        (sql, timing) => {
          logger.debug(`SQL Query (${timing}ms): ${sql}`);
          recordDatabaseOperation('query', 'unknown', null, timing);
        } : false,
      
      // Pool de connexions optimisé
      pool: {
        max: parseInt(process.env.DB_POOL_MAX) || 20,
        min: parseInt(process.env.DB_POOL_MIN) || 5,
        acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,
        idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
        evict: parseInt(process.env.DB_POOL_EVICT) || 1000
      },
      
      // Configuration de sécurité
      dialectOptions: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        ssl: process.env.DB_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      },
      
      // Configuration des requêtes
      define: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        timestamps: true,
        underscored: false,
        freezeTableName: true,
        // Optimisations pour les performances
        indexes: true,
        paranoid: false // Désactiver soft deletes par défaut pour les performances
      }
    }
  );
  
  console.log('🐬 Utilisation de MySQL (mode production)');
}

// Fonction pour tester la connexion avec métriques
const testConnection = async () => {
  const start = Date.now();
  try {
    await sequelize.authenticate();
    const duration = Date.now() - start;
    logger.info(`Database connection successful (${duration}ms)`);
    recordDatabaseOperation('connection', 'system', null, duration);
    return true;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`Database connection failed (${duration}ms):`, error);
    recordDatabaseOperation('connection_error', 'system', null, duration);
    return false;
  }
};

// Fonction pour obtenir les statistiques de la base de données
const getDatabaseStats = async () => {
  try {
    if (useSQLite) {
      // Statistiques SQLite
      const [results] = await sequelize.query(`
        SELECT 
          name as table_name,
          (SELECT COUNT(*) FROM sqlite_master WHERE type='table') as table_count
        FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        LIMIT 1
      `, {
        type: Sequelize.QueryTypes.SELECT
      });

      return results[0] || {
        database_name: 'audit_platform.db',
        table_count: 0,
        total_rows: 0,
        total_size_bytes: 0
      };
    } else {
      // Statistiques MySQL
      const [results] = await sequelize.query(`
        SELECT 
          TABLE_SCHEMA as database_name,
          COUNT(*) as table_count,
          SUM(TABLE_ROWS) as total_rows,
          SUM(DATA_LENGTH + INDEX_LENGTH) as total_size_bytes
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ?
        GROUP BY TABLE_SCHEMA
      `, {
        replacements: [process.env.DB_NAME || 'audit_platform_saas'],
        type: Sequelize.QueryTypes.SELECT
      });

      return results[0] || {
        database_name: process.env.DB_NAME,
        table_count: 0,
        total_rows: 0,
        total_size_bytes: 0
      };
    }
  } catch (error) {
    logger.error('Error getting database stats:', error);
    return null;
  }
};

// Fonction pour optimiser les tables
const optimizeTables = async () => {
  try {
    if (useSQLite) {
      // Optimisation SQLite
      await sequelize.query('VACUUM');
      logger.info('SQLite database optimized');
      return ['sqlite_vacuum'];
    } else {
      // Optimisation MySQL
      const [tables] = await sequelize.query(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ?
      `, {
        replacements: [process.env.DB_NAME || 'audit_platform_saas'],
        type: Sequelize.QueryTypes.SELECT
      });

      const optimizations = [];
      for (const table of tables) {
        try {
          await sequelize.query(`OPTIMIZE TABLE ${table.TABLE_NAME}`);
          optimizations.push(table.TABLE_NAME);
        } catch (error) {
          logger.error(`Failed to optimize table ${table.TABLE_NAME}:`, error);
        }
      }

      logger.info(`Optimized ${optimizations.length} tables: ${optimizations.join(', ')}`);
      return optimizations;
    }
  } catch (error) {
    logger.error('Error optimizing tables:', error);
    return [];
  }
};

// Fonction pour analyser les tables
const analyzeTables = async () => {
  try {
    if (useSQLite) {
      // Analyse SQLite
      await sequelize.query('ANALYZE');
      logger.info('SQLite database analyzed');
      return ['sqlite_analyze'];
    } else {
      // Analyse MySQL
      const [tables] = await sequelize.query(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ?
      `, {
        replacements: [process.env.DB_NAME || 'audit_platform_saas'],
        type: Sequelize.QueryTypes.SELECT
      });

      const analyses = [];
      for (const table of tables) {
        try {
          await sequelize.query(`ANALYZE TABLE ${table.TABLE_NAME}`);
          analyses.push(table.TABLE_NAME);
        } catch (error) {
          logger.error(`Failed to analyze table ${table.TABLE_NAME}:`, error);
        }
      }

      logger.info(`Analyzed ${analyses.length} tables: ${analyses.join(', ')}`);
      return analyses;
    }
  } catch (error) {
    logger.error('Error analyzing tables:', error);
    return [];
  }
};

// Fonction pour nettoyer les logs de base de données
const cleanupLogs = async () => {
  try {
    if (!useSQLite) {
      // Nettoyage MySQL
      await sequelize.query('PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 7 DAY)');
      logger.info('MySQL binary logs cleaned up');
    }
  } catch (error) {
    logger.error('Error cleaning up database logs:', error);
  }
};

// Fonction pour vérifier l'intégrité de la base de données
const checkIntegrity = async () => {
  try {
    if (useSQLite) {
      // Vérification SQLite
      const [results] = await sequelize.query('PRAGMA integrity_check');
      const isOk = results[0].integrity_check === 'ok';
      logger.info(`SQLite integrity check: ${isOk ? 'OK' : 'FAILED'}`);
      return isOk;
    } else {
      // Vérification MySQL
      const [tables] = await sequelize.query(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ?
      `, {
        replacements: [process.env.DB_NAME || 'audit_platform_saas'],
        type: Sequelize.QueryTypes.SELECT
      });

      let allOk = true;
      for (const table of tables) {
        try {
          const [results] = await sequelize.query(`CHECK TABLE ${table.TABLE_NAME}`);
          const status = results[0].Msg_text;
          if (status !== 'OK') {
            logger.warn(`Table ${table.TABLE_NAME} check failed: ${status}`);
            allOk = false;
          }
        } catch (error) {
          logger.error(`Failed to check table ${table.TABLE_NAME}:`, error);
          allOk = false;
        }
      }

      logger.info(`MySQL integrity check: ${allOk ? 'OK' : 'FAILED'}`);
      return allOk;
    }
  } catch (error) {
    logger.error('Error checking database integrity:', error);
    return false;
  }
};

// Fonction pour fermer la connexion
const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

module.exports = {
  sequelize,
  testConnection,
  getDatabaseStats,
  optimizeTables,
  analyzeTables,
  cleanupLogs,
  checkIntegrity,
  closeConnection
};