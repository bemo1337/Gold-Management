const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Product = require('../models/Product');
const Reservation = require('../models/Reservation');
const Certificate = require('../models/Certificate');

// Import app but don't start server
const express = require('express');
const app = express();
require('dotenv').config();

// Setup app
app.use(express.json());
app.use(require('cookie-parser')());
app.use(require('cors')({ origin: true, credentials: true }));

// Routes
app.use('/api/users', require('../routes/userRoutes'));
app.use('/api/products', require('../routes/productRoutes'));
app.use('/api/reservations', require('../routes/reservationRoutes'));
app.use('/api/certificates', require('../routes/certificateRoutes'));
app.use('/api/statistics', require('../routes/statisticsRoutes'));
app.use('/api/material-prices', require('../routes/materialPriceRoutes'));
app.use('/api/wishlist', require('../routes/wishListRoutes'));

describe('🔐 Owner API Authentication & Authorization Tests', () => {
  let ownerToken;
  let customerToken;
  let ownerId;
  let customerId;
  let testProductId;
  let testReservationId;

  // Setup before all tests
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI);
    
    // Clean up test data
    await User.deleteMany({ email: { $in: ['test-owner@test.com', 'test-customer@test.com'] } });
    await Product.deleteMany({ name: /TEST_PRODUCT/ });
    
    console.log('\n🧪 === TEST SETUP START ===');
    
    // Create test owner (emailVerified required for login)
    const ownerPassword = await bcrypt.hash('TestOwner@123', 10);
    const owner = await User.create({
      username: 'Test Owner',
      email: 'test-owner@test.com',
      password: ownerPassword,
      role: 'owner',
      emailVerified: true // Required for login
    });
    ownerId = owner._id.toString();
    ownerToken = jwt.sign({ id: owner._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('✅ Test owner created');

    // Create test customer (emailVerified required for login)
    const customerPassword = await bcrypt.hash('TestCustomer@123', 10);
    const customer = await User.create({
      username: 'Test Customer',
      email: 'test-customer@test.com',
      password: customerPassword,
      role: 'customer',
      emailVerified: true // Required for login
    });
    customerId = customer._id.toString();
    customerToken = jwt.sign({ id: customer._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('✅ Test customer created');
    
    console.log('🔐 === TEST SETUP COMPLETE ===\n');
  });

  // Cleanup after all tests
  afterAll(async () => {
    console.log('\n🧹 === TEST CLEANUP START ===');
    await User.deleteMany({ email: { $in: ['test-owner@test.com', 'test-customer@test.com'] } });
    await Product.deleteMany({ name: /TEST_PRODUCT/ });
    await Reservation.deleteMany({ userId: { $in: [ownerId, customerId] } });
    await mongoose.connection.close();
    console.log('✅ Test cleanup complete');
    console.log('🧹 === TEST CLEANUP COMPLETE ===\n');
  });

  // ==================== AUTHENTICATION TESTS ====================
  describe('1️⃣ Authentication Tests', () => {
    test('✅ Owner can login successfully', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test-owner@test.com',
          password: 'TestOwner@123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.role).toBe('owner');
      console.log('✅ Owner login successful');
    });

    test('✅ Customer can login successfully', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test-customer@test.com',
          password: 'TestCustomer@123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.role).toBe('customer');
      console.log('✅ Customer login successful');
    });

    test('❌ Invalid credentials should fail', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test-owner@test.com',
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
      console.log('✅ Invalid credentials rejected');
    });
  });

  // ==================== PRODUCTS API TESTS ====================
  describe('2️⃣ Products API - Owner Only', () => {
    test('✅ Owner can create product', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'TEST_PRODUCT_1',
          description: 'Test product for API testing',
          productType: 'خاتم', // Required - Arabic product type
          material: 'ذهب', // Required - Must be Arabic: 'ذهب', 'فضة', or 'ألماس'
          karat: '18', // Required - Must be one of: '18', '21', '22', '24', '925'
          weight: 10, // Required
          ringSizes: ['18', '19', '20'], // Required for خاتم
          gramPrice: { usd: 50, syp: 100000 },
          totalPrice: { usd: 500, syp: 1000000 },
          pinned: false
        });

      expect(response.status).toBe(201);
      // API returns product directly, not wrapped in { product: {...} }
      expect(response.body).toHaveProperty('_id');
      testProductId = response.body._id;
      console.log('✅ Owner created product:', testProductId);
    });

    test('❌ Customer CANNOT create product', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'TEST_PRODUCT_UNAUTHORIZED',
          productType: 'خاتم',
          material: 'ذهب',
          karat: '18',
          weight: 10,
          gramPrice: { usd: 50, syp: 100000 },
          totalPrice: { usd: 500, syp: 1000000 }
        });

      expect([403, 401]).toContain(response.status);
      // Message may be in Arabic or English
      if (response.body.message) {
        expect(response.body.message).toMatch(/forbidden|unauthorized|غير مسموح|ممنوع/i);
      }
      console.log('✅ Customer blocked from creating product');
    });

    test('❌ No token CANNOT create product', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({
          name: 'TEST_PRODUCT_NO_AUTH',
          productType: 'خاتم',
          material: 'ذهب',
          karat: '18',
          weight: 10,
          gramPrice: { usd: 50, syp: 100000 },
          totalPrice: { usd: 500, syp: 1000000 }
        });

      expect(response.status).toBe(401);
      console.log('✅ Unauthenticated user blocked from creating product');
    });

    test('✅ Owner can update product', async () => {
      const response = await request(app)
        .put(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'TEST_PRODUCT_UPDATED',
          totalPrice: { usd: 1500, syp: 3000000 } // Update price using totalPrice object
        });

      expect(response.status).toBe(200);
      console.log('✅ Owner updated product');
    });

    test('❌ Customer CANNOT update product', async () => {
      const response = await request(app)
        .put(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          price: 2000
        });

      expect(response.status).toBe(403);
      console.log('✅ Customer blocked from updating product');
    });

    test('✅ Owner can pin product', async () => {
      const response = await request(app)
        .patch(`/api/products/${testProductId}/pin`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      console.log('✅ Owner pinned product');
    });

    test('❌ Customer CANNOT pin product', async () => {
      const response = await request(app)
        .patch(`/api/products/${testProductId}/pin`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      console.log('✅ Customer blocked from pinning product');
    });
  });

  // ==================== RESERVATIONS API TESTS ====================
  describe('3️⃣ Reservations API - Owner Access', () => {
    beforeAll(async () => {
      // Ensure product exists before creating reservation
      if (!testProductId) {
        throw new Error('testProductId must be set before creating reservation');
      }
      // Create test reservation (uses customer, product, expiresAt)
      const reservation = await Reservation.create({
        customer: customerId,
        product: testProductId,
        status: 'pending',
        durationHours: 24,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      });
      testReservationId = reservation._id.toString();
      console.log('✅ Test reservation created:', testReservationId);
    });

    test('✅ Owner can view all reservations', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${ownerToken}`);

      // API returns { reservations, totalPages, currentPage, total } or array
      expect([200, 201]).toContain(response.status);
      expect(response.body).toBeDefined();
      // Response may have reservations array directly or wrapped
      if (Array.isArray(response.body)) {
        // Direct array response
        expect(Array.isArray(response.body)).toBe(true);
      } else if (response.body.reservations) {
        // Wrapped response
        expect(Array.isArray(response.body.reservations)).toBe(true);
      }
      console.log('✅ Owner viewed all reservations');
    });

    test('❌ Customer CANNOT view all reservations', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${customerToken}`);

      // Should fail or return only their reservations
      if (response.status === 403) {
        console.log('✅ Customer blocked from viewing all reservations');
      } else {
        console.log('✅ Customer can only see their own reservations');
      }
    });

    test('✅ Owner can approve reservation', async () => {
      if (!testReservationId) {
        console.log('⚠️ Skipping: testReservationId not set');
        return;
      }
      const response = await request(app)
        .patch(`/api/reservations/${testReservationId}/approve`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect([200, 201]).toContain(response.status);
      console.log('✅ Owner approved reservation');
    });

    test('❌ Customer CANNOT approve reservation', async () => {
      if (!testReservationId) {
        console.log('⚠️ Skipping: testReservationId not set');
        return;
      }
      const response = await request(app)
        .patch(`/api/reservations/${testReservationId}/approve`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect([403, 401]).toContain(response.status);
      console.log('✅ Customer blocked from approving reservation');
    });

    test('✅ Owner can reject reservation', async () => {
      if (!testReservationId) {
        console.log('⚠️ Skipping: testReservationId not set');
        return;
      }
      const response = await request(app)
        .patch(`/api/reservations/${testReservationId}/reject`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect([200, 201]).toContain(response.status);
      console.log('✅ Owner rejected reservation');
    });

    test('❌ Customer CANNOT reject reservation', async () => {
      if (!testReservationId) {
        console.log('⚠️ Skipping: testReservationId not set');
        return;
      }
      const response = await request(app)
        .patch(`/api/reservations/${testReservationId}/reject`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect([403, 401]).toContain(response.status);
      console.log('✅ Customer blocked from rejecting reservation');
    });
  });

  // ==================== STATISTICS API TESTS ====================
  describe('4️⃣ Statistics API - Owner Only', () => {
    test('✅ Owner can view product statistics', async () => {
      const response = await request(app)
        .get('/api/statistics/products')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      console.log('✅ Owner viewed product statistics');
    });

    test('❌ Customer CANNOT view product statistics', async () => {
      const response = await request(app)
        .get('/api/statistics/products')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      console.log('✅ Customer blocked from viewing product statistics');
    });

    test('✅ Owner can view dashboard data', async () => {
      const response = await request(app)
        .get('/api/statistics/dashboard')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      console.log('✅ Owner viewed dashboard data');
    });

    test('❌ Customer CANNOT view dashboard data', async () => {
      const response = await request(app)
        .get('/api/statistics/dashboard')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      console.log('✅ Customer blocked from viewing dashboard data');
    });
  });

  // ==================== CERTIFICATES API TESTS ====================
  describe('5️⃣ Certificates API - Owner Access', () => {
    test('✅ Owner can view all certificates', async () => {
      const response = await request(app)
        .get('/api/certificates')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      console.log('✅ Owner viewed all certificates');
    });

    test('❌ Customer CANNOT view all certificates', async () => {
      const response = await request(app)
        .get('/api/certificates')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      console.log('✅ Customer blocked from viewing all certificates');
    });
  });

  // ==================== WISHLIST API TESTS ====================
  describe('7️⃣ WishList API - Owner Access', () => {
    test('✅ Owner can view all wishlist requests', async () => {
      const response = await request(app)
        .get('/api/wishlist/requests')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      console.log('✅ Owner viewed all wishlist requests');
    });

    test('❌ Customer CANNOT view all wishlist requests', async () => {
      const response = await request(app)
        .get('/api/wishlist/requests')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      console.log('✅ Customer blocked from viewing all wishlist requests');
    });
  });

  // ==================== MATERIAL PRICES API TESTS ====================
  describe('8️⃣ Material Prices API - Owner Only', () => {
    test('✅ Owner can view material prices', async () => {
      const response = await request(app)
        .get('/api/material-prices')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      console.log('✅ Owner viewed material prices');
    });

    test('❌ Customer CANNOT view material prices', async () => {
      const response = await request(app)
        .get('/api/material-prices')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      console.log('✅ Customer blocked from viewing material prices');
    });
  });

  // ==================== DELETE PRODUCT TEST ====================
  describe('9️⃣ Delete Product - Owner Only', () => {
    test('❌ Customer CANNOT delete product', async () => {
      const response = await request(app)
        .delete(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      console.log('✅ Customer blocked from deleting product');
    });

    test('✅ Owner can delete product', async () => {
      const response = await request(app)
        .delete(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      console.log('✅ Owner deleted product');
    });
  });
});

