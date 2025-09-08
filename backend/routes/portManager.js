const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const portManagerService = require('../services/portManagerService');
const { logger } = require('../config/logger');
const router = express.Router();

/**
 * @route GET /api/ports/status
 * @desc Vérifier l'état de tous les ports
 * @access Private - Admin
 */
router.get('/status', authenticateToken, requireRole(['super_admin', 'org_admin']), async (req, res) => {
  try {
    const portStatus = await portManagerService.checkAllPorts();
    
    res.json({
      message: 'État des ports récupéré',
      ports: portStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erreur vérification ports:', error);
    res.status(500).json({
      error: 'Erreur lors de la vérification des ports'
    });
  }
});

/**
 * @route POST /api/ports/auto-configure
 * @desc Configuration automatique de tous les ports
 * @access Private - Super Admin
 */
router.post('/auto-configure', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const results = await portManagerService.autoConfigurePorts();
    const envUpdates = portManagerService.updateEnvironmentVariables();
    
    res.json({
      message: 'Configuration automatique des ports terminée',
      results: results,
      environmentUpdates: envUpdates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erreur configuration automatique ports:', error);
    res.status(500).json({
      error: 'Erreur lors de la configuration automatique des ports'
    });
  }
});

/**
 * @route POST /api/ports/resolve-conflicts
 * @desc Résoudre les conflits de ports
 * @access Private - Super Admin
 */
router.post('/resolve-conflicts', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const results = await portManagerService.resolvePortConflicts();
    const envUpdates = portManagerService.updateEnvironmentVariables();
    
    res.json({
      message: results.message,
      conflicts: results.conflicts,
      resolutions: results.resolutions,
      environmentUpdates: envUpdates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erreur résolution conflits ports:', error);
    res.status(500).json({
      error: 'Erreur lors de la résolution des conflits de ports'
    });
  }
});

/**
 * @route POST /api/ports/restore-defaults
 * @desc Restaurer les ports par défaut
 * @access Private - Super Admin
 */
router.post('/restore-defaults', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const results = await portManagerService.restoreDefaultPorts();
    const envUpdates = portManagerService.updateEnvironmentVariables();
    
    res.json({
      message: 'Ports par défaut restaurés',
      results: results,
      environmentUpdates: envUpdates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erreur restauration ports par défaut:', error);
    res.status(500).json({
      error: 'Erreur lors de la restauration des ports par défaut'
    });
  }
});

/**
 * @route PUT /api/ports/:service
 * @desc Configurer un port spécifique pour un service
 * @access Private - Super Admin
 */
router.put('/:service', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { service } = req.params;
    const { port } = req.body;
    
    if (!port || isNaN(port) || port < 1024 || port > 65535) {
      return res.status(400).json({
        error: 'Port invalide (doit être entre 1024 et 65535)'
      });
    }
    
    const newPort = await portManagerService.setPort(service, parseInt(port));
    const envUpdates = portManagerService.updateEnvironmentVariables();
    
    res.json({
      message: `Port ${newPort} configuré pour le service ${service}`,
      service: service,
      port: newPort,
      environmentUpdates: envUpdates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Erreur configuration port ${req.params.service}:`, error);
    res.status(400).json({
      error: error.message || 'Erreur lors de la configuration du port'
    });
  }
});

/**
 * @route GET /api/ports/:service/processes
 * @desc Obtenir les processus utilisant un port
 * @access Private - Admin
 */
router.get('/:service/processes', authenticateToken, requireRole(['super_admin', 'org_admin']), async (req, res) => {
  try {
    const { service } = req.params;
    const port = portManagerService.getPort(service);
    
    if (!port) {
      return res.status(404).json({
        error: `Service ${service} non trouvé`
      });
    }
    
    const processes = await portManagerService.getPortProcesses(port);
    
    res.json({
      service: service,
      port: port,
      processes: processes,
      count: processes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Erreur récupération processus port ${req.params.service}:`, error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des processus'
    });
  }
});

/**
 * @route GET /api/ports/stats
 * @desc Obtenir les statistiques des ports
 * @access Private - Admin
 */
router.get('/stats', authenticateToken, requireRole(['super_admin', 'org_admin']), async (req, res) => {
  try {
    const stats = await portManagerService.getPortStats();
    
    res.json({
      message: 'Statistiques des ports récupérées',
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erreur récupération statistiques ports:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

/**
 * @route GET /api/ports/config
 * @desc Obtenir la configuration actuelle des ports
 * @access Private - Admin
 */
router.get('/config', authenticateToken, requireRole(['super_admin', 'org_admin']), async (req, res) => {
  try {
    const config = Object.fromEntries(portManagerService.portConfig);
    
    res.json({
      message: 'Configuration des ports récupérée',
      config: config,
      defaultPorts: portManagerService.defaultPorts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erreur récupération configuration ports:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la configuration'
    });
  }
});

module.exports = router;
