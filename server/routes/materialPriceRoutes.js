const express = require('express');
const router = express.Router();
const materialPriceController = require('../controller/materialPriceController');
const { authenticate, authorize } = require('../middleware/auth');
const { cacheMiddleware, invalidateCache, cacheKeys } = require('../middleware/cacheMiddleware');

// Material price routes (only for owners)
// Get material prices - Cache (10 minutes)
router.get('/', 
  authenticate, 
  authorize('owner'),
  cacheMiddleware(
    600, // 10 minutes
    (req) => cacheKeys.generateMaterialPricesCacheKey(req.user._id || req.user.id),
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  materialPriceController.getMaterialPrices
);

// Get gold price by karat - Cache (10 minutes)
router.get('/gold/:karat', 
  authenticate, 
  authorize('owner'),
  cacheMiddleware(
    600, // 10 minutes
    (req) => cacheKeys.generateMaterialPricesCacheKey(req.user._id || req.user.id, req.params.karat),
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  materialPriceController.getGoldKaratPrice
);

// Update material price - Invalidate cache
router.put('/', 
  authenticate, 
  authorize('owner'),
  invalidateCache([
    'material-prices:*',
    'products:*'
  ]),
  materialPriceController.updateMaterialPrice
);

// Update all product prices - Invalidate cache
router.post('/update-products', 
  authenticate, 
  authorize('owner'),
  invalidateCache([
    'material-prices:*',
    'products:*'
  ]),
  materialPriceController.updateAllProductPrices
);

// Update all materials prices - Invalidate cache
router.post('/update-all-materials', 
  authenticate, 
  authorize('owner'),
  invalidateCache([
    'material-prices:*',
    'products:*'
  ]),
  materialPriceController.updateAllMaterialsPrices
);

module.exports = router; 