const request = require('supertest');
const path = require('path');
const { createTestApp } = require(path.join(__dirname, '../../helpers/api-helpers'));
const { createTestOwner, createTestProduct, cleanupTestData, waitForDatabase, closeDatabase } = require(path.join(__dirname, '../../helpers/owner-helpers'));

describe('❌ Owner Error Handling Tests', () => {
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

  describe('400 Bad Request Responses', () => {
    test('Invalid product data returns 400', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const invalidData = {
        name: '', // Empty name
        productType: 'invalid_type',
        material: 'invalid_material'
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    test('Missing required fields returns 400', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const incompleteData = {
        name: 'Test Product'
        // Missing productType, material, etc.
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('401 Unauthorized Responses', () => {
    test('Request without token returns 401', async () => {
      const response = await request(app)
        .get('/api/statistics/products')
        .expect(401);

      expect(response.body.message).toMatch(/unauthorized|authenticate|تسجيل|مصادقة|No token provided|token/i);
    });

    test('Request with invalid token returns 401', async () => {
      const response = await request(app)
        .get('/api/statistics/products')
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);

      expect(response.body.message).toMatch(/unauthorized|invalid|token|مصادقة/i);
    });

    test('Request with expired token returns 401', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { id: owner.user._id, role: 'owner' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired token
      );

      const response = await request(app)
        .get('/api/statistics/products')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.message).toMatch(/unauthorized|expired|token|مصادقة/i);
    });
  });

  describe('403 Forbidden Responses', () => {
    test('Customer accessing owner route returns 403', async () => {
      const { createTestCustomer } = require(path.join(__dirname, '../../helpers/owner-helpers'));
      const customer = await createTestCustomer({
        email: `customer${Date.now()}@test.com`,
        username: `customer${Date.now()}`,
        password: 'TestCustomer@123',
        role: 'customer',
        emailVerified: true
      });

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

      await cleanupTestData({ customerEmails: [customer.credentials.email] });
    });
  });

  describe('404 Not Found Responses', () => {
    test('Non-existent product returns 404', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/products/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toMatch(/not found|غير موجود/i);
    });

    test('Non-existent reservation returns 404', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/reservations/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toMatch(/not found|غير موجود/i);
    });
  });

  describe('500 Server Error Handling', () => {
    test('Malformed request data is handled gracefully', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      // Send malformed JSON
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send('{invalid json}')
        .expect(400);

      expect(response.body).toBeDefined();
    });
  });

  describe('Duplicate Entry Errors', () => {
    test('Duplicate certificate invoice number returns error', async () => {
      const { createTestCustomer, createTestProduct, createTestCertificate } = require(path.join(__dirname, '../../helpers/owner-helpers'));
      const customer = await createTestCustomer({
        email: `customer${Date.now()}@test.com`,
        username: `customer${Date.now()}`,
        password: 'TestCustomer@123',
        role: 'customer',
        emailVerified: true
      });

      const product = await createTestProduct({
        name: `Test Product Cert ${Date.now()}`,
        productType: 'خاتم',
        material: 'ذهب',
        karat: '18',
        weight: 10,
        ringSizes: [12],
        gramPrice: { usd: 50, syp: 100000 },
        totalPrice: { usd: 500, syp: 1000000 }
      }, owner.user._id);

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const invoiceNumber = `INV-${Date.now()}`;

      // Create first certificate
      const certData1 = {
        productId: product._id.toString(),
        customerId: customer.user._id.toString(),
        purchaseDetails: {
          invoiceNumber: invoiceNumber,
          purchaseDate: new Date().toISOString(),
          price: { usd: 500, syp: 1000000 }
        },
        jewelryDetails: {
          material: 'ذهب',
          karat: '18',
          weight: 10
        }
      };

      await request(app)
        .post('/api/certificates')
        .set('Authorization', `Bearer ${token}`)
        .send(certData1)
        .expect(201);

      // Try to create duplicate certificate
      const certData2 = {
        ...certData1,
        customerId: customer.user._id.toString()
      };

      const response = await request(app)
        .post('/api/certificates')
        .set('Authorization', `Bearer ${token}`)
        .send(certData2)
        .expect(400);

      // API returns "يوجد شهادة سابقة لهذا المنتج" (certificate exists for this product)
      expect(response.body.message).toMatch(/duplicate|already exists|مكرر|يوجد شهادة سابقة|invoice.*already|certificate.*exists|منتج|موجود/i);

      await cleanupTestData({
        customerEmails: [customer.credentials.email],
        productNames: [product.name]
      });
    });
  });

  describe('Validation Error Messages', () => {
    test('Error messages are descriptive', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const productData = {
        name: 'Test',
        productType: 'خاتم',
        material: 'ذهب',
        karat: '18',
        weight: 10,
        // Missing ringSizes for خاتم
        gramPrice: { usd: 50, syp: 100000 },
        totalPrice: { usd: 500, syp: 1000000 },
        images: []
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send(productData)
        .expect(400);

      expect(response.body.message).toBeDefined();
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);
    });
  });

  describe('Error Message Format Consistency', () => {
    test('All error responses have consistent format', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      // Test 400 error
      const badRequest = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(badRequest.body).toHaveProperty('message');

      // Test 404 error
      const notFound = await request(app)
        .get('/api/products/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(notFound.body).toHaveProperty('message');

      // Test 403 error (as customer)
      const { createTestCustomer } = require(path.join(__dirname, '../../helpers/owner-helpers'));
      const customer = await createTestCustomer({
        email: `customer${Date.now()}@test.com`,
        username: `customer${Date.now()}`,
        password: 'TestCustomer@123',
        role: 'customer',
        emailVerified: true
      });

      const customerLogin = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const customerToken = customerLogin.body.accessToken || customerLogin.body.token;

      const forbidden = await request(app)
        .get('/api/statistics/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(forbidden.body).toHaveProperty('message');

      await cleanupTestData({ customerEmails: [customer.credentials.email] });
    });
  });
});

