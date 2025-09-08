const redis = require('redis');
const { logger } = require('./logger');
require('dotenv').config();

// Détection automatique du mode Redis
const useMockRedis = process.env.USE_MOCK_REDIS === 'true' || !process.env.REDIS_HOST;

if (useMockRedis) {
  // Utiliser le mock Redis pour le développement
  const mockRedis = require('./redis-mock');
  module.exports = mockRedis;
} else {

// Configuration Redis
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
  db: process.env.REDIS_DB || 0,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      logger.error('Redis server refused connection');
      return new Error('Redis server refused connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      logger.error('Redis retry time exhausted');
      return new Error('Redis retry time exhausted');
    }
    if (options.attempt > 10) {
      logger.error('Redis max retry attempts reached');
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true
};

// Création du client Redis
const client = redis.createClient(redisConfig);

// Gestion des événements Redis
client.on('connect', () => {
  logger.info('Redis client connected');
});

client.on('ready', () => {
  logger.info('Redis client ready');
});

client.on('error', (err) => {
  logger.error('Redis client error:', err);
});

client.on('end', () => {
  logger.info('Redis client disconnected');
});

client.on('reconnecting', () => {
  logger.info('Redis client reconnecting...');
});

// Fonctions utilitaires pour le cache
const cache = {
  // Définir une valeur avec expiration
  async set(key, value, ttl = 3600) {
    try {
      const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
      await client.setEx(key, ttl, serializedValue);
      logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error('Cache SET error:', error);
      return false;
    }
  },

  // Récupérer une valeur
  async get(key) {
    try {
      const value = await client.get(key);
      if (value) {
        logger.debug(`Cache HIT: ${key}`);
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error('Cache GET error:', error);
      return null;
    }
  },

  // Supprimer une clé
  async del(key) {
    try {
      await client.del(key);
      logger.debug(`Cache DEL: ${key}`);
      return true;
    } catch (error) {
      logger.error('Cache DEL error:', error);
      return false;
    }
  },

  // Supprimer plusieurs clés par pattern
  async delPattern(pattern) {
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
        logger.debug(`Cache DEL pattern: ${pattern} (${keys.length} keys)`);
      }
      return keys.length;
    } catch (error) {
      logger.error('Cache DEL pattern error:', error);
      return 0;
    }
  },

  // Vérifier si une clé existe
  async exists(key) {
    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache EXISTS error:', error);
      return false;
    }
  },

  // Incrémenter une valeur
  async incr(key) {
    try {
      return await client.incr(key);
    } catch (error) {
      logger.error('Cache INCR error:', error);
      return null;
    }
  },

  // Définir une expiration
  async expire(key, ttl) {
    try {
      return await client.expire(key, ttl);
    } catch (error) {
      logger.error('Cache EXPIRE error:', error);
      return false;
    }
  },

  // Obtenir le TTL restant
  async ttl(key) {
    try {
      return await client.ttl(key);
    } catch (error) {
      logger.error('Cache TTL error:', error);
      return -1;
    }
  },

  // Vider tout le cache
  async flush() {
    try {
      await client.flushDb();
      logger.info('Cache flushed');
      return true;
    } catch (error) {
      logger.error('Cache FLUSH error:', error);
      return false;
    }
  },

  // Statistiques du cache
  async stats() {
    try {
      const info = await client.info('stats');
      const keyspace = await client.info('keyspace');
      return { info, keyspace };
    } catch (error) {
      logger.error('Cache STATS error:', error);
      return null;
    }
  }
};

// Middleware de cache pour Express
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await cache.get(key);
      if (cached) {
        return res.json(cached);
      }

      // Intercepter la réponse pour la mettre en cache
      const originalSend = res.json;
      res.json = function(data) {
        cache.set(key, data, ttl);
        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

// Connexion au client Redis
const connect = async () => {
  try {
    await client.connect();
    logger.info('Redis connected successfully');
    return true;
  } catch (error) {
    logger.error('Redis connection failed:', error);
    return false;
  }
};

// Déconnexion du client Redis
const disconnect = async () => {
  try {
    await client.quit();
    logger.info('Redis disconnected');
  } catch (error) {
    logger.error('Redis disconnect error:', error);
  }
};

  module.exports = {
    client,
    cache,
    cacheMiddleware,
    connect,
    disconnect
  };
}


