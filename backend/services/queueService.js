const Queue = require('bull');
const { logger } = require('../config/logger');

class QueueService {
  constructor() {
    this.queues = {};
    this.initializeQueues();
  }

  /**
   * Initialise toutes les queues
   */
  initializeQueues() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: process.env.REDIS_DB || 0
    };

    // Queue pour les imports
    this.queues.imports = new Queue('import processing', { redis: redisConfig });
    
    // Queue pour les exports
    this.queues.exports = new Queue('export processing', { redis: redisConfig });
    
    // Queue pour les emails
    this.queues.emails = new Queue('email sending', { redis: redisConfig });
    
    // Queue pour les scans
    this.queues.scans = new Queue('scan processing', { redis: redisConfig });
    
    // Queue pour les rapports
    this.queues.reports = new Queue('report generation', { redis: redisConfig });

    this.setupQueueProcessors();
    this.setupQueueEvents();
  }

  /**
   * Configure les processeurs de queue
   */
  setupQueueProcessors() {
    // Processeur pour les imports
    this.queues.imports.process('process-import', 5, async (job) => {
      const { importId } = job.data;
      logger.info(`Traitement import ${importId} démarré`);
      
      try {
        const { processImportFile } = require('../routes/imports');
        await processImportFile(importId);
        
        job.progress(100);
        logger.info(`Import ${importId} traité avec succès`);
        return { success: true, importId };
      } catch (error) {
        logger.error(`Erreur traitement import ${importId}:`, error);
        throw error;
      }
    });

    // Processeur pour les exports
    this.queues.exports.process('process-export', 3, async (job) => {
      const { exportId } = job.data;
      logger.info(`Traitement export ${exportId} démarré`);
      
      try {
        const { processExportFile } = require('../routes/exports');
        await processExportFile(exportId);
        
        job.progress(100);
        logger.info(`Export ${exportId} traité avec succès`);
        return { success: true, exportId };
      } catch (error) {
        logger.error(`Erreur traitement export ${exportId}:`, error);
        throw error;
      }
    });

    // Processeur pour les emails
    this.queues.emails.process('send-email', 10, async (job) => {
      const { to, subject, template, data } = job.data;
      logger.info(`Envoi email à ${to} démarré`);
      
      try {
        const EmailService = require('./emailService');
        await EmailService.sendEmail(to, subject, template, data);
        
        job.progress(100);
        logger.info(`Email envoyé avec succès à ${to}`);
        return { success: true, to };
      } catch (error) {
        logger.error(`Erreur envoi email à ${to}:`, error);
        throw error;
      }
    });

    // Processeur pour les scans
    this.queues.scans.process('process-scan', 2, async (job) => {
      const { scanId } = job.data;
      logger.info(`Traitement scan ${scanId} démarré`);
      
      try {
        const ScanService = require('./scanService');
        await ScanService.processScan(scanId);
        
        job.progress(100);
        logger.info(`Scan ${scanId} traité avec succès`);
        return { success: true, scanId };
      } catch (error) {
        logger.error(`Erreur traitement scan ${scanId}:`, error);
        throw error;
      }
    });

    // Processeur pour les rapports
    this.queues.reports.process('generate-report', 1, async (job) => {
      const { reportId } = job.data;
      logger.info(`Génération rapport ${reportId} démarrée`);
      
      try {
        const ReportService = require('./reportService');
        await ReportService.generateReport(reportId);
        
        job.progress(100);
        logger.info(`Rapport ${reportId} généré avec succès`);
        return { success: true, reportId };
      } catch (error) {
        logger.error(`Erreur génération rapport ${reportId}:`, error);
        throw error;
      }
    });
  }

  /**
   * Configure les événements de queue
   */
  setupQueueEvents() {
    Object.keys(this.queues).forEach(queueName => {
      const queue = this.queues[queueName];

      queue.on('completed', (job, result) => {
        logger.info(`Job ${job.id} terminé avec succès dans la queue ${queueName}`);
      });

      queue.on('failed', (job, err) => {
        logger.error(`Job ${job.id} échoué dans la queue ${queueName}:`, err);
      });

      queue.on('stalled', (job) => {
        logger.warn(`Job ${job.id} bloqué dans la queue ${queueName}`);
      });

      queue.on('progress', (job, progress) => {
        logger.info(`Job ${job.id} progression: ${progress}% dans la queue ${queueName}`);
      });
    });
  }

  /**
   * Ajoute un job d'import à la queue
   */
  async addImportJob(importId, priority = 'normal') {
    const job = await this.queues.imports.add('process-import', { importId }, {
      priority: this.getPriorityValue(priority),
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 10,
      removeOnFail: 5
    });

    logger.info(`Job d'import ${importId} ajouté à la queue (ID: ${job.id})`);
    return job;
  }

  /**
   * Ajoute un job d'export à la queue
   */
  async addExportJob(exportId, priority = 'normal') {
    const job = await this.queues.exports.add('process-export', { exportId }, {
      priority: this.getPriorityValue(priority),
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 10,
      removeOnFail: 5
    });

    logger.info(`Job d'export ${exportId} ajouté à la queue (ID: ${job.id})`);
    return job;
  }

  /**
   * Ajoute un job d'email à la queue
   */
  async addEmailJob(to, subject, template, data, priority = 'normal') {
    const job = await this.queues.emails.add('send-email', { to, subject, template, data }, {
      priority: this.getPriorityValue(priority),
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: 50,
      removeOnFail: 10
    });

    logger.info(`Job d'email à ${to} ajouté à la queue (ID: ${job.id})`);
    return job;
  }

  /**
   * Ajoute un job de scan à la queue
   */
  async addScanJob(scanId, priority = 'normal') {
    const job = await this.queues.scans.add('process-scan', { scanId }, {
      priority: this.getPriorityValue(priority),
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: 5,
      removeOnFail: 3
    });

    logger.info(`Job de scan ${scanId} ajouté à la queue (ID: ${job.id})`);
    return job;
  }

  /**
   * Ajoute un job de rapport à la queue
   */
  async addReportJob(reportId, priority = 'normal') {
    const job = await this.queues.reports.add('generate-report', { reportId }, {
      priority: this.getPriorityValue(priority),
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 3000
      },
      removeOnComplete: 5,
      removeOnFail: 3
    });

    logger.info(`Job de rapport ${reportId} ajouté à la queue (ID: ${job.id})`);
    return job;
  }

  /**
   * Obtient les statistiques d'une queue
   */
  async getQueueStats(queueName) {
    if (!this.queues[queueName]) {
      throw new Error(`Queue ${queueName} non trouvée`);
    }

    const queue = this.queues[queueName];
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed()
    ]);

    return {
      name: queueName,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total: waiting.length + active.length + completed.length + failed.length + delayed.length
    };
  }

  /**
   * Obtient les statistiques de toutes les queues
   */
  async getAllQueueStats() {
    const stats = {};
    for (const queueName of Object.keys(this.queues)) {
      stats[queueName] = await this.getQueueStats(queueName);
    }
    return stats;
  }

  /**
   * Nettoie les jobs terminés
   */
  async cleanQueue(queueName, grace = 24 * 60 * 60 * 1000) {
    if (!this.queues[queueName]) {
      throw new Error(`Queue ${queueName} non trouvée`);
    }

    const queue = this.queues[queueName];
    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
    
    logger.info(`Queue ${queueName} nettoyée`);
  }

  /**
   * Nettoie toutes les queues
   */
  async cleanAllQueues(grace = 24 * 60 * 60 * 1000) {
    for (const queueName of Object.keys(this.queues)) {
      await this.cleanQueue(queueName, grace);
    }
  }

  /**
   * Convertit la priorité en valeur numérique
   */
  getPriorityValue(priority) {
    const priorities = {
      'low': 1,
      'normal': 5,
      'high': 10,
      'critical': 20
    };
    return priorities[priority] || 5;
  }

  /**
   * Arrête toutes les queues
   */
  async closeAllQueues() {
    for (const queueName of Object.keys(this.queues)) {
      await this.queues[queueName].close();
    }
    logger.info('Toutes les queues fermées');
  }
}

// Instance singleton
const queueService = new QueueService();

module.exports = queueService;
