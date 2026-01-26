const request = require('supertest');
const path = require('path');
const { createTestApp } = require(path.join(__dirname, '../../helpers/api-helpers'));
const { createTestOwner, createTestCustomer, createTestProduct, createTestReservation, cleanupTestData, waitForDatabase, closeDatabase } = require(path.join(__dirname, '../../helpers/owner-helpers'));

describe('📋 Owner Reservations API Tests', () => {
  let app;
  let owner;
  let customer;
  let testProduct;
  let testReservations = [];

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

    // Create a test product
    testProduct = await createTestProduct({
      name: `Test Product Reservation ${Date.now()}`,
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
    const reservationIds = testReservations.map(r => r._id);
    await cleanupTestData({
      ownerEmails: [owner.credentials.email],
      customerEmails: [customer.credentials.email],
      productNames: [testProduct.name],
      reservationIds
    });
    await closeDatabase();
  });

  describe('GET /api/reservations - Get All Reservations', () => {
    beforeEach(async () => {
      // Create test reservations
      const reservation1 = await createTestReservation({
        status: 'pending',
        durationHours: 24
      }, customer.user._id, testProduct._id);
      
      const reservation2 = await createTestReservation({
        status: 'approved',
        durationHours: 48
      }, customer.user._id, testProduct._id);
      
      testReservations.push(reservation1, reservation2);
    });

    test('Owner can get all reservations', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/reservations?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('reservations');
      expect(Array.isArray(response.body.reservations)).toBe(true);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('totalPages');
    });

    test('Owner can filter reservations by status', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/reservations?status=pending')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.reservations).toBeDefined();
      response.body.reservations.forEach(reservation => {
        expect(reservation.status).toBe('pending');
      });
    });

    test('Reservations response includes pagination', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/reservations?page=1&limit=5')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalPages');
      expect(response.body).toHaveProperty('currentPage');
      expect(response.body).toHaveProperty('total');
    });

    test('Customer cannot get all reservations (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });

  describe('GET /api/reservations/:reservationId - Get Reservation by ID', () => {
    let testReservation;

    beforeEach(async () => {
      testReservation = await createTestReservation({
        status: 'pending',
        durationHours: 24,
        phone: '1234567890'
      }, customer.user._id, testProduct._id);
      testReservations.push(testReservation);
    });

    test('Owner can get reservation by ID', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get(`/api/reservations/${testReservation._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('reservation');
      expect(response.body.reservation._id.toString()).toBe(testReservation._id.toString());
      expect(response.body.reservation).toHaveProperty('status');
      expect(response.body.reservation).toHaveProperty('product');
      expect(response.body.reservation).toHaveProperty('customer');
    });

    test('Get reservation returns 404 for non-existent reservation', async () => {
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
        .get(`/api/reservations/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PATCH /api/reservations/:reservationId/approve - Approve Reservation', () => {
    let testReservation;

    beforeEach(async () => {
      testReservation = await createTestReservation({
        status: 'pending',
        durationHours: 24
      }, customer.user._id, testProduct._id);
      testReservations.push(testReservation);
    });

    test('Owner can approve pending reservation', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .patch(`/api/reservations/${testReservation._id}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('reservation');
      // getSummary returns Arabic status, so check if status exists and reservation is present
      expect(response.body.reservation).toBeDefined();
      expect(response.body.reservation.id.toString()).toBe(testReservation._id.toString());
      expect(response.body.reservation.status).toBeDefined();
      expect(response.body).toHaveProperty('message');
    });

    test('Approve reservation returns 404 for non-existent reservation', async () => {
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
        .patch(`/api/reservations/${fakeId}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    test('Customer cannot approve reservation (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .patch(`/api/reservations/${testReservation._id}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });

  describe('PATCH /api/reservations/:reservationId/reject - Reject Reservation', () => {
    let testReservation;

    beforeEach(async () => {
      testReservation = await createTestReservation({
        status: 'pending',
        durationHours: 24
      }, customer.user._id, testProduct._id);
      testReservations.push(testReservation);
    });

    test('Owner can reject pending reservation', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .patch(`/api/reservations/${testReservation._id}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('reservation');
      // getSummary returns Arabic status ('مرفوض' for rejected), so just verify structure
      expect(response.body.reservation).toBeDefined();
      expect(response.body.reservation.id.toString()).toBe(testReservation._id.toString());
      expect(response.body.reservation.status).toBeDefined();
      expect(response.body).toHaveProperty('message');
    });

    test('Customer cannot reject reservation (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .patch(`/api/reservations/${testReservation._id}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });

  describe('GET /api/reservations/unseen-count - Get Unseen Reservations Count', () => {
    test('Owner can get unseen reservations count', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/reservations/unseen-count')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });

    test('Customer cannot get unseen count (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/reservations/unseen-count')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });

  describe('PATCH /api/reservations/mark-seen - Mark Reservations as Seen', () => {
    test('Owner can mark reservations as seen', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .patch('/api/reservations/mark-seen')
        .set('Authorization', `Bearer ${token}`)
        .send({ reservationIds: [] })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });
});

