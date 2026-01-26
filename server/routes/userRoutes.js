const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const userStatisticsController = require('../controller/userStatisticsController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { refreshToken } = require('../controller/userController');
const { authLimiter, createAccountLimiter, customerLoginLimiter, ownerLoginLimiter, adminLoginLimiter, passwordResetLimiter, resendVerificationLimiter, ownerOperationLimiter } = require('../middleware/rateLimiter');
const { validateAuthFields, sanitizeInput } = require('../middleware/inputSanitizer');
const { cacheMiddleware, invalidateCache, clearUserCacheMiddleware, cacheKeys } = require('../middleware/cacheMiddleware');

// Traditional authentication - Invalidate cache
router.post('/register', 
  createAccountLimiter, 
  sanitizeInput, 
  validateAuthFields,
  invalidateCache(['users:all:owner:*', 'users:search:owner:*']),
  userController.register
);

// Smart login route - uses different rate limiters based on role
router.post('/login', (req, res, next) => {
  const { role } = req.body;
  
  // Use enhanced admin login limiter for owners (stricter security)
  // Use customer login limiter for customers
  if (role === 'owner') {
    return adminLoginLimiter(req, res, next);
  } else {
    return customerLoginLimiter(req, res, next);
  }
}, sanitizeInput, validateAuthFields, userController.login);

router.post('/logout', optionalAuth, clearUserCacheMiddleware(), userController.logout); // Clear user cache on logout (optionalAuth to get user ID if available)
router.post('/refresh', authLimiter, refreshToken);

// Email verification
router.get('/verify-email/:token', userController.verifyEmail);
router.post('/resend-verification', resendVerificationLimiter, sanitizeInput, userController.resendVerificationEmail);

// Password reset routes (customers only)
router.post('/forgot-password', passwordResetLimiter, sanitizeInput, userController.forgotPassword);
router.post('/reset-password/:token', passwordResetLimiter, sanitizeInput, validateAuthFields, userController.resetPassword);

// Change password (when logged in) - customers only - Invalidate cache
router.post('/change-password', 
  authenticate, 
  sanitizeInput, 
  validateAuthFields,
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    return [cacheKeys.generateUserProfileCacheKey(userId)];
  }),
  userController.changePassword
);

// Search customers by email (for certificate creation) - Cache (30 seconds)
router.get('/search', 
  authenticate,
  authorize('owner'),
  cacheMiddleware(
    30, // 30 seconds
    cacheKeys.generateUserSearchCacheKey,
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  userController.searchCustomers
);

// Get all users (for owner to select customers) - Cache (30 seconds)
router.get('/', 
  authenticate,
  authorize('owner'),
  cacheMiddleware(
    30, // 30 seconds - short TTL since user list can change
    (req) => cacheKeys.generateAllUsersCacheKey(req.user._id || req.user.id),
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  userController.getAllUsers
);

// User profile routes - Cache (1 minute)
router.get('/profile', 
  authenticate,
  cacheMiddleware(
    60, // 1 minute
    (req) => cacheKeys.generateUserProfileCacheKey(req.user._id || req.user.id),
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  userController.getProfile
);

// Delete account - Clear user cache and invalidate all users cache
router.delete('/account', 
  authenticate, 
  clearUserCacheMiddleware(),
  invalidateCache(['users:all:owner:*', 'users:search:owner:*']),
  userController.deleteAccount
);

// User statistics (owner only) - Cached for 5 minutes
router.get('/statistics', 
  authenticate,
  authorize('owner'),
  userStatisticsController.getUserStatistics
);

// Admin endpoints for account lockout management (owner only)
// SECURITY: Rate limited, authenticated, owner-only, no caching (fresh security data)
router.get('/admin/users/locked',
  ownerOperationLimiter, // Rate limiting for owner operations
  authenticate,           // JWT authentication required
  authorize('owner'),     // Owner role required
  userController.getLockedUsers
);

router.post('/admin/users/:userId/unlock',
  ownerOperationLimiter, // Rate limiting for owner operations
  authenticate,           // JWT authentication required
  authorize('owner'),     // Owner role required
  sanitizeInput,          // Input sanitization (XSS, NoSQL injection protection)
  clearUserCacheMiddleware(), // Clear user cache on unlock
  userController.unlockUser
);


// Additional user-specific routes can be added here

module.exports = router; 