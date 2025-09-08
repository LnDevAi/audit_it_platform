const net = require('net');
const { exec } = require('child_process');
const { promisify } = require('util');
const { logger } = require('../config/logger');

const execAsync = promisify(exec);

class PortManagerService {
  constructor() {
    this.defaultPorts = {
      database: 3306,
      redis: 6379,
      phpmyadmin: 8081,
      backend: 5000,
      frontend: 3000,
      metrics: 9090
    };
    
    this.portRanges = {
      database: [3306, 3307, 3308, 3309, 3310],
      redis: [6379, 6380, 6381, 6382, 6383],
      phpmyadmin: [8081, 8082, 8083, 8084, 8085],
      backend: [5000, 5001, 5002, 5003, 5004],
      frontend: [3000, 3001, 3002, 3003, 3004],
      metrics: [9090, 9091, 9092, 9093, 9094]
    };
    
    this.portConfig = new Map();
    this.loadPortConfig();
  }

  /**
   * Charge la configuration des ports depuis le fichier
   */
  loadPortConfig() {
    try {
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(__dirname, '../../config/ports.json');
      
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this.portConfig = new Map(Object.entries(config));
        logger.info('Configuration des ports chargée');
      } else {
        // Configuration par défaut
        this.portConfig = new Map(Object.entries(this.defaultPorts));
        this.savePortConfig();
      }
    } catch (error) {
      logger.error('Erreur chargement configuration ports:', error);
      this.portConfig = new Map(Object.entries(this.defaultPorts));
    }
  }

  /**
   * Sauvegarde la configuration des ports
   */
  savePortConfig() {
    try {
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(__dirname, '../../config/ports.json');
      const configDir = path.dirname(configPath);
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const config = Object.fromEntries(this.portConfig);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      logger.info('Configuration des ports sauvegardée');
    } catch (error) {
      logger.error('Erreur sauvegarde configuration ports:', error);
    }
  }

  /**
   * Vérifie si un port est disponible
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => {
          resolve(true);
        });
        server.close();
      });
      
      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Trouve un port disponible dans une plage
   */
  async findAvailablePort(service) {
    const portRange = this.portRanges[service] || [this.defaultPorts[service]];
    
    for (const port of portRange) {
      const isAvailable = await this.isPortAvailable(port);
      if (isAvailable) {
        return port;
      }
    }
    
    throw new Error(`Aucun port disponible pour le service ${service}`);
  }

  /**
   * Obtient le port configuré pour un service
   */
  getPort(service) {
    return this.portConfig.get(service) || this.defaultPorts[service];
  }

  /**
   * Configure un port pour un service
   */
  async setPort(service, port) {
    const isAvailable = await this.isPortAvailable(port);
    if (!isAvailable) {
      throw new Error(`Le port ${port} n'est pas disponible`);
    }
    
    this.portConfig.set(service, port);
    this.savePortConfig();
    
    logger.info(`Port ${port} configuré pour le service ${service}`);
    return port;
  }

  /**
   * Configure automatiquement tous les ports
   */
  async autoConfigurePorts() {
    const results = {};
    
    for (const [service, defaultPort] of Object.entries(this.defaultPorts)) {
      try {
        const currentPort = this.portConfig.get(service);
        const isCurrentPortAvailable = currentPort ? await this.isPortAvailable(currentPort) : false;
        
        if (isCurrentPortAvailable) {
          results[service] = {
            port: currentPort,
            status: 'available',
            action: 'kept'
          };
        } else {
          const newPort = await this.findAvailablePort(service);
          await this.setPort(service, newPort);
          results[service] = {
            port: newPort,
            status: 'configured',
            action: 'changed'
          };
        }
      } catch (error) {
        results[service] = {
          port: null,
          status: 'error',
          action: 'failed',
          error: error.message
        };
        logger.error(`Erreur configuration port ${service}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Vérifie l'état de tous les ports
   */
  async checkAllPorts() {
    const results = {};
    
    for (const [service, port] of this.portConfig) {
      const isAvailable = await this.isPortAvailable(port);
      results[service] = {
        port: port,
        available: isAvailable,
        status: isAvailable ? 'available' : 'occupied'
      };
    }
    
    return results;
  }

  /**
   * Résout les conflits de ports
   */
  async resolvePortConflicts() {
    const conflicts = [];
    const results = {};
    
    // Vérifier tous les ports
    for (const [service, port] of this.portConfig) {
      const isAvailable = await this.isPortAvailable(port);
      if (!isAvailable) {
        conflicts.push({ service, port });
      }
    }
    
    if (conflicts.length === 0) {
      return { message: 'Aucun conflit de port détecté', conflicts: [] };
    }
    
    // Résoudre les conflits
    for (const conflict of conflicts) {
      try {
        const newPort = await this.findAvailablePort(conflict.service);
        await this.setPort(conflict.service, newPort);
        results[conflict.service] = {
          oldPort: conflict.port,
          newPort: newPort,
          resolved: true
        };
      } catch (error) {
        results[conflict.service] = {
          oldPort: conflict.port,
          newPort: null,
          resolved: false,
          error: error.message
        };
      }
    }
    
    return {
      message: `${conflicts.length} conflit(s) détecté(s) et résolu(s)`,
      conflicts: conflicts,
      resolutions: results
    };
  }

  /**
   * Restaure les ports par défaut
   */
  async restoreDefaultPorts() {
    const results = {};
    
    for (const [service, defaultPort] of Object.entries(this.defaultPorts)) {
      try {
        const isAvailable = await this.isPortAvailable(defaultPort);
        if (isAvailable) {
          await this.setPort(service, defaultPort);
          results[service] = {
            port: defaultPort,
            status: 'restored'
          };
        } else {
          // Trouver un port alternatif
          const alternativePort = await this.findAvailablePort(service);
          await this.setPort(service, alternativePort);
          results[service] = {
            port: alternativePort,
            status: 'alternative',
            note: `Port par défaut ${defaultPort} occupé, port alternatif ${alternativePort} utilisé`
          };
        }
      } catch (error) {
        results[service] = {
          port: null,
          status: 'error',
          error: error.message
        };
      }
    }
    
    return results;
  }

  /**
   * Obtient les processus utilisant un port
   */
  async getPortProcesses(port) {
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.split('\n').filter(line => line.trim());
      
      const processes = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          protocol: parts[0],
          localAddress: parts[1],
          foreignAddress: parts[2],
          state: parts[3],
          pid: parts[4]
        };
      });
      
      return processes;
    } catch (error) {
      logger.error(`Erreur récupération processus port ${port}:`, error);
      return [];
    }
  }

  /**
   * Obtient les statistiques des ports
   */
  async getPortStats() {
    const stats = {
      totalServices: this.portConfig.size,
      availablePorts: 0,
      occupiedPorts: 0,
      services: {}
    };
    
    for (const [service, port] of this.portConfig) {
      const isAvailable = await this.isPortAvailable(port);
      const processes = await this.getPortProcesses(port);
      
      stats.services[service] = {
        port: port,
        available: isAvailable,
        processes: processes.length,
        processList: processes
      };
      
      if (isAvailable) {
        stats.availablePorts++;
      } else {
        stats.occupiedPorts++;
      }
    }
    
    return stats;
  }

  /**
   * Met à jour les variables d'environnement avec les nouveaux ports
   */
  updateEnvironmentVariables() {
    const envUpdates = {};
    
    for (const [service, port] of this.portConfig) {
      switch (service) {
        case 'database':
          envUpdates.DB_PORT = port;
          break;
        case 'redis':
          envUpdates.REDIS_PORT = port;
          break;
        case 'backend':
          envUpdates.PORT = port;
          break;
        case 'frontend':
          envUpdates.FRONTEND_PORT = port;
          break;
        case 'metrics':
          envUpdates.METRICS_PORT = port;
          break;
      }
    }
    
    // Mettre à jour les variables d'environnement
    for (const [key, value] of Object.entries(envUpdates)) {
      process.env[key] = value.toString();
    }
    
    logger.info('Variables d\'environnement mises à jour avec les nouveaux ports');
    return envUpdates;
  }
}

// Instance singleton
const portManagerService = new PortManagerService();

module.exports = portManagerService;
