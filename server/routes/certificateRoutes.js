const express = require('express');
const router = express.Router();
const certificateController = require('../controller/certificateController');
const { authenticate, authorize, requireEmailVerification } = require('../middleware/auth');
const { customerCertificateLimiter, customerOperationLimiter, customerReadLimiter } = require('../middleware/rateLimiter');
const { validateCustomerInput } = require('../middleware/inputSanitizer');
const { cacheMiddleware, invalidateCache, cacheKeys } = require('../middleware/cacheMiddleware');

// مسارات الشهادات

// إنشاء شهادة جديدة (مالك فقط) - Invalidate cache
router.post('/', 
  authenticate, 
  authorize('owner'),
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    return [
      'certificates:user:*',
      'certificates:owner:*',
      `certificates:user:${userId}*`,
      `certificates:owner:${userId}*`
    ];
  }),
  certificateController.createCertificate
);

// التحقق من صحة الشهادة (عام) - يجب أن يكون قبل /:certificateId
router.get('/verify/:certificateId', certificateController.verifyCertificate);

// جلب شهادات العميل (عميل فقط) - Cache (1 minute)
router.get('/customer/my-certificates', 
  authenticate, 
  requireEmailVerification, 
  authorize('customer'), 
  customerCertificateLimiter, 
  customerReadLimiter,
  cacheMiddleware(
    60, // 1 minute
    (req) => cacheKeys.generateCertificatesCacheKey(req, 'user'),
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  certificateController.getCustomerCertificates
);

// جلب جميع الشهادات (مالك فقط) - Cache (1 minute)
router.get('/', 
  authenticate, 
  authorize('owner'),
  cacheMiddleware(
    60, // 1 minute
    (req) => cacheKeys.generateCertificatesCacheKey(req, 'owner'),
    { isPublic: false, isUserSpecific: true, requireAuth: true }
  ),
  certificateController.getAllCertificates
);

// تحميل الشهادة كـ PDF (عام) - يجب أن يكون قبل /:certificateId
router.get('/:certificateId/download', certificateController.downloadCertificate);

// تحميل الشهادة كـ HTML (عام) - للاحتياط
router.get('/:certificateId/download-html', certificateController.downloadCertificateHTML);

// جلب شهادة بواسطة معرف الشهادة (عام) - Cache (5 minutes)
router.get('/:certificateId', 
  cacheMiddleware(
    300, // 5 minutes
    (req) => cacheKeys.generateCertificateByIdCacheKey(req.params.certificateId),
    { isPublic: true, isUserSpecific: false }
  ),
  certificateController.getCertificateById
);

// تحديث حالة الشهادة (مالك فقط) - Invalidate cache
router.patch('/:certificateId/status', 
  authenticate, 
  authorize('owner'),
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    return [
      cacheKeys.generateCertificateByIdCacheKey(req.params.certificateId),
      `certificates:user:*`,
      `certificates:owner:${userId}*`
    ];
  }),
  certificateController.updateCertificateStatus
);

// نقل ملكية الشهادة (عميل فقط) - Invalidate cache
router.patch('/:certificateId/transfer', 
  authenticate, 
  requireEmailVerification, 
  authorize('customer'), 
  customerCertificateLimiter, 
  validateCustomerInput,
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    return [
      cacheKeys.generateCertificateByIdCacheKey(req.params.certificateId),
      `certificates:user:${userId}*`,
      'certificates:owner:*'
    ];
  }),
  certificateController.transferCertificate
);

// حذف الشهادة نهائياً (مالك فقط) - Invalidate cache
router.delete('/:certificateId', 
  authenticate, 
  authorize('owner'),
  invalidateCache((req) => {
    return [
      cacheKeys.generateCertificateByIdCacheKey(req.params.certificateId),
      'certificates:*'
    ];
  }),
  certificateController.deleteCertificate
);

// إلغاء الشهادة (مالك فقط) - Invalidate cache
router.patch('/:certificateId/revoke', 
  authenticate, 
  authorize('owner'),
  invalidateCache((req) => {
    const userId = req.user._id || req.user.id;
    return [
      cacheKeys.generateCertificateByIdCacheKey(req.params.certificateId),
      `certificates:owner:${userId}*`,
      'certificates:*'
    ];
  }),
  certificateController.revokeCertificate
);

module.exports = router;
