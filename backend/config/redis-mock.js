// Mock Redis pour le développement sans Redis installé
class MockRedis {
  constructor() {
    this.data = new Map();
    this.connected = true;
  }

  async get(key) {
    return this.data.get(key) || null;
  }

  async set(key, value, ttl = null) {
    this.data.set(key, value);
    if (ttl) {
      setTimeout(() => {
        this.data.delete(key);
      }, ttl * 1000);
    }
    return 'OK';
  }

  async del(key) {
    return this.data.delete(key) ? 1 : 0;
  }

  async exists(key) {
    return this.data.has(key) ? 1 : 0;
  }

  async keys(pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.data.keys()).filter(key => regex.test(key));
  }

  async flushall() {
    this.data.clear();
    return 'OK';
  }

  async ping() {
    return 'PONG';
  }

  async quit() {
    this.connected = false;
    return 'OK';
  }

  // Méthodes pour Bull Queue
  async sadd(key, ...members) {
    if (!this.data.has(key)) {
      this.data.set(key, new Set());
    }
    const set = this.data.get(key);
    members.forEach(member => set.add(member));
    return members.length;
  }

  async srem(key, ...members) {
    if (!this.data.has(key)) return 0;
    const set = this.data.get(key);
    let removed = 0;
    members.forEach(member => {
      if (set.has(member)) {
        set.delete(member);
        removed++;
      }
    });
    return removed;
  }

  async smembers(key) {
    if (!this.data.has(key)) return [];
    return Array.from(this.data.get(key));
  }

  async lpush(key, ...values) {
    if (!this.data.has(key)) {
      this.data.set(key, []);
    }
    const list = this.data.get(key);
    values.reverse().forEach(value => list.unshift(value));
    return list.length;
  }

  async rpop(key) {
    if (!this.data.has(key)) return null;
    const list = this.data.get(key);
    return list.pop() || null;
  }

  async llen(key) {
    if (!this.data.has(key)) return 0;
    return this.data.get(key).length;
  }

  async hset(key, field, value) {
    if (!this.data.has(key)) {
      this.data.set(key, new Map());
    }
    const hash = this.data.get(key);
    hash.set(field, value);
    return 1;
  }

  async hget(key, field) {
    if (!this.data.has(key)) return null;
    const hash = this.data.get(key);
    return hash.get(field) || null;
  }

  async hgetall(key) {
    if (!this.data.has(key)) return {};
    const hash = this.data.get(key);
    const result = {};
    for (const [field, value] of hash) {
      result[field] = value;
    }
    return result;
  }

  async hdel(key, ...fields) {
    if (!this.data.has(key)) return 0;
    const hash = this.data.get(key);
    let deleted = 0;
    fields.forEach(field => {
      if (hash.has(field)) {
        hash.delete(field);
        deleted++;
      }
    });
    return deleted;
  }

  async expire(key, seconds) {
    if (!this.data.has(key)) return 0;
    setTimeout(() => {
      this.data.delete(key);
    }, seconds * 1000);
    return 1;
  }

  async ttl(key) {
    return this.data.has(key) ? -1 : -2;
  }
}

// Instance singleton
const mockRedis = new MockRedis();

// Interface compatible avec ioredis
const mockRedisClient = {
  get: mockRedis.get.bind(mockRedis),
  set: mockRedis.set.bind(mockRedis),
  del: mockRedis.del.bind(mockRedis),
  exists: mockRedis.exists.bind(mockRedis),
  keys: mockRedis.keys.bind(mockRedis),
  flushall: mockRedis.flushall.bind(mockRedis),
  ping: mockRedis.ping.bind(mockRedis),
  quit: mockRedis.quit.bind(mockRedis),
  sadd: mockRedis.sadd.bind(mockRedis),
  srem: mockRedis.srem.bind(mockRedis),
  smembers: mockRedis.smembers.bind(mockRedis),
  lpush: mockRedis.lpush.bind(mockRedis),
  rpop: mockRedis.rpop.bind(mockRedis),
  llen: mockRedis.llen.bind(mockRedis),
  hset: mockRedis.hset.bind(mockRedis),
  hget: mockRedis.hget.bind(mockRedis),
  hgetall: mockRedis.hgetall.bind(mockRedis),
  hdel: mockRedis.hdel.bind(mockRedis),
  expire: mockRedis.expire.bind(mockRedis),
  ttl: mockRedis.ttl.bind(mockRedis)
};

module.exports = {
  cache: mockRedis,
  client: mockRedisClient,
  connect: async () => {
    console.log('✅ Mock Redis connecté (mode développement)');
    return true;
  }
};
