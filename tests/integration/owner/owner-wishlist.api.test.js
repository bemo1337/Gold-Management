const request = require('supertest');
const path = require('path');
const mongoose = require('mongoose');
const { createTestApp } = require(path.join(__dirname, '../../helpers/api-helpers'));
const { createTestOwner, createTestCustomer, cleanupTestData, waitForDatabase, closeDatabase } = require(path.join(__dirname, '../../helpers/owner-helpers'));
const WishList = require('../../../server/models/WishList');

describe('💝 Owner Wishlist Requests API Tests', () => {
  let app;
  let owner;
  let customer;
  let testWishListRequests = [];

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
    const wishlistIds = testWishListRequests.map(r => r._id);
    await cleanupTestData({
      ownerEmails: [owner.credentials.email],
      customerEmails: [customer.credentials.email],
      wishlistIds
    });
    await closeDatabase();
  });

  describe('GET /api/wishlist - Get All Wishlist Requests', () => {
    beforeEach(async () => {
      // Create test wishlist requests
      const request1 = await WishList.create({
        customer: customer.user._id,
        title: `Test Request ${Date.now()}`,
        description: 'Test description',
        status: 'pending',
        specifications: {
          material: 'ذهب',
          productType: 'خاتم',
          karat: '18'
        }
      });
      
      const request2 = await WishList.create({
        customer: customer.user._id,
        title: `Test Request 2 ${Date.now()}`,
        description: 'Test description 2',
        status: 'responded',
        specifications: {
          material: 'فضة',
          productType: 'سوار' // Valid enum: خاتم, سوار, قلادة, أقراط, سلسلة, محبس, طقم, أخرى
        }
      });
      
      testWishListRequests.push(request1, request2);
    });

    test('Owner can get all wishlist requests', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/wishlist?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('wishListRequests');
      expect(Array.isArray(response.body.wishListRequests)).toBe(true);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('totalPages');
    });

    test('Owner can filter wishlist requests by status', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/wishlist?status=pending')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.wishListRequests).toBeDefined();
      if (response.body.wishListRequests.length > 0) {
        response.body.wishListRequests.forEach(req => {
          expect(req.status).toBe('pending');
        });
      }
    });

    test('Customer cannot get all wishlist requests (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/wishlist')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });

  describe('GET /api/wishlist/:requestId - Get Request by ID', () => {
    let testRequest;

    beforeEach(async () => {
      testRequest = await WishList.create({
        customer: customer.user._id,
        title: `Test Request ${Date.now()}`,
        description: 'Test description',
        status: 'pending',
        specifications: {
          material: 'ذهب',
          productType: 'خاتم',
          karat: '18'
        }
      });
      testWishListRequests.push(testRequest);
    });

    test('Owner can get wishlist request by ID', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get(`/api/wishlist/${testRequest._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('wishListRequest');
      expect(response.body.wishListRequest._id.toString()).toBe(testRequest._id.toString());
      expect(response.body.wishListRequest).toHaveProperty('title');
      expect(response.body.wishListRequest).toHaveProperty('status');
    });

    test('Get request returns 404 for non-existent request', async () => {
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
        .get(`/api/wishlist/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('POST /api/wishlist/:requestId/response - Add Response to Request', () => {
    let testRequest;

    beforeEach(async () => {
      testRequest = await WishList.create({
        customer: customer.user._id,
        title: `Test Request ${Date.now()}`,
        description: 'Test description',
        status: 'pending',
        specifications: {
          material: 'ذهب',
          productType: 'خاتم',
          karat: '18'
        }
      });
      testWishListRequests.push(testRequest);
    });

    test('Owner can add response to wishlist request', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const responseData = {
        message: 'Test response message',
        status: 'responded'
      };

      const response = await request(app)
        .post(`/api/wishlist/${testRequest._id}/response`)
        .set('Authorization', `Bearer ${token}`)
        .send(responseData)
        .expect(200);

      expect(response.body).toHaveProperty('wishListRequest');
      expect(response.body.wishListRequest.status).toBe('responded');
      expect(response.body.wishListRequest.responses).toBeDefined();
      expect(Array.isArray(response.body.wishListRequest.responses)).toBe(true);
    });

    test('Add response returns 404 for non-existent request', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const fakeId = '507f1f77bcf86cd799439011';
      const responseData = {
        message: 'Test response'
      };

      await request(app)
        .post(`/api/wishlist/${fakeId}/response`)
        .set('Authorization', `Bearer ${token}`)
        .send(responseData)
        .expect(404);
    });

    test('Customer cannot add response (403)', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customer.credentials.email,
          password: customer.credentials.password,
          role: 'customer'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const responseData = {
        message: 'Test response'
      };

      const response = await request(app)
        .post(`/api/wishlist/${testRequest._id}/response`)
        .set('Authorization', `Bearer ${token}`)
        .send(responseData)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });

  describe('GET /api/wishlist/unseen-count - Get Unseen Count', () => {
    test('Owner can get unseen wishlist count', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .get('/api/wishlist/unseen-count')
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
        .get('/api/wishlist/unseen-count')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toMatch(/forbidden|unauthorized|غير مصرح|ممنوع/i);
    });
  });

  describe('PATCH /api/wishlist/mark-seen - Mark Requests as Seen', () => {
    test('Owner can mark wishlist requests as seen', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: owner.credentials.email,
          password: owner.credentials.password,
          role: 'owner'
        });
      const token = loginResponse.body.accessToken || loginResponse.body.token;

      const response = await request(app)
        .patch('/api/wishlist/mark-seen')
        .set('Authorization', `Bearer ${token}`)
        .send({ requestIds: [] })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });
});

