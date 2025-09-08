const request = require('supertest');
const app = require('../../server');
const { User, Organization, AuditMission } = require('../../models');
const bcrypt = require('bcryptjs');

describe('API Integration Tests', () => {
  let testUser;
  let testOrganization;
  let authToken;

  beforeAll(async () => {
    // Créer une organisation de test
    testOrganization = await Organization.create({
      name: 'Test Organization',
      slug: 'test-org',
      subscription_plan: 'trial',
      subscription_status: 'active',
      max_users: 10,
      max_missions: 20,
      max_storage_gb: 5,
    });

    // Créer un utilisateur de test
    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password_hash: hashedPassword,
      role: 'auditor_senior',
      organization_id: testOrganization.id,
      status: 'active',
    });

    // Obtenir un token d'authentification
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword123',
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Nettoyer les données de test
    await User.destroy({ where: { id: testUser.id } });
    await Organization.destroy({ where: { id: testOrganization.id } });
  });

  describe('Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      // 1. Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword123',
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body).toHaveProperty('user');

      // 2. Get user profile
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.token}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.user.email).toBe('test@example.com');
    });

    it('should handle invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('Organization Management', () => {
    it('should create and manage organizations', async () => {
      // Créer une nouvelle organisation
      const createResponse = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New Test Organization',
          slug: 'new-test-org',
          subscription_plan: 'basic',
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toHaveProperty('id');

      const orgId = createResponse.body.id;

      // Récupérer l'organisation
      const getResponse = await request(app)
        .get(`/api/organizations/${orgId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.name).toBe('New Test Organization');

      // Mettre à jour l'organisation
      const updateResponse = await request(app)
        .put(`/api/organizations/${orgId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Test Organization',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe('Updated Test Organization');

      // Supprimer l'organisation
      const deleteResponse = await request(app)
        .delete(`/api/organizations/${orgId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
    });
  });

  describe('Audit Mission Management', () => {
    let testMission;

    beforeEach(async () => {
      // Créer une mission de test
      testMission = await AuditMission.create({
        name: 'Test Mission',
        client_name: 'Test Client',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours
        status: 'planned',
        organization_id: testOrganization.id,
        created_by: testUser.id,
      });
    });

    afterEach(async () => {
      // Nettoyer la mission de test
      if (testMission) {
        await AuditMission.destroy({ where: { id: testMission.id } });
      }
    });

    it('should manage audit missions', async () => {
      // Créer une mission
      const createResponse = await request(app)
        .post('/api/missions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'API Test Mission',
          client_name: 'API Test Client',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planned',
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toHaveProperty('id');

      const missionId = createResponse.body.id;

      // Récupérer la mission
      const getResponse = await request(app)
        .get(`/api/missions/${missionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.name).toBe('API Test Mission');

      // Mettre à jour la mission
      const updateResponse = await request(app)
        .put(`/api/missions/${missionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'in_progress',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.status).toBe('in_progress');

      // Lister les missions
      const listResponse = await request(app)
        .get('/api/missions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(listResponse.status).toBe(200);
      expect(Array.isArray(listResponse.body)).toBe(true);
      expect(listResponse.body.length).toBeGreaterThan(0);

      // Supprimer la mission
      const deleteResponse = await request(app)
        .delete(`/api/missions/${missionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
    });
  });

  describe('Data Import/Export', () => {
    it('should handle data import operations', async () => {
      const importResponse = await request(app)
        .post('/api/imports')
        .set('Authorization', `Bearer ${authToken}`)
        .field('import_type', 'inventory')
        .attach('file', Buffer.from('test,data,csv'), 'test.csv');

      expect(importResponse.status).toBe(201);
      expect(importResponse.body).toHaveProperty('id');
      expect(importResponse.body.status).toBe('pending');
    });

    it('should handle data export operations', async () => {
      const exportResponse = await request(app)
        .post('/api/exports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          export_type: 'missions',
          file_format: 'excel',
        });

      expect(exportResponse.status).toBe(201);
      expect(exportResponse.body).toHaveProperty('id');
      expect(exportResponse.body.status).toBe('pending');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: '',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle not found errors', async () => {
      const response = await request(app)
        .get('/api/missions/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/organizations')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = Array(110).fill().map(() =>
        request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter(r => r.status === 429);

      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Health Checks', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return detailed health status', async () => {
      const response = await request(app)
        .get('/health/detailed');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('redis');
    });
  });

  describe('Metrics Endpoint', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(app)
        .get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('http_requests_total');
    });
  });
});


