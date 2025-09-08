#!/usr/bin/env node

/**
 * Script de configuration automatique des ports
 * E-DEFENCE Audit Platform
 */

const portManagerService = require('../services/portManagerService');
const { logger } = require('../config/logger');

async function autoConfigurePorts() {
  try {
    console.log('🔧 Configuration automatique des ports...');
    
    // Configuration automatique de tous les ports
    const results = await portManagerService.autoConfigurePorts();
    
    console.log('\n📊 Résultats de la configuration:');
    console.log('=====================================');
    
    for (const [service, result] of Object.entries(results)) {
      const status = result.status === 'available' ? '✅' : 
                    result.status === 'configured' ? '🔄' : '❌';
      
      console.log(`${status} ${service}: Port ${result.port} (${result.action})`);
      
      if (result.error) {
        console.log(`   ⚠️  Erreur: ${result.error}`);
      }
    }
    
    // Mise à jour des variables d'environnement
    console.log('\n🔧 Mise à jour des variables d\'environnement...');
    const envUpdates = portManagerService.updateEnvironmentVariables();
    
    console.log('\n📝 Variables d\'environnement mises à jour:');
    for (const [key, value] of Object.entries(envUpdates)) {
      console.log(`   ${key}=${value}`);
    }
    
    // Vérification finale
    console.log('\n🔍 Vérification finale des ports...');
    const finalStatus = await portManagerService.checkAllPorts();
    
    console.log('\n📋 État final des ports:');
    console.log('========================');
    
    for (const [service, status] of Object.entries(finalStatus)) {
      const icon = status.available ? '✅' : '❌';
      console.log(`${icon} ${service}: Port ${status.port} (${status.status})`);
    }
    
    // Statistiques
    const stats = await portManagerService.getPortStats();
    console.log('\n📊 Statistiques:');
    console.log('================');
    console.log(`   Services configurés: ${stats.totalServices}`);
    console.log(`   Ports disponibles: ${stats.availablePorts}`);
    console.log(`   Ports occupés: ${stats.occupiedPorts}`);
    
    if (stats.occupiedPorts > 0) {
      console.log('\n⚠️  Ports occupés détectés:');
      for (const [service, serviceStats] of Object.entries(stats.services)) {
        if (!serviceStats.available) {
          console.log(`   ${service}: Port ${serviceStats.port} (${serviceStats.processes} processus)`);
        }
      }
    }
    
    console.log('\n✅ Configuration automatique terminée avec succès!');
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la configuration automatique:', error);
    process.exit(1);
  }
}

async function resolveConflicts() {
  try {
    console.log('🔧 Résolution des conflits de ports...');
    
    const results = await portManagerService.resolvePortConflicts();
    
    if (results.conflicts.length === 0) {
      console.log('✅ Aucun conflit de port détecté');
      return;
    }
    
    console.log(`\n🔍 ${results.conflicts.length} conflit(s) détecté(s):`);
    for (const conflict of results.conflicts) {
      console.log(`   ${conflict.service}: Port ${conflict.port} occupé`);
    }
    
    console.log('\n🔄 Résolution des conflits:');
    for (const [service, resolution] of Object.entries(results.resolutions)) {
      if (resolution.resolved) {
        console.log(`   ✅ ${service}: Port ${resolution.oldPort} → ${resolution.newPort}`);
      } else {
        console.log(`   ❌ ${service}: Échec - ${resolution.error}`);
      }
    }
    
    // Mise à jour des variables d'environnement
    const envUpdates = portManagerService.updateEnvironmentVariables();
    console.log('\n📝 Variables d\'environnement mises à jour');
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la résolution des conflits:', error);
    process.exit(1);
  }
}

async function showStatus() {
  try {
    console.log('📊 État des ports:');
    console.log('==================');
    
    const status = await portManagerService.checkAllPorts();
    
    for (const [service, serviceStatus] of Object.entries(status)) {
      const icon = serviceStatus.available ? '✅' : '❌';
      console.log(`${icon} ${service}: Port ${serviceStatus.port} (${serviceStatus.status})`);
    }
    
    const stats = await portManagerService.getPortStats();
    console.log('\n📈 Statistiques:');
    console.log(`   Total: ${stats.totalServices} services`);
    console.log(`   Disponibles: ${stats.availablePorts}`);
    console.log(`   Occupés: ${stats.occupiedPorts}`);
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la récupération du statut:', error);
    process.exit(1);
  }
}

async function restoreDefaults() {
  try {
    console.log('🔄 Restauration des ports par défaut...');
    
    const results = await portManagerService.restoreDefaultPorts();
    
    console.log('\n📊 Résultats de la restauration:');
    for (const [service, result] of Object.entries(results)) {
      const icon = result.status === 'restored' ? '✅' : 
                  result.status === 'alternative' ? '🔄' : '❌';
      
      console.log(`${icon} ${service}: Port ${result.port} (${result.status})`);
      
      if (result.note) {
        console.log(`   📝 ${result.note}`);
      }
      
      if (result.error) {
        console.log(`   ⚠️  Erreur: ${result.error}`);
      }
    }
    
    // Mise à jour des variables d'environnement
    const envUpdates = portManagerService.updateEnvironmentVariables();
    console.log('\n📝 Variables d\'environnement mises à jour');
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la restauration:', error);
    process.exit(1);
  }
}

// Gestion des arguments de ligne de commande
const command = process.argv[2];

switch (command) {
  case 'configure':
  case 'auto':
    autoConfigurePorts();
    break;
    
  case 'resolve':
  case 'conflicts':
    resolveConflicts();
    break;
    
  case 'status':
    showStatus();
    break;
    
  case 'restore':
  case 'defaults':
    restoreDefaults();
    break;
    
  default:
    console.log('🔧 Gestionnaire de ports E-DEFENCE Audit Platform');
    console.log('==================================================');
    console.log('');
    console.log('Usage: node auto-configure-ports.js <command>');
    console.log('');
    console.log('Commandes disponibles:');
    console.log('  configure, auto  - Configuration automatique des ports');
    console.log('  resolve, conflicts - Résolution des conflits de ports');
    console.log('  status          - Afficher l\'état des ports');
    console.log('  restore, defaults - Restaurer les ports par défaut');
    console.log('');
    console.log('Exemples:');
    console.log('  node auto-configure-ports.js configure');
    console.log('  node auto-configure-ports.js status');
    console.log('  node auto-configure-ports.js resolve');
    break;
}
