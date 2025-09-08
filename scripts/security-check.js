#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔒 Vérification de sécurité E-DEFENCE Audit Platform');
console.log('===================================================\n');

function log(message, color = 'reset') {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Vérifications de sécurité
const securityChecks = {
  checkEnvironmentVariables: () => {
    log('🔍 Vérification des variables d\'environnement...', 'blue');
    
    const envFile = path.join(__dirname, '..', 'backend', '.env');
    const envExampleFile = path.join(__dirname, '..', 'backend', 'env.example');
    
    if (!fs.existsSync(envFile)) {
      log('⚠️  Fichier .env non trouvé', 'yellow');
      log('   Exécutez: node scripts/generate-secrets.js', 'blue');
      return false;
    }
    
    if (!fs.existsSync(envExampleFile)) {
      log('⚠️  Fichier env.example non trouvé', 'yellow');
      return false;
    }
    
    log('✅ Variables d\'environnement configurées', 'green');
    return true;
  },
  
  checkSecurityConfig: () => {
    log('🔍 Vérification de la configuration de sécurité...', 'blue');
    
    const securityFiles = [
      path.join(__dirname, '..', 'backend', 'config', 'logger.js'),
      path.join(__dirname, '..', 'backend', 'middleware', 'validation.js'),
      path.join(__dirname, '..', 'backend', 'middleware', 'errorHandler.js')
    ];
    
    let missingFiles = 0;
    securityFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        log(`❌ Fichier manquant: ${file}`, 'red');
        missingFiles++;
      }
    });
    
    if (missingFiles === 0) {
      log('✅ Configuration de sécurité correcte', 'green');
    }
    
    return missingFiles === 0;
  },
  
  checkDependencies: () => {
    log('🔍 Vérification des dépendances...', 'blue');
    
    const packageFile = path.join(__dirname, '..', 'backend', 'package.json');
    
    if (fs.existsSync(packageFile)) {
      const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      const requiredDeps = ['winston', 'express-validator', 'helmet', 'express-rate-limit'];
      let missingDeps = 0;
      
      requiredDeps.forEach(dep => {
        if (!deps[dep]) {
          log(`❌ Dépendance manquante: ${dep}`, 'red');
          missingDeps++;
        }
      });
      
      if (missingDeps === 0) {
        log('✅ Dépendances de sécurité installées', 'green');
      }
      
      return missingDeps === 0;
    }
    
    return false;
  }
};

// Exécution des vérifications
async function runSecurityChecks() {
  const results = [];
  
  for (const [name, check] of Object.entries(securityChecks)) {
    try {
      const result = check();
      results.push({ name, passed: result });
    } catch (error) {
      log(`❌ Erreur lors de la vérification ${name}: ${error.message}`, 'red');
      results.push({ name, passed: false });
    }
  }
  
  // Résumé
  console.log('\n📊 RÉSUMÉ DE SÉCURITÉ');
  console.log('=====================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    log(`${status} ${result.name}`, result.passed ? 'green' : 'red');
  });
  
  console.log(`\nScore de sécurité: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    log('\n🎉 Toutes les vérifications de sécurité sont passées !', 'green');
  } else {
    log('\n⚠️  Des problèmes de sécurité ont été détectés. Veuillez les corriger.', 'yellow');
  }
  
  return passed === total;
}

// Exécution
if (require.main === module) {
  runSecurityChecks().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runSecurityChecks };
