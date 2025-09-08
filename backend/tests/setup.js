// Configuration de l'environnement de test
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'audit_platform_test';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only';
process.env.JWT_EXPIRES_IN = '1h';

// Configuration des variables d'environnement de test
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';

// Désactiver les logs pendant les tests
process.env.LOG_LEVEL = 'error';

// Configuration des timeouts
jest.setTimeout(10000);

// Mock de Winston pour éviter les logs pendant les tests
jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    http: jest.fn()
  },
  logRequest: jest.fn((req, res, next) => next()),
  logApiError: jest.fn((err, req, res, next) => next(err)),
  logBusinessOperation: jest.fn(),
  logSecurityEvent: jest.fn()
}));

// Configuration globale pour les tests
global.console = {
  ...console,
  // Désactiver les logs console pendant les tests
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Fonction utilitaire pour nettoyer la base de données de test
global.cleanupTestDatabase = async () => {
  const { sequelize } = require('../models');
  
  try {
    // Supprimer toutes les données de test
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    const tables = await sequelize.query('SHOW TABLES');
    for (const table of tables[0]) {
      const tableName = Object.values(table)[0];
      await sequelize.query(`TRUNCATE TABLE ${tableName}`);
    }
    
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  } catch (error) {
    console.error('Erreur lors du nettoyage de la base de test:', error);
  }
};

// Fonction utilitaire pour créer des données de test
global.createTestData = async () => {
  const { Organization, User } = require('../models');
  const bcrypt = require('bcryptjs');
  
  try {
    // Créer une organisation de test
    const organization = await Organization.create({
      name: 'Test Organization',
      slug: 'test-org',
      subscription_plan: 'trial',
      subscription_status: 'active',
      max_users: 10,
      max_missions: 20,
      max_storage_gb: 5
    });
    
    // Créer un utilisateur de test
    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password_hash: hashedPassword,
      role: 'auditor_senior',
      organization_id: organization.id,
      status: 'active'
    });
    
    return { organization, user };
  } catch (error) {
    console.error('Erreur lors de la création des données de test:', error);
    throw error;
  }
};

// Fonction utilitaire pour obtenir un token d'authentification
global.getAuthToken = async (email = 'test@example.com', password = 'testpassword123') => {
  const request = require('supertest');
  const app = require('../server');
  
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  
  return response.body.token;
};

// Configuration des hooks globaux
beforeAll(async () => {
  // Configuration initiale avant tous les tests
  console.log('🚀 Démarrage des tests...');
});

afterAll(async () => {
  // Nettoyage final après tous les tests
  console.log('✅ Tests terminés');
});

// Configuration pour chaque test
beforeEach(async () => {
  // Nettoyer la base de données avant chaque test
  await global.cleanupTestDatabase();
});

afterEach(async () => {
  // Nettoyer après chaque test
  jest.clearAllMocks();
});


