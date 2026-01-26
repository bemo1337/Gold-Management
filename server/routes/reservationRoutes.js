const express = require('express');
const router = express.Router();
const reservationController = require('../controller/reservationController');
const { authenticate, authorize, requireEmailVerification, optionalAuth } = require('../middleware/auth');
const { customerReservationLimiter, customerOperationLimiter, customerReadLimiter, ownerOperationLimiter } = require('../middleware/rateLimiter');
const { validateCustomerInput } = require('../middleware/inputSanitizer');
const { cacheMiddleware, invalidateCache, cacheKeys } = require('../middleware/cacheMiddleware');


// إنشاء حجز جديد (للعملاء فقط) - Invalidate cache
router.post('/', 
  authenticate, 
  requireEmailVerification, 
  authorize('customer'), 
  customerReservationLimiter, 
  validateCustomerInput,
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    const productId = req.body.productId;
    return [
      `reservations:user:${userId}:*`,
      'reservations:owner:*',
      'reservations:unseen-count:owner:*',
      productId ? `reservation:check:product:${productId}:*` : 'reservation:check:product:*'
    ];
  }),
  reservationController.createReservation
);

// جلب حجوزات العميل (للعملاء فقط) - Cache (30 seconds)
router.get('/my-reservations', 
  authenticate, 
  requireEmailVerification, 
  authorize('customer'), 
  customerReservationLimiter,
  cacheMiddleware(
    30, // 30 seconds
    (req) => cacheKeys.generateReservationsCacheKey(req, 'user'),
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  reservationController.getCustomerReservations
);

// جلب عدد الحجوزات غير المرئية (للتجار فقط) - Cache (10 seconds)
router.get('/unseen-count', 
  authenticate, 
  authorize('owner'),
  cacheMiddleware(
    10, // 10 seconds
    (req) => cacheKeys.generateUnseenCountCacheKey('reservations', req.user._id || req.user.id),
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  reservationController.getUnseenReservationsCount
);

// التحقق من وجود حجز نشط لمنتج (عام - للتحقق من المنتجات الخاصة) - Cache (10 seconds)
router.get('/check-product/:productId', 
  optionalAuth,
  cacheMiddleware(
    10, // 10 seconds - short TTL since reservation status changes frequently
    (req) => {
      const productId = req.params.productId;
      const userId = req.user?._id || req.user?.id || 'anonymous';
      return cacheKeys.generateProductReservationCheckCacheKey(productId, userId);
    },
    { isPublic: true, isUserSpecific: false }
  ),
  reservationController.checkProductReservation
);

// تحديد الحجوزات كمقروءة (للتجار فقط) - Invalidate cache
// SECURITY: Added rate limiting to prevent abuse (was missing before)
router.patch('/mark-seen', 
  authenticate, 
  authorize('owner'),
  ownerOperationLimiter, // Rate limiting to prevent abuse
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    return [
      `reservations:owner:${userId}:*`,
      'reservations:unseen-count:owner:*'
    ];
  }),
  reservationController.markReservationsAsSeen
);

// جلب جميع طلبات الحجز (للتجار فقط) - Cache (30 seconds)
router.get('/', 
  authenticate, 
  authorize('owner'),
  cacheMiddleware(
    30, // 30 seconds
    (req) => cacheKeys.generateReservationsCacheKey(req, 'owner'),
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  reservationController.getAllReservations
);

// جلب حجز محدد - Cache (1 minute)
router.get('/:reservationId', 
  authenticate,
  cacheMiddleware(
    60, // 1 minute
    (req) => `reservation:${req.params.reservationId}:user:${req.user._id || req.user.id}`,
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  reservationController.getReservationById
);

// الموافقة على الحجز (للتجار فقط) - Invalidate cache
router.patch('/:reservationId/approve', 
  authenticate, 
  authorize('owner'),
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    const reservationId = req.params.reservationId;
    // Get productId from reservation if available, otherwise invalidate all
    return [
      `reservation:${reservationId}:*`,
      'reservations:user:*',
      `reservations:owner:${userId}:*`,
      'reservations:unseen-count:owner:*',
      'reservation:check:product:*' // Invalidate all product reservation checks
    ];
  }),
  reservationController.approveReservation
);

// رفض الحجز (للتجار فقط) - Invalidate cache
router.patch('/:reservationId/reject', 
  authenticate, 
  authorize('owner'),
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    const reservationId = req.params.reservationId;
    return [
      `reservation:${reservationId}:*`,
      'reservations:user:*',
      `reservations:owner:${userId}:*`,
      'reservations:unseen-count:owner:*',
      'reservation:check:product:*' // Invalidate all product reservation checks
    ];
  }),
  reservationController.rejectReservation
);

// إلغاء الحجز (للعميل فقط) - Invalidate cache
router.patch('/:reservationId/cancel', 
  authenticate, 
  requireEmailVerification, 
  authorize('customer'), 
  customerReservationLimiter,
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    const reservationId = req.params.reservationId;
    return [
      `reservation:${reservationId}:*`,
      `reservations:user:${userId}:*`,
      'reservations:owner:*',
      'reservations:unseen-count:owner:*',
      'reservation:check:product:*' // Invalidate all product reservation checks
    ];
  }),
  reservationController.cancelReservation
);

// حذف الحجز نهائياً (للعميل والمالك) - Invalidate cache
router.delete('/:reservationId', 
  authenticate, 
  (req, res, next) => {
    // console.log('🗑️ DELETE ROUTE CALLED');
    // console.log('Reservation ID:', req.params.reservationId);
    // console.log('User from auth:', req.user);
    next();
  },
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    const role = req.user.role;
    const patterns = [
      `reservation:${req.params.reservationId}:*`,
      `reservations:user:${userId}:*`,
      'reservation:check:product:*' // Invalidate all product reservation checks
    ];
    
    if (role === 'owner') {
      patterns.push(`reservations:owner:${userId}:*`);
      patterns.push('reservations:unseen-count:owner:*');
    } else {
      patterns.push('reservations:owner:*');
      patterns.push('reservations:unseen-count:owner:*');
    }
    
    return patterns;
  }),
  reservationController.deleteReservation
);

// تحديث الحجوزات المنتهية (للتجار فقط) - Invalidate cache
router.post('/update-expired', 
  authenticate, 
  authorize(['owner']),
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    return [
      `reservations:owner:${userId}:*`,
      'reservations:user:*',
      'reservations:unseen-count:owner:*'
    ];
  }),
  reservationController.updateExpiredReservations
);

module.exports = router;
