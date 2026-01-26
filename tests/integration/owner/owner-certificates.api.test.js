const request = require('supertest');
const path = require('path');
const { createTestApp } = require(path.join(__dirname, '../../helpers/api-helpers'));
const { createTestOwner, createTestCustomer, createTestProduct, createTestCertificate, cleanupTestData, waitForDatabase, closeDatabase } = require(path.join(__dirname, '../../helpers/owner-helpers'));

describe('📜 Owner Certificates API Tests', () => {
  let app;
  let owner;
  let customer;
  let testProduct;
  let testCertificates = [];

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
      name: `Test Product Certificate ${Date.now()}`,
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
    const certificateIds = testCertificates.map(c => c._id);
    await cleanupTestData({
      ownerEmails: [owner.credentials.email],
      customerEmails: [customer.credentials.email],
      productNames: [testProduct.name],
      certificateIds
    });
    await closeDatabase();
  });

  describe('POST /api/certificates - Create Certificate', () => {
    test('Owner can create certificate with valid data', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const certificateData = {
        productId: testProduct._id.toString(),
        customerId: customer.user._id.toString(),
        purchaseDetails: {
          invoiceNumber: `INV-${Date.now()}`,
          purchaseDate: new Date().toISOString(),
          price: { usd: 500, syp: 1000000 }
        },
        jewelryDetails: {
          material: 'ذهب',
          karat: '18',
          weight: 10
        }
      };

      const response = await request(app)
        .post('/api/certificates')
        .set('Authorization', `Bearer ${token}`)
        .send(certificateData)
        .expect(201);

      expect(response.body).toHaveProperty('certificate');
      expect(response.body.certificate).toHaveProperty('_id');
      expect(response.body.certificate).toHaveProperty('certificateId');
      expect(response.body.certificate.certificateDetails).toHaveProperty('verificationCode');
      expect(response.body.certificate.certificateDetails.status).toBe('active');
      testCertificates.push(response.body.certificate);
    });

    test('Certificate creation validates required fields', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const certificateData = {
        // Missing required fields
        purchaseDetails: {
          purchaseDate: new Date().toISOString()
        }
      };

      const response = await request(app)
        .post('/api/certificates')
        .set('Authorization', `Bearer ${token}`)
        .send(certificateData)
        .expect(400);

      expect(response.body.message || response.body.error).toBeDefined();
    });

    test('Customer cannot create certificate (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const certificateData = {
        productId: testProduct._id.toString(),
        customerId: customer.user._id.toString(),
        purchaseDetails: {
          invoiceNumber: `INV-${Date.now()}`,
          purchaseDate: new Date().toISOString(),
          price: { usd: 500, syp: 1000000 }
        }
      };

      const response = await request(app)
        .post('/api/certificates')
        .set('Authorization', `Bearer ${token}`)
        .send(certificateData)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });

  describe('GET /api/certificates - Get All Certificates', () => {
    beforeEach(async () => {
      const certificate = await createTestCertificate({
        certificateDetails: {
          status: 'active'
        },
        purchaseDetails: {
          invoiceNumber: `INV-${Date.now()}`,
          purchaseDate: new Date(),
          purchasePrice: { usd: 500, syp: 1000000 }
        },
        jewelryDetails: {
          material: 'ذهب',
          karat: '18',
          weight: 10,
          productType: 'خاتم'
        }
      }, customer.user._id, testProduct._id, owner.user._id);
      testCertificates.push(certificate);
    });

    test('Owner can get all certificates', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/certificates')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('certificates');
      expect(Array.isArray(response.body.certificates)).toBe(true);
    });

    test('Customer cannot get all certificates (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/certificates')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });

  describe('GET /api/certificates/:certificateId - Get Certificate by ID', () => {
    let testCertificate;

    beforeEach(async () => {
      testCertificate = await createTestCertificate({
        certificateDetails: {
          status: 'active'
        },
        purchaseDetails: {
          invoiceNumber: `INV-${Date.now()}`,
          purchaseDate: new Date(),
          purchasePrice: { usd: 500, syp: 1000000 }
        },
        jewelryDetails: {
          material: 'ذهب',
          karat: '18',
          weight: 10,
          productType: 'خاتم'
        }
      }, customer.user._id, testProduct._id, owner.user._id);
      testCertificates.push(testCertificate);
    });

    test('Owner can get certificate by ID', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get(`/api/certificates/${testCertificate.certificateId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('certificate');
      expect(response.body.certificate._id.toString()).toBe(testCertificate._id.toString());
      expect(response.body.certificate).toHaveProperty('certificateId');
    });
  });

  describe('PATCH /api/certificates/:certificateId/status - Update Certificate Status', () => {
    let testCertificate;

    beforeEach(async () => {
      testCertificate = await createTestCertificate({
        certificateDetails: {
          status: 'active'
        },
        purchaseDetails: {
          invoiceNumber: `INV-${Date.now()}`,
          purchaseDate: new Date(),
          purchasePrice: { usd: 500, syp: 1000000 }
        },
        jewelryDetails: {
          material: 'ذهب',
          karat: '18',
          weight: 10,
          productType: 'خاتم'
        }
      }, customer.user._id, testProduct._id, owner.user._id);
      testCertificates.push(testCertificate);
    });

    test('Owner can update certificate status', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .patch(`/api/certificates/${testCertificate.certificateId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'revoked' })
        .expect(200);

      expect(response.body).toHaveProperty('certificate');
      expect(response.body.certificate.certificateDetails.status).toBe('revoked');
    });

    test('Customer cannot update certificate status (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .patch(`/api/certificates/${testCertificate.certificateId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'revoked' })
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });

  describe('PATCH /api/certificates/:certificateId/revoke - Revoke Certificate', () => {
    let testCertificate;

    beforeEach(async () => {
      testCertificate = await createTestCertificate({
        certificateDetails: {
          status: 'active'
        },
        purchaseDetails: {
          invoiceNumber: `INV-${Date.now()}`,
          purchaseDate: new Date(),
          purchasePrice: { usd: 500, syp: 1000000 }
        },
        jewelryDetails: {
          material: 'ذهب',
          karat: '18',
          weight: 10,
          productType: 'خاتم'
        }
      }, customer.user._id, testProduct._id, owner.user._id);
      testCertificates.push(testCertificate);
    });

    test('Owner can revoke certificate', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      // Reload certificate to ensure it exists in database and has correct store
      const Certificate = require('../../../server/models/Certificate');
      const freshCert = await Certificate.findById(testCertificate._id);
      
      // Verify the certificate has the correct store
      if (!freshCert || freshCert.store.toString() !== owner.user._id.toString()) {
        throw new Error(`Certificate store mismatch: expected ${owner.user._id}, got ${freshCert?.store}`);
      }
      
      const response = await request(app)
        .patch(`/api/certificates/${freshCert.certificateId}/revoke`)
        .set('Authorization', `Bearer ${token}`);

      // Check response status and log error if needed
      if (response.status !== 200) {
        console.error('Revoke failed:', response.status, response.body);
      }
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('certificate');
      expect(response.body.certificate.certificateDetails.status).toBe('revoked');
    });
  });

  describe('DELETE /api/certificates/:certificateId - Delete Certificate', () => {
    let testCertificate;

    beforeEach(async () => {
      testCertificate = await createTestCertificate({
        certificateDetails: {
          status: 'active'
        },
        purchaseDetails: {
          invoiceNumber: `INV-${Date.now()}`,
          purchaseDate: new Date(),
          purchasePrice: { usd: 500, syp: 1000000 }
        },
        jewelryDetails: {
          material: 'ذهب',
          karat: '18',
          weight: 10,
          productType: 'خاتم'
        }
      }, customer.user._id, testProduct._id, owner.user._id);
    });

    test('Owner can delete certificate', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .delete(`/api/certificates/${testCertificate.certificateId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toMatch(/deleted|حذف|تم حذف/i);
    });

    test('Customer cannot delete certificate (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .delete(`/api/certificates/${testCertificate.certificateId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });

  describe('GET /api/certificates/verify/:certificateId - Verify Certificate', () => {
    let testCertificate;

    beforeEach(async () => {
      testCertificate = await createTestCertificate({
        certificateDetails: {
          status: 'active'
        },
        purchaseDetails: {
          invoiceNumber: `INV-${Date.now()}`,
          purchaseDate: new Date(),
          purchasePrice: { usd: 500, syp: 1000000 }
        },
        jewelryDetails: {
          material: 'ذهب',
          karat: '18',
          weight: 10,
          productType: 'خاتم'
        }
      }, customer.user._id, testProduct._id, owner.user._id);
      testCertificates.push(testCertificate);
    });

    test('Public can verify certificate (no auth required)', async () => {
      const response = await request(app)
        .get(`/api/certificates/verify/${testCertificate.certificateId}`)
        .expect(200);

      expect(response.body).toHaveProperty('isValid');
      expect(response.body).toHaveProperty('certificate');
    });
  });
});

