const express = require('express');
const router = express.Router();
const wishListController = require('../controller/wishListController');
const { authenticate, authorize, requireEmailVerification } = require('../middleware/auth');
const { customerWishlistLimiter, customerOperationLimiter, customerReadLimiter, ownerOperationLimiter } = require('../middleware/rateLimiter');
const { validateCustomerInput } = require('../middleware/inputSanitizer');
const { cacheMiddleware, invalidateCache, cacheKeys } = require('../middleware/cacheMiddleware');

// مسارات طلبات Wish List

// إنشاء طلب جديد (للعملاء فقط) - Invalidate cache
router.post('/', 
  authenticate, 
  requireEmailVerification, 
  authorize('customer'), 
  customerWishlistLimiter, 
  validateCustomerInput,
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    return [
      `wishlist:user:${userId}*`,
      'wishlist:owner:*',
      'wishlist:unseen-count:owner:*'
    ];
  }),
  wishListController.createWishListRequest
);

// جلب طلبات العميل (للعملاء فقط) - Cache (1 minute)
router.get('/my-requests', 
  authenticate, 
  requireEmailVerification, 
  authorize('customer'), 
  customerWishlistLimiter,
  cacheMiddleware(
    60, // 1 minute
    (req) => cacheKeys.generateWishlistCacheKey(req, 'user'),
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  wishListController.getCustomerWishListRequests
);

// جلب جميع الطلبات (للتجار فقط) - Cache (30 seconds)
router.get('/', 
  authenticate, 
  authorize('owner'),
  cacheMiddleware(
    30, // 30 seconds
    (req) => cacheKeys.generateWishlistCacheKey(req, 'owner'),
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  wishListController.getAllWishListRequests
);

// جلب عدد الطلبات غير المقرؤة (للمالكين فقط) - Cache (10 seconds)
router.get('/unseen-count', 
  authenticate, 
  authorize('owner'),
  cacheMiddleware(
    10, // 10 seconds
    (req) => cacheKeys.generateUnseenCountCacheKey('wishlist', req.user._id || req.user.id),
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  wishListController.getUnseenWishListCount
);

// تعليم الطلبات كمقروءة (للمالكين فقط) - Invalidate cache
// SECURITY: Added rate limiting to prevent abuse (was missing before)
router.patch('/mark-seen', 
  authenticate, 
  authorize('owner'),
  ownerOperationLimiter, // Rate limiting to prevent abuse
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    return [
      `wishlist:owner:${userId}*`,
      'wishlist:unseen-count:owner:*'
    ];
  }),
  wishListController.markWishListAsSeen
);

// جلب طلب محدد (للعميل صاحب الطلب أو المالك) - Cache (1 minute)
router.get('/:requestId', 
  authenticate,
  cacheMiddleware(
    60, // 1 minute
    (req) => {
      const requestId = req.params.requestId;
      const userId = req.user._id || req.user.id;
      const role = req.user.role;
      return cacheKeys.generateWishlistRequestByIdCacheKey(requestId, userId, role);
    },
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  wishListController.getWishListRequestById
);

// تحديث طلب (للعملاء فقط - صاحب الطلب) - Invalidate cache
router.patch('/:requestId', 
  authenticate, 
  requireEmailVerification, 
  authorize('customer'), 
  customerWishlistLimiter, 
  validateCustomerInput,
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    const requestId = req.params.requestId;
    return [
      `wishlist:request:${requestId}:*`,
      `wishlist:user:${userId}*`,
      'wishlist:owner:*',
      'wishlist:unseen-count:owner:*'
    ];
  }),
  wishListController.updateWishListRequest
);

// حذف طلب - Invalidate cache
router.delete('/:requestId', 
  authenticate, 
  requireEmailVerification,
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    const role = req.user.role;
    const requestId = req.params.requestId;
    const patterns = [
      `wishlist:request:${requestId}:*`,
      `wishlist:user:${userId}*`
    ];
    
    if (role === 'owner') {
      patterns.push(`wishlist:owner:${userId}*`);
    } else {
      patterns.push('wishlist:owner:*');
    }
    
    patterns.push('wishlist:unseen-count:owner:*');
    return patterns;
  }),
  wishListController.deleteWishListRequest
);

// إضافة رد على الطلب (للتجار فقط) - Invalidate cache
router.post('/:requestId/response', 
  authenticate, 
  authorize('owner'),
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    const requestId = req.params.requestId;
    return [
      `wishlist:request:${requestId}:*`,
      'wishlist:user:*',
      `wishlist:owner:${userId}*`,
      'wishlist:unseen-count:owner:*'
    ];
  }),
  wishListController.addResponseToRequest
);

// تحديث حالة الطلب (للعملاء فقط - صاحب الطلب) - Invalidate cache
router.patch('/:requestId/status', 
  authenticate, 
  requireEmailVerification, 
  authorize('customer'), 
  customerWishlistLimiter,
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    const requestId = req.params.requestId;
    return [
      `wishlist:request:${requestId}:*`,
      `wishlist:user:${userId}*`,
      'wishlist:owner:*',
      'wishlist:unseen-count:owner:*'
    ];
  }),
  wishListController.updateRequestStatus
);

module.exports = router;

