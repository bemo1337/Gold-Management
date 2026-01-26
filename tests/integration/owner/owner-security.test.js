const request = require('supertest');
const path = require('path');
const { createTestApp } = require(path.join(__dirname, '../../helpers/api-helpers'));
const { createTestOwner, createTestCustomer, cleanupTestData, waitForDatabase, closeDatabase } = require(path.join(__dirname, '../../helpers/owner-helpers'));

describe('🛡️ Owner Security Tests', () => {
  let app;
  let owner;
  let customer;

  beforeAll(async () => {
    await waitForDatabase();
    app = createTestApp();
    
    owner = await createTestOwner({
      email: `owner${Date.now()}@test.com`,
      username: `owner${Date.now()}`,
      password: 'TestOwner@123',
      role: 'owner',
      emailVerified: true
    });
    
    customer = await createTestCustomer({
      email: `customer${Date.now()}@test.com`,
      username: `customer${Date.now()}`,
      password: 'TestCustomer@123',
      role: 'customer',
      emailVerified: true
    });
  });

  afterAll(async () => {
    await cleanupTestData({
      ownerEmails: [owner.credentials.email],
      customerEmails: [customer.credentials.email]
    });
    await closeDatabase();
  });

  describe('Authorization Checks', () => {
    test('Customer cannot access owner-only routes', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      // Try to access owner-only routes
      const routes = [
        '/api/statistics/products',
        '/api/reservations',
        '/api/certificates',
        '/api/material-prices',
        '/api/wishlist',
        '/api/favorite-alerts',
        '/api/users/search'
      ];

      for (const route of routes) {
        const response = await request(app)
          .get(route)
          .set('Authorization', `Bearer ${token}`)
          .expect(403);

        expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
      }
    });

    test('Owner cannot access customer-only routes', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      // Try to access customer-only routes
      const customerRoutes = [
        '/api/products/favorites/user',
        '/api/products/favorites/count'
      ];

      for (const route of customerRoutes) {
        const response = await request(app)
          .get(route)
          .set('Authorization', `Bearer ${token}`)
          .expect(403);

        expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
      }
    });

    test('Unauthenticated access blocked', async () => {
      const ownerRoutes = [
        '/api/statistics/products',
        '/api/reservations',
        '/api/certificates',
        '/api/material-prices'
      ];

      for (const route of ownerRoutes) {
        await request(app)
          .get(route)
          .expect(401);
      }
    });

    test('Invalid token rejection', async () => {
      const invalidTokens = [
        'invalid-token',
        'Bearer invalid',
        '123456789',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/statistics/products')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.message).toMatch(/unauthorized|invalid|token|مصادقة/i);
      }
    });

    test('Expired token handling', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { id: owner.user._id, role: 'owner', email: owner.credentials.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/statistics/products')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.message).toMatch(/unauthorized|expired|token|مصادقة/i);
    });

    test('Role verification in JWT tokens', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      // Decode token and verify role
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');

      expect(decoded.role).toBe('owner');
      expect(decoded.id).toBe(owner.user._id.toString());

      // Try to use customer token for owner route (should fail)
      const customerLogin = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const customerToken = customerLogin.body.accessToken || customerLogin.body.token;

      const customerDecoded = jwt.verify(customerToken, process.env.JWT_SECRET || 'test-secret');
      expect(customerDecoded.role).toBe('customer');

      // Customer token should not work for owner routes
      const response = await request(app)
        .get('/api/statistics/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });
});

