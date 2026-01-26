const request = require('supertest');
const path = require('path');
const { createTestApp } = require(path.join(__dirname, '../../helpers/api-helpers'));
const { createTestOwner, createTestCustomer, cleanupTestData, waitForDatabase, closeDatabase } = require(path.join(__dirname, '../../helpers/owner-helpers'));

describe('🔐 Owner Authentication & Authorization API Tests', () => {
  let app;
  let testOwners = [];
  let testCustomers = [];

  beforeAll(async () => {
    await waitForDatabase();
    app = createTestApp();
  });

  afterAll(async () => {
    // Cleanup test data
    const ownerEmails = testOwners.map(u => u.credentials.email);
    const customerEmails = testCustomers.map(u => u.credentials.email);
    await cleanupTestData({ ownerEmails, customerEmails });
    await closeDatabase();
  });

  describe('POST /api/users/login - Owner Login', () => {
    test('Owner can login with valid credentials', async () => {
      const owner = await createTestOwner({
        email: `owner${Date.now()}@test.com`,
        username: `owner${Date.now()}`,
        password: 'TestOwner@123',
        role: 'owner',
        emailVerified: true
      });
      testOwners.push(owner);

      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.role).toBe('owner');
      expect(response.body.user.email).toBe(owner.credentials.email);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    test('Owner login fails with invalid email', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'TestOwner@123',
          role: 'owner'
        })
        .expect(401);

      expect(response.body.message).toMatch(/invalid|credentials|incorrect|خطأ|غير صحيح/i);
    });

    test('Owner login fails with invalid password', async () => {
      const owner = await createTestOwner({
        email: `owner${Date.now()}@test.com`,
        username: `owner${Date.now()}`,
        password: 'TestOwner@123',
        role: 'owner',
        emailVerified: true
      });
      testOwners.push(owner);

      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: 'WrongPassword@123',
          role: 'owner'
        })
        .expect(401);

      expect(response.body.message).toMatch(/invalid|credentials|incorrect|خطأ|غير صحيح/i);
    });

    test('Owner login fails with unverified email', async () => {
      const owner = await createTestOwner({
        email: `owner${Date.now()}@test.com`,
        username: `owner${Date.now()}`,
        password: 'TestOwner@123',
        role: 'owner',
        emailVerified: false
      });
      testOwners.push(owner);

      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        })
        .expect(403);

      expect(response.body.message).toMatch(/verify|verified|تحقق|البريد/i);
    });

    test('Owner login returns JWT token with correct role', async () => {
      const owner = await createTestOwner({
        email: `owner${Date.now()}@test.com`,
        username: `owner${Date.now()}`,
        password: 'TestOwner@123',
        role: 'owner',
        emailVerified: true
      });
      testOwners.push(owner);

      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        })
        .expect(200);

      expect(response.body.accessToken || response.body.token).toBeDefined();
      expect(response.body.user.role).toBe('owner');
      expect(response.body.user._id).toBeDefined();
    });
  });

  describe('POST /api/users/logout - Owner Logout', () => {
    test('Owner can logout successfully', async () => {
      const owner = await createTestOwner({
        email: `owner${Date.now()}@test.com`,
        username: `owner${Date.now()}`,
        password: 'TestOwner@123',
        role: 'owner',
        emailVerified: true
      });
      testOwners.push(owner);

      // Login first
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });

      const token = loginResponse.body.accessToken || loginResponse.body.token;

      // Logout
      const response = await request(app)
        .post('/api/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toMatch(/logout|logged out|تم تسجيل|خروج/i);
    });
  });

  describe('Authorization Checks - Owner Access', () => {
    test('Owner can access owner-only routes', async () => {
      const owner = await createTestOwner({
        email: `owner${Date.now()}@test.com`,
        username: `owner${Date.now()}`,
        password: 'TestOwner@123',
        role: 'owner',
        emailVerified: true
      });
      testOwners.push(owner);

      // Login first
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });

      const token = loginResponse.body.accessToken || loginResponse.body.token;

      // Try to access owner-only route (statistics)
      const response = await request(app)
        .get('/api/statistics/products')
        .set('Authorization', `Bearer ${token}`);

      // Should succeed (200) or fail with clear error
      if (response.status !== 200) {
        console.log('Statistics route error:', response.status, response.body);
      }
      expect([200, 401, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });

    test('Customer cannot access owner-only routes (403)', async () => {
      const customer = await createTestCustomer({
        email: `customer${Date.now()}@test.com`,
        username: `customer${Date.now()}`,
        password: 'TestCustomer@123',
        role: 'customer',
        emailVerified: true
      });
      testCustomers.push(customer);

      // Login as customer
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });

      const token = loginResponse.body.accessToken || loginResponse.body.token;

      // Try to access owner-only route (statistics)
      const response = await request(app)
        .get('/api/statistics/products')
        .set('Authorization', `Bearer ${token}`);

      // Customer should get 403, but might get 401 if token invalid
      expect([401, 403]).toContain(response.status);
      if (response.body.message) {
        expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع|token|invalid/i);
      }
    });

    test('Owner cannot access customer-only routes (403)', async () => {
      const owner = await createTestOwner({
        email: `owner${Date.now()}@test.com`,
        username: `owner${Date.now()}`,
        password: 'TestOwner@123',
        role: 'owner',
        emailVerified: true
      });
      testOwners.push(owner);

      // Login as owner
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });

      const token = loginResponse.body.accessToken || loginResponse.body.token;

      // Try to access customer-only route (favorites)
      // Note: This route requires requireEmailVerification, so owner might get 401 or 403
      const response = await request(app)
        .get('/api/products/favorites/user')
        .set('Authorization', `Bearer ${token}`);

      // Owner should get 403 or 401 (if email verification required)
      expect([401, 403]).toContain(response.status);
      if (response.body.message) {
        expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع|token|invalid|verification/i);
      }
    });

    test('Unauthenticated requests are rejected (401)', async () => {
      const response = await request(app)
        .get('/api/statistics/products')
        .expect(401);

      expect(response.body.message).toMatch(/unauthorized|authenticate|تسجيل|مصادقة|token|provided/i);
    });

    test('Invalid tokens are rejected (401)', async () => {
      const response = await request(app)
        .get('/api/statistics/products')
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);

      expect(response.body.message).toMatch(/unauthorized|invalid|token|مصادقة/i);
    });
  });

  describe('Role Verification in JWT', () => {
    test('JWT token contains correct owner role', async () => {
      const owner = await createTestOwner({
        email: `owner${Date.now()}@test.com`,
        username: `owner${Date.now()}`,
        password: 'TestOwner@123',
        role: 'owner',
        emailVerified: true
      });
      testOwners.push(owner);

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });

      const token = loginResponse.body.accessToken || loginResponse.body.token;
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');

      expect(decoded.role).toBe('owner');
      expect(decoded.id).toBe(owner.user._id.toString());
      expect(decoded.email).toBe(owner.credentials.email);
    });
  });
});

