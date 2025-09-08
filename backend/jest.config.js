module.exports = {
  // Environnement de test
  testEnvironment: 'node',
  
  // Répertoires de test
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  
  // Répertoires à ignorer
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // Collecte de couverture
  collectCoverage: true,
  collectCoverageFrom: [
    'routes/**/*.js',
    'models/**/*.js',
    'middleware/**/*.js',
    'config/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ],
  
  // Répertoire de couverture
  coverageDirectory: 'coverage',
  
  // Seuils de couverture
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Variables d'environnement pour les tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Timeout pour les tests
  testTimeout: 10000,
  
  // Verbosité
  verbose: true,
  
  // Rapport de couverture
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // Transformations
  transform: {},
  
  // Extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Alias modules (clé correcte)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  
  // Nettoyage automatique
  clearMocks: true,
  
  // Restauration automatique
  restoreMocks: true,
  
  // Isolation des tests (option non supportée retirée)
};


