const express = require('express');
const router = express.Router();
const statisticsController = require('../controller/statisticsController');
const { authenticate, authorize } = require('../middleware/auth');
const { cacheMiddleware, invalidateCache, cacheKeys } = require('../middleware/cacheMiddleware');

// Statistics routes (only for owners)
// Product-level statistics - Cache (5 minutes)
router.get('/products', 
  authenticate, 
  authorize('owner'),
  cacheMiddleware(
    300, // 5 minutes
    (req) => cacheKeys.generateStatisticsCacheKey(req.user._id || req.user.id),
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  statisticsController.getProductsStatistics
);

router.get('/products/:productId', 
  authenticate, 
  authorize('owner'),
  cacheMiddleware(
    300, // 5 minutes
    (req) => cacheKeys.generateStatisticsCacheKey(req.user._id || req.user.id, req.params.productId),
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  statisticsController.getProductDetailedStats
);

module.exports = router; 