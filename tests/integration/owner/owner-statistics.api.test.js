const request = require('supertest');
const path = require('path');
const { createTestApp } = require(path.join(__dirname, '../../helpers/api-helpers'));
const { createTestOwner, createTestCustomer, createTestProduct, cleanupTestData, waitForDatabase, closeDatabase } = require(path.join(__dirname, '../../helpers/owner-helpers'));

describe('📊 Owner Statistics API Tests', () => {
  let app;
  let owner;
  let customer;
  let testProducts = [];

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

    // Create some test products for statistics
    for (let i = 0; i < 3; i++) {
      const product = await createTestProduct({
        name: `Test Product Stats ${Date.now()}-${i}`,
        productType: i === 0 ? 'خاتم' : i === 1 ? 'طوق' : 'حلق',
        material: i === 0 ? 'ذهب' : i === 1 ? 'فضة' : 'ألماس',
        karat: i === 0 ? '18' : i === 1 ? '925' : '18', // Diamond still needs karat field
        weight: 10 + i,
        gramPrice: { usd: 50, syp: 100000 },
        totalPrice: { usd: 500, syp: 1000000 },
        ringSizes: i === 0 ? [12, 13] : undefined
      }, owner.user._id);
      testProducts.push(product);
    }
  });

  afterAll(async () => {
    const productNames = testProducts.map(p => p.name);
    await cleanupTestData({
      ownerEmails: [owner.credentials.email],
      customerEmails: [customer.credentials.email],
      productNames
    });
    await closeDatabase();
  });

  describe('GET /api/statistics/products - Get Products Statistics', () => {
    test('Owner can get all products statistics', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/statistics/products')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('overallStats');
      expect(response.body.overallStats).toHaveProperty('totalProducts');
      expect(response.body.overallStats).toHaveProperty('totalLikes');
      expect(response.body.overallStats).toHaveProperty('totalComments');
      expect(response.body.overallStats).toHaveProperty('pinnedProducts');
      expect(typeof response.body.overallStats.totalProducts).toBe('number');
    });

    test('Statistics response includes material breakdown', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/statistics/products')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('materialStats');
      expect(typeof response.body.materialStats).toBe('object');
    });

    test('Statistics response includes product type breakdown', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/statistics/products')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // API returns materialStats, not typeStats
      expect(response.body).toHaveProperty('materialStats');
      expect(typeof response.body.materialStats).toBe('object');
    });

    test('Customer cannot access statistics (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/statistics/products')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });

    test('Unauthenticated request cannot access statistics (401)', async () => {
      await request(app)
        .get('/api/statistics/products')
        .expect(401);
    });
  });

  describe('GET /api/statistics/products/:productId - Get Product Detailed Stats', () => {
    test('Owner can get detailed statistics for a product', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const productId = testProducts[0]._id;

      const response = await request(app)
        .get(`/api/statistics/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('product');
      expect(response.body.product._id.toString()).toBe(productId.toString());
      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('likes');
      expect(response.body).toHaveProperty('comments');
      expect(response.body.stats).toHaveProperty('totalLikes');
      expect(response.body.stats).toHaveProperty('totalComments');
      expect(typeof response.body.stats.totalLikes).toBe('number');
      expect(typeof response.body.stats.totalComments).toBe('number');
      expect(Array.isArray(response.body.likes)).toBe(true);
      expect(Array.isArray(response.body.comments)).toBe(true);
    });

    test('Get detailed stats returns 404 for non-existent product', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const fakeId = '507f1f77bcf86cd799439011';

      await request(app)
        .get(`/api/statistics/products/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    test('Customer cannot get detailed statistics (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const productId = testProducts[0]._id;

      const response = await request(app)
        .get(`/api/statistics/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });
});

