const express = require('express');
const router = express.Router();
const productController = require('../controller/productController');
const { authenticate, authorize, optionalAuth, requireEmailVerification } = require('../middleware/auth');
const { 
  ownerProductLimiter, 
  ownerUpdateLimiter, 
  ownerDeleteLimiter, 
  ownerFileUploadLimiter,
  customerFavoriteLimiter,
  customerOperationLimiter
} = require('../middleware/rateLimiter');
const { validateCustomerInput, validateOwnerInput } = require('../middleware/inputSanitizer');
const { cacheMiddleware, invalidateCache, cacheKeys } = require('../middleware/cacheMiddleware');
const multer = require('multer');

// Basic upload configuration
const basicUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Create product route - Invalidate cache
router.post('/', 
  authenticate, 
  authorize('owner'), 
  ownerProductLimiter, 
  validateOwnerInput,
  basicUpload.array('images', 10),
  invalidateCache([
    'products:*',
    'statistics:products:*',
    'statistics:product:*'
  ]), 
  productController.createProduct
);

// GET /api/products - Server-side cache with 5min TTL for optimal performance
// Cache is invalidated immediately on mutations, so longer TTL doesn't affect data freshness
router.get('/', 
  optionalAuth, 
  cacheMiddleware(
    300, // 5 minutes TTL - optimal for performance (mutations invalidate cache immediately)
    cacheKeys.generateProductCacheKey,
    { isPublic: true, isUserSpecific: false }
  ),
  productController.getProducts
);

// Search products by name or ID (for certificate creation) - Cache (2 minutes)
router.get('/search', 
  authenticate, 
  authorize('owner'),
  cacheMiddleware(
    120, // 2 minutes
    cacheKeys.generateProductSearchCacheKey,
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  productController.searchProducts
);

// Get user's favorite products (must come before /:id routes) - Cache (1 minute)
router.get('/favorites/user', 
  authenticate, 
  requireEmailVerification, 
  authorize('customer'), 
  customerFavoriteLimiter,
  cacheMiddleware(
    60, // 1 minute
    (req) => cacheKeys.generateFavoritesCacheKey(req.user._id || req.user.id),
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  productController.getFavoriteProducts
);

// Get favorites count - Cache (1 minute)
router.get('/favorites/count', 
  authenticate, 
  requireEmailVerification, 
  authorize('customer'), 
  customerFavoriteLimiter,
  cacheMiddleware(
    60, // 1 minute
    (req) => cacheKeys.generateFavoritesCountCacheKey(req.user._id || req.user.id),
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  productController.getFavoriteProductsCount
);

// Product by ID routes - Server-side cache with 5min TTL for optimal performance
// Cache is invalidated immediately on mutations, so longer TTL doesn't affect data freshness
router.get('/:id', 
  optionalAuth,
  cacheMiddleware(
    300, // 5 minutes TTL - optimal for performance (mutations invalidate cache immediately)
    (req) => {
      const userId = req.user?._id || req.user?.id || 'anonymous';
      return cacheKeys.generateProductByIdCacheKey(req.params.id, userId);
    },
    { isPublic: true, isUserSpecific: false }
  ),
  productController.getProductById
);

// Update product - Invalidate cache
router.put('/:id', 
  authenticate, 
  authorize('owner'), 
  ownerUpdateLimiter, 
  validateOwnerInput, 
  basicUpload.array('images', 10),
  invalidateCache((req) => [
    `product:${req.params.id}:*`,
    'products:*',
    'statistics:products:*',
    `statistics:product:${req.params.id}:*`
  ]),
  productController.updateProduct
);

// Delete product - Invalidate cache
router.delete('/:id', 
  authenticate, 
  authorize('owner'), 
  ownerDeleteLimiter,
  invalidateCache((req) => [
    `product:${req.params.id}:*`,
    'products:*',
    'statistics:products:*',
    `statistics:product:${req.params.id}:*`
  ]),
  productController.deleteProduct
);

// Toggle pin - Invalidate cache
router.patch('/:id/pin', 
  authenticate, 
  authorize('owner'), 
  ownerUpdateLimiter,
  invalidateCache((req) => [
    `product:${req.params.id}:*`,
    'products:*',
    'statistics:products:*',
    `statistics:product:${req.params.id}:*`
  ]),
  productController.togglePin
);

// Toggle special - Invalidate cache
router.patch('/:id/special', 
  authenticate, 
  authorize('owner'), 
  ownerUpdateLimiter,
  invalidateCache((req) => [
    `product:${req.params.id}:*`,
    'products:*',
    'statistics:products:*',
    `statistics:product:${req.params.id}:*`
  ]),
  productController.toggleSpecial
);

// Toggle like - Invalidate favorites and product cache
router.post('/:id/like', 
  authenticate, 
  requireEmailVerification, 
  authorize('customer'), 
  customerFavoriteLimiter, 
  validateCustomerInput,
  invalidateCache((req) => {
    try {
      const userId = req.user._id || req.user.id;
      if (!userId) {
        return [`product:${req.params.id}:*`];
      }
      return [
        cacheKeys.generateFavoritesCacheKey(userId),
        cacheKeys.generateFavoritesCountCacheKey(userId),
        `product:${req.params.id}:*`
      ];
    } catch (error) {
      console.error('Error generating cache keys for like:', error);
      return [`product:${req.params.id}:*`, 'favorites:*'];
    }
  }),
  productController.toggleLike
);

// Additional product-specific routes can be added here

module.exports = router; 