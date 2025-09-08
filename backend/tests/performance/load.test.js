const request = require('supertest');
const app = require('../../server');
const { User, Organization } = require('../../models');
const bcrypt = require('bcryptjs');

describe('Performance Tests', () => {
  let testUsers = [];
  let testOrganizations = [];
  let authTokens = [];

  beforeAll(async () => {
    // Créer des données de test pour les tests de performance
    for (let i = 0; i < 10; i++) {
      const organization = await Organization.create({
        name: `Test Organization ${i}`,
        slug: `test-org-${i}`,
        subscription_plan: 'trial',
        subscription_status: 'active',
        max_users: 10,
        max_missions: 20,
        max_storage_gb: 5,
      });
      testOrganizations.push(organization);

      const hashedPassword = await bcrypt.hash('testpassword123', 12);
      const user = await User.create({
        name: `Test User ${i}`,
        email: `test${i}@example.com`,
        password_hash: hashedPassword,
        role: 'auditor_senior',
        organization_id: organization.id,
        status: 'active',
      });
      testUsers.push(user);

      // Obtenir un token d'authentification
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: `test${i}@example.com`,
          password: 'testpassword123',
        });

      authTokens.push(loginResponse.body.token);
    }
  });

  afterAll(async () => {
    // Nettoyer les données de test
    await User.destroy({ where: { id: testUsers.map(u => u.id) } });
    await Organization.destroy({ where: { id: testOrganizations.map(o => o.id) } });
  });

  describe('Concurrent User Load', () => {
    it('should handle 50 concurrent users', async () => {
      const startTime = Date.now();
      const concurrentRequests = 50;
      const requests = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const token = authTokens[i % authTokens.length];
        requests.push(
          request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`)
        );
      }

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Vérifier que toutes les requêtes ont réussi
      const successfulRequests = responses.filter(r => r.status === 200);
      const successRate = (successfulRequests.length / concurrentRequests) * 100;

      console.log(`Concurrent users test: ${successfulRequests.length}/${concurrentRequests} successful (${successRate.toFixed(2)}%)`);
      console.log(`Average response time: ${(duration / concurrentRequests).toFixed(2)}ms`);

      expect(successRate).toBeGreaterThan(95); // Au moins 95% de succès
      expect(duration / concurrentRequests).toBeLessThan(1000); // Moins de 1 seconde en moyenne
    });

    it('should handle burst requests', async () => {
      const startTime = Date.now();
      const burstSize = 100;
      const requests = [];

      // Créer une rafale de requêtes
      for (let i = 0; i < burstSize; i++) {
        const token = authTokens[i % authTokens.length];
        requests.push(
          request(app)
            .get('/health')
            .timeout(5000)
        );
      }

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successfulRequests = responses.filter(r => r.status === 200);
      const successRate = (successfulRequests.length / burstSize) * 100;

      console.log(`Burst test: ${successfulRequests.length}/${burstSize} successful (${successRate.toFixed(2)}%)`);
      console.log(`Total duration: ${duration}ms`);

      expect(successRate).toBeGreaterThan(90); // Au moins 90% de succès
      expect(duration).toBeLessThan(10000); // Moins de 10 secondes total
    });
  });

  describe('Database Performance', () => {
    it('should handle multiple database queries efficiently', async () => {
      const startTime = Date.now();
      const queryCount = 100;
      const requests = [];

      for (let i = 0; i < queryCount; i++) {
        const token = authTokens[i % authTokens.length];
        requests.push(
          request(app)
            .get('/api/organizations')
            .set('Authorization', `Bearer ${token}`)
        );
      }

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successfulRequests = responses.filter(r => r.status === 200);
      const successRate = (successfulRequests.length / queryCount) * 100;

      console.log(`Database performance test: ${successfulRequests.length}/${queryCount} successful (${successRate.toFixed(2)}%)`);
      console.log(`Average query time: ${(duration / queryCount).toFixed(2)}ms`);

      expect(successRate).toBeGreaterThan(95);
      expect(duration / queryCount).toBeLessThan(500); // Moins de 500ms en moyenne
    });

    it('should handle complex queries with joins', async () => {
      const startTime = Date.now();
      const queryCount = 50;
      const requests = [];

      for (let i = 0; i < queryCount; i++) {
        const token = authTokens[i % authTokens.length];
        requests.push(
          request(app)
            .get('/api/missions')
            .set('Authorization', `Bearer ${token}`)
        );
      }

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successfulRequests = responses.filter(r => r.status === 200);
      const successRate = (successfulRequests.length / queryCount) * 100;

      console.log(`Complex query test: ${successfulRequests.length}/${queryCount} successful (${successRate.toFixed(2)}%)`);
      console.log(`Average complex query time: ${(duration / queryCount).toFixed(2)}ms`);

      expect(successRate).toBeGreaterThan(95);
      expect(duration / queryCount).toBeLessThan(1000); // Moins de 1 seconde en moyenne
    });
  });

  describe('Memory Usage', () => {
    it('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      const requests = [];

      // Effectuer 200 requêtes pour tester l'utilisation mémoire
      for (let i = 0; i < 200; i++) {
        const token = authTokens[i % authTokens.length];
        requests.push(
          request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`)
        );
      }

      await Promise.all(requests);

      // Forcer le garbage collection si disponible
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = {
        rss: finalMemory.rss - initialMemory.rss,
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
      };

      console.log('Memory usage test:');
      console.log(`RSS increase: ${(memoryIncrease.rss / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Heap used increase: ${(memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Heap total increase: ${(memoryIncrease.heapTotal / 1024 / 1024).toFixed(2)}MB`);

      // Vérifier que l'augmentation mémoire est raisonnable
      expect(memoryIncrease.heapUsed / 1024 / 1024).toBeLessThan(50); // Moins de 50MB d'augmentation
    });
  });

  describe('Response Time Consistency', () => {
    it('should maintain consistent response times', async () => {
      const responseTimes = [];
      const requestCount = 50;

      for (let i = 0; i < requestCount; i++) {
        const token = authTokens[i % authTokens.length];
        const startTime = Date.now();
        
        await request(app)
          .get('/health')
          .set('Authorization', `Bearer ${token}`);

        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      const variance = responseTimes.reduce((acc, time) => acc + Math.pow(time - avgResponseTime, 2), 0) / responseTimes.length;
      const standardDeviation = Math.sqrt(variance);

      console.log('Response time consistency test:');
      console.log(`Average: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Min: ${minResponseTime}ms`);
      console.log(`Max: ${maxResponseTime}ms`);
      console.log(`Standard deviation: ${standardDeviation.toFixed(2)}ms`);

      // Vérifier la cohérence des temps de réponse
      expect(standardDeviation).toBeLessThan(avgResponseTime * 0.5); // Écart-type < 50% de la moyenne
      expect(maxResponseTime - minResponseTime).toBeLessThan(avgResponseTime * 2); // Écart max < 2x la moyenne
    });
  });

  describe('Error Rate Under Load', () => {
    it('should maintain low error rate under stress', async () => {
      const startTime = Date.now();
      const stressRequests = 200;
      const requests = [];

      // Mélanger différents types de requêtes pour simuler un trafic réel
      for (let i = 0; i < stressRequests; i++) {
        const token = authTokens[i % authTokens.length];
        const requestType = i % 4;

        switch (requestType) {
          case 0:
            requests.push(
              request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`)
            );
            break;
          case 1:
            requests.push(
              request(app)
                .get('/health')
            );
            break;
          case 2:
            requests.push(
              request(app)
                .get('/api/organizations')
                .set('Authorization', `Bearer ${token}`)
            );
            break;
          case 3:
            requests.push(
              request(app)
                .get('/metrics')
            );
            break;
        }
      }

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successfulRequests = responses.filter(r => r.status < 400);
      const errorRequests = responses.filter(r => r.status >= 400);
      const errorRate = (errorRequests.length / stressRequests) * 100;

      console.log('Error rate under load test:');
      console.log(`Total requests: ${stressRequests}`);
      console.log(`Successful: ${successfulRequests.length}`);
      console.log(`Errors: ${errorRequests.length}`);
      console.log(`Error rate: ${errorRate.toFixed(2)}%`);
      console.log(`Total duration: ${duration}ms`);
      console.log(`Requests per second: ${(stressRequests / (duration / 1000)).toFixed(2)}`);

      // Vérifier que le taux d'erreur reste bas
      expect(errorRate).toBeLessThan(5); // Moins de 5% d'erreurs
      expect(successfulRequests.length).toBeGreaterThan(stressRequests * 0.95); // Au moins 95% de succès
    });
  });
});


