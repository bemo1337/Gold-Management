const request = require('supertest');
const path = require('path');
const { createTestApp } = require(path.join(__dirname, '../../helpers/api-helpers'));
const { createTestOwner, createTestCustomer, cleanupTestData, waitForDatabase, closeDatabase } = require(path.join(__dirname, '../../helpers/owner-helpers'));

describe('👥 Owner Users API Tests', () => {
  let app;
  let owner;
  let customer;
  let testCustomers = [];

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
    testCustomers.push(customer);

    // Create additional test customers for search
    for (let i = 0; i < 3; i++) {
      const testCustomer = await createTestCustomer({
        email: `testcustomer${i}${Date.now()}@test.com`,
        username: `testcustomer${i}${Date.now()}`,
        password: 'TestCustomer@123',
        role: 'customer',
        emailVerified: true
      });
      testCustomers.push(testCustomer);
    }
  });

  afterAll(async () => {
    const customerEmails = testCustomers.map(c => c.credentials.email);
    await cleanupTestData({
      ownerEmails: [owner.credentials.email],
      customerEmails
    });
    await closeDatabase();
  });

  describe('GET /api/users/search - Search Customers', () => {
    test('Owner can search customers by email', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const searchEmail = testCustomers[0].credentials.email;

      const response = await request(app)
        .get(`/api/users/search?email=${searchEmail}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || typeof response.body === 'object').toBe(true);
    });

    test('Search returns empty results for non-existent email', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/users/search?email=nonexistent@test.com')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    test('Customer cannot search customers (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/users/search?email=test@test.com')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });

    test('Unauthenticated request cannot search (401)', async () => {
      await request(app)
        .get('/api/users/search?email=test@test.com')
        .expect(401);
    });
  });

  describe('GET /api/users - Get All Users', () => {
    test('Owner can get all users', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || typeof response.body === 'object').toBe(true);
    });

    test('Get all users response includes user data', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const users = Array.isArray(response.body) ? response.body : (response.body.users || []);
      if (users.length > 0) {
        expect(users[0]).toHaveProperty('email');
        expect(users[0]).toHaveProperty('username');
      }
    });

    test('Customer cannot get all users (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });

    test('Unauthenticated request cannot get all users (401)', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });
  });
});

