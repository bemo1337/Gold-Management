const request = require('supertest');
const path = require('path');
const mongoose = require('mongoose');
const { createTestApp } = require(path.join(__dirname, '../../helpers/api-helpers'));
const { createTestOwner, createTestCustomer, createTestProduct, cleanupTestData, waitForDatabase, closeDatabase } = require(path.join(__dirname, '../../helpers/owner-helpers'));
const FavoriteAlert = require('../../../server/models/FavoriteAlert');

describe('🔔 Owner Favorite Alerts API Tests', () => {
  let app;
  let owner;
  let customer;
  let testProduct;
  let testAlerts = [];

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

    testProduct = await createTestProduct({
      name: `Test Product Alert ${Date.now()}`,
      productType: 'خاتم',
      material: 'ذهب',
      karat: '18',
      weight: 10,
      ringSizes: [12],
      gramPrice: { usd: 50, syp: 100000 },
      totalPrice: { usd: 500, syp: 1000000 }
    }, owner.user._id);
  });

  afterAll(async () => {
    const alertIds = testAlerts.map(a => a._id);
    await cleanupTestData({
      ownerEmails: [owner.credentials.email],
      customerEmails: [customer.credentials.email],
      productNames: [testProduct.name],
      wishlistIds: alertIds // Using wishlistIds for alerts cleanup
    });
    await closeDatabase();
  });

  describe('GET /api/favorite-alerts - Get All Favorite Alerts', () => {
    beforeEach(async () => {
      // Create test favorite alerts
      const alert1 = await FavoriteAlert.create({
        product: testProduct._id,
        user: customer.user._id,
        alertType: 'price_drop',
        targetPrice: 400,
        contactInfo: {
          email: customer.credentials.email
        },
        status: 'active'
      });
      
      const alert2 = await FavoriteAlert.create({
        product: testProduct._id,
        alertType: 'back_in_stock',
        contactInfo: {
          email: 'test@example.com'
        },
        status: 'active'
      });
      
      testAlerts.push(alert1, alert2);
    });

    test('Owner can get all favorite alerts', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/favorite-alerts?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('favoriteAlerts');
      expect(Array.isArray(response.body.favoriteAlerts)).toBe(true);
    });

    test('Favorite alerts response includes pagination', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/favorite-alerts?page=1&limit=5')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('totalPages');
      expect(response.body).toHaveProperty('currentPage');
    });

    test('Customer cannot get all favorite alerts (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/favorite-alerts')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });
});

