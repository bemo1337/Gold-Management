// Owner-specific test helpers
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../server/models/User');
const Product = require('../../server/models/Product');
const Reservation = require('../../server/models/Reservation');
const Certificate = require('../../server/models/Certificate');
const WishList = require('../../server/models/WishList');
const FavoriteAlert = require('../../server/models/FavoriteAlert');

/**
 * Create a test owner user
 * @param {Object} userData - Owner user data
 * @returns {Promise<Object>} Created owner with token
 */
async function createTestOwner(userData = {}) {
  const defaults = {
    username: `testowner${Date.now()}`,
    email: `testowner${Date.now()}@test.com`,
    password: 'TestOwner@123',
    role: 'owner',
    emailVerified: true
  };
  
  const data = { ...defaults, ...userData };
  
  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);
  
  // Create owner
  const owner = await User.create({
    username: data.username,
    email: data.email,
    password: hashedPassword,
    role: data.role,
    emailVerified: data.emailVerified
  });
  
  // Generate JWT token
  const token = jwt.sign(
    { id: owner._id, role: owner.role, email: owner.email, username: owner.username },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '24h' }
  );
  
  return {
    user: owner.toObject(),
    token,
    credentials: {
      email: data.email,
      password: data.password
    }
  };
}

/**
 * Create a test customer user
 * @param {Object} userData - Customer user data
 * @returns {Promise<Object>} Created customer with token
 */
async function createTestCustomer(userData = {}) {
  const defaults = {
    username: `testcustomer${Date.now()}`,
    email: `testcustomer${Date.now()}@test.com`,
    password: 'TestCustomer@123',
    role: 'customer',
    emailVerified: true
  };
  
  const data = { ...defaults, ...userData };
  
  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);
  
  // Create customer
  const customer = await User.create({
    username: data.username,
    email: data.email,
    password: hashedPassword,
    role: data.role,
    emailVerified: data.emailVerified
  });
  
  // Generate JWT token
  const token = jwt.sign(
    { id: customer._id, role: customer.role, email: customer.email, username: customer.username },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '24h' }
  );
  
  return {
    user: customer.toObject(),
    token,
    credentials: {
      email: data.email,
      password: data.password
    }
  };
}

/**
 * Create a test product with owner
 * @param {Object} productData - Product data
 * @param {String} ownerId - Owner user ID
 * @returns {Promise<Object>} Created product
 */
async function createTestProduct(productData = {}, ownerId = null) {
  const defaults = {
    name: `Test Product ${Date.now()}`,
    description: 'Test product description',
    productType: 'خاتم',
    material: 'ذهب',
    karat: '18',
    weight: 10,
    gramPrice: { usd: 50, syp: 100000 },
    totalPrice: { usd: 500, syp: 1000000 },
    images: [],
    pinned: false,
    special: false
  };
  
  const data = { ...defaults, ...productData };
  if (ownerId) {
    data.owner = ownerId;
  }
  
  const product = await Product.create(data);
  return product.toObject();
}

/**
 * Create a test reservation
 * @param {Object} reservationData - Reservation data
 * @param {String} customerId - Customer user ID
 * @param {String} productId - Product ID
 * @returns {Promise<Object>} Created reservation
 */
async function createTestReservation(reservationData = {}, customerId = null, productId = null) {
  const defaults = {
    status: 'pending',
    durationHours: 24,
    phone: '1234567890',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  };
  
  const data = { ...defaults, ...reservationData };
  if (customerId) {
    data.customer = customerId;
  }
  if (productId) {
    data.product = productId;
  }
  
  const reservation = await Reservation.create(data);
  return reservation.toObject();
}

/**
 * Create a test certificate
 * @param {Object} certificateData - Certificate data
 * @param {String} customerId - Customer user ID
 * @param {String} productId - Product ID
 * @returns {Promise<Object>} Created certificate
 */
async function createTestCertificate(certificateData = {}, customerId = null, productId = null, ownerId = null) {
  // Generate required fields
  const year = new Date().getFullYear();
  const randomId = Math.random().toString(36).substring(2, 10).toUpperCase();
  const certificateId = `NIZAR-${year}-${randomId}`;
  const verificationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  const defaults = {
    certificateId: certificateId,
    store: ownerId || certificateData.store,
    certificateDetails: {
      issueDate: new Date(),
      status: 'active',
      verificationCode: verificationCode
    },
    purchaseDetails: {
      invoiceNumber: `INV-${Date.now()}`,
      purchaseDate: new Date(),
      purchasePrice: {
        usd: 500,
        syp: 1000000
      }
    },
    jewelryDetails: {
      name: `Test Product ${Date.now()}`,
      material: 'ذهب',
      karat: '18',
      weight: 10,
      productType: 'خاتم'
    }
  };
  
  const data = { ...defaults, ...certificateData };
  
  // Merge nested objects properly
  if (certificateData.purchaseDetails) {
    data.purchaseDetails = { ...defaults.purchaseDetails, ...certificateData.purchaseDetails };
    if (certificateData.purchaseDetails.purchasePrice) {
      data.purchaseDetails.purchasePrice = { ...defaults.purchaseDetails.purchasePrice, ...certificateData.purchaseDetails.purchasePrice };
    }
  }
  if (certificateData.jewelryDetails) {
    data.jewelryDetails = { ...defaults.jewelryDetails, ...certificateData.jewelryDetails };
  }
  if (certificateData.certificateDetails) {
    data.certificateDetails = { ...defaults.certificateDetails, ...certificateData.certificateDetails };
  }
  
  if (customerId) {
    data.customer = customerId;
  }
  if (productId) {
    data.product = productId;
  }
  
  const certificate = await Certificate.create(data);
  return certificate.toObject();
}

/**
 * Clean up test data
 * @param {Object} options - Cleanup options
 * @returns {Promise<void>}
 */
async function cleanupTestData(options = {}) {
  const {
    ownerEmails = [],
    customerEmails = [],
    productNames = [],
    reservationIds = [],
    certificateIds = [],
    wishlistIds = []
  } = options;
  
  if (ownerEmails.length > 0) {
    await User.deleteMany({ email: { $in: ownerEmails }, role: 'owner' });
  }
  
  if (customerEmails.length > 0) {
    await User.deleteMany({ email: { $in: customerEmails }, role: 'customer' });
  }
  
  if (productNames.length > 0) {
    await Product.deleteMany({ name: { $in: productNames.map(n => new RegExp(n)) } });
  }
  
  if (reservationIds.length > 0) {
    await Reservation.deleteMany({ _id: { $in: reservationIds } });
  }
  
  if (certificateIds.length > 0) {
    await Certificate.deleteMany({ _id: { $in: certificateIds } });
  }
  
  if (wishlistIds.length > 0) {
    await WishList.deleteMany({ _id: { $in: wishlistIds } });
  }
}

/**
 * Wait for database connection
 * @returns {Promise<void>}
 */
async function waitForDatabase() {
  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/gold_eva_test';
    await mongoose.connect(mongoUri);
  }
}

/**
 * Close database connection
 * @returns {Promise<void>}
 */
async function closeDatabase() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
}

module.exports = {
  createTestOwner,
  createTestCustomer,
  createTestProduct,
  createTestReservation,
  createTestCertificate,
  cleanupTestData,
  waitForDatabase,
  closeDatabase
};

