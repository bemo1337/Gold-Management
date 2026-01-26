const request = require('supertest');
const path = require('path');
const { createTestApp } = require(path.join(__dirname, '../../helpers/api-helpers'));
const { createTestOwner, createTestCustomer, cleanupTestData, waitForDatabase, closeDatabase } = require(path.join(__dirname, '../../helpers/owner-helpers'));

describe('💰 Owner Material Prices API Tests', () => {
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

  describe('GET /api/material-prices - Get Material Prices', () => {
    test('Owner can get all material prices', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/material-prices')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
    });

    test('Customer cannot get material prices (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/material-prices')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });

    test('Unauthenticated request cannot get material prices (401)', async () => {
      await request(app)
        .get('/api/material-prices')
        .expect(401);
    });
  });

  describe('GET /api/material-prices/gold/:karat - Get Gold Karat Price', () => {
    beforeEach(async () => {
      // Initialize gold prices first
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      // Set up initial gold prices
      await request(app)
        .put('/api/material-prices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          material: 'ذهب',
          karat: '21',
          pricePerGram: {
            usd: 2000,
            syp: 4000000
          }
        });
    });

    test('Owner can get gold karat price for valid karat', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const karats = ['18', '21', '24'];
      
      for (const karat of karats) {
        const response = await request(app)
          .get(`/api/material-prices/gold/${karat}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body).toHaveProperty('karat');
        expect(response.body).toHaveProperty('material');
        expect(response.body).toHaveProperty('pricePerGram');
        expect(response.body.karat).toBe(karat);
        expect(response.body.material).toBe('ذهب');
      }
    });

    test('Get gold price returns error for invalid karat', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/material-prices/gold/99')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.message || response.body.error).toBeDefined();
    });

    test('Customer cannot get gold karat price (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/material-prices/gold/21')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });

  describe('PUT /api/material-prices - Update Material Price', () => {
    test('Owner can update material price', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const priceData = {
        material: 'ذهب',
        karat: '21',
        pricePerGram: {
          usd: 2000,
          syp: 4000000
        }
      };

      const response = await request(app)
        .put('/api/material-prices')
        .set('Authorization', `Bearer ${token}`)
        .send(priceData)
        .expect(200);

      // API returns the materialPrice object, not a message
      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('material');
      expect(response.body.material).toBe('ذهب');
    });

    test('Update validates price structure (USD, SYP)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const priceData = {
        material: 'ذهب',
        karat: '21',
        pricePerGram: {
          // Missing syp - API requires both usd and syp for gold
          usd: 2000
          // syp is missing
        }
      };

      const response = await request(app)
        .put('/api/material-prices')
        .set('Authorization', `Bearer ${token}`)
        .send(priceData);

      // API requires both usd and syp for pricePerGram when updating gold (line 92-95 in controller)
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/pricePerGram|syp|مطلوبة|required/i);
    });

    test('Customer cannot update material price (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const priceData = {
        material: 'ذهب',
        karat: '21',
        price: {
          usd: 2000,
          syp: 4000000
        }
      };

      const response = await request(app)
        .put('/api/material-prices')
        .set('Authorization', `Bearer ${token}`)
        .send(priceData)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });

  describe('POST /api/material-prices/update-products - Update All Product Prices', () => {
    beforeEach(async () => {
      // Initialize material prices first
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      // Set up initial gold prices
      await request(app)
        .put('/api/material-prices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          material: 'ذهب',
          karat: '21',
          pricePerGram: {
            usd: 2000,
            syp: 4000000
          }
        });
    });

    test('Owner can update all product prices', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .post('/api/material-prices/update-products')
        .set('Authorization', `Bearer ${token}`)
        .send({ material: 'ذهب' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('updatedCount');
    });

    test('Customer cannot update all product prices (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .post('/api/material-prices/update-products')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });

  describe('POST /api/material-prices/update-all-materials - Update All Materials Prices', () => {
    beforeEach(async () => {
      // Initialize material prices first
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      // Set up initial gold prices
      await request(app)
        .put('/api/material-prices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          material: 'ذهب',
          karat: '21',
          pricePerGram: {
            usd: 2000,
            syp: 4000000
          }
        });
    });

    test('Owner can update all materials prices', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .post('/api/material-prices/update-all-materials')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('totalUpdated');
    });

    test('Customer cannot update all materials prices (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .post('/api/material-prices/update-all-materials')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });
});

