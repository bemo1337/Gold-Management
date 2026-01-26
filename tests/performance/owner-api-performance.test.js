const request = require('supertest');
const path = require('path');
const { createTestApp } = require(path.join(__dirname, '../helpers/api-helpers'));
const { createTestOwner, createTestProduct, cleanupTestData, waitForDatabase, closeDatabase } = require(path.join(__dirname, '../helpers/owner-helpers'));

describe('⚡ Owner API Performance Tests', () => {
  let app;
  let owner;
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
  });

  afterAll(async () => {
    const productNames = testProducts.map(p => p.name);
    await cleanupTestData({
      ownerEmails: [owner.credentials.email],
      productNames
    });
    await closeDatabase();
  });

  describe('Product Creation Performance', () => {
    test('Product creation completes in < 2 seconds', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const productData = {
        name: `Performance Test Product ${Date.now()}`,
        productType: 'خاتم',
        material: 'ذهب',
        karat: '18',
        weight: 10,
        ringSizes: [12],
        gramPrice: { usd: 50, syp: 100000 },
        totalPrice: { usd: 500, syp: 1000000 },
        images: []
      };

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send(productData);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(201);
      expect(duration).toBeLessThan(2000); // 2 seconds
      
      if (response.body._id) {
        testProducts.push(response.body);
      }
    });
  });

  describe('Product Update Performance', () => {
    test('Product update completes in < 1 second', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      // Create a product first
      const product = await createTestProduct({
        name: `Performance Update Product ${Date.now()}`,
        productType: 'خاتم',
        material: 'ذهب',
        karat: '18',
        weight: 10,
        ringSizes: [12],
        gramPrice: { usd: 50, syp: 100000 },
        totalPrice: { usd: 500, syp: 1000000 }
      }, owner.user._id);
      testProducts.push(product);

      const updateData = {
        name: 'Updated Product Name'
      };

      const startTime = Date.now();
      const response = await request(app)
        .put(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });

  describe('Product Deletion Performance', () => {
    test('Product deletion completes in < 1 second', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      // Create a product first
      const product = await createTestProduct({
        name: `Performance Delete Product ${Date.now()}`,
        productType: 'خاتم',
        material: 'ذهب',
        karat: '18',
        weight: 10,
        ringSizes: [12],
        gramPrice: { usd: 50, syp: 100000 },
        totalPrice: { usd: 500, syp: 1000000 }
      }, owner.user._id);

      const startTime = Date.now();
      const response = await request(app)
        .delete(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${token}`);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });

  describe('Product Listing Performance', () => {
    test('Product listing completes in < 1 second', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/products?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });

  describe('Statistics Load Performance', () => {
    test('Statistics load completes in < 2 seconds', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/statistics/products')
        .set('Authorization', `Bearer ${token}`);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // 2 seconds
    });
  });

  describe('Reservations List Performance', () => {
    test('Reservations list completes in < 1 second', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/reservations?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });
});

