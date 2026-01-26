const rateLimit = require('express-rate-limit');
const securityLogger = require('../utils/securityLogger');

// Environment-based rate limiting configuration

// Development: High limits (for testing)
// Production: Strict limits (security)

const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test' || process.env.TEST_MODE === 'true';
const isDevOrTest = isDevelopment || isTest;

// Rate limiter configuration from environment variables (with fallbacks)
const RATE_LIMIT_CONFIG = {
  // General API limits
  API_WINDOW_MS: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS) || (isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000),
  API_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_API_MAX) || (isDevelopment ? 1000 : 100),
  
  // Auth limits
  AUTH_WINDOW_MS: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || (isDevOrTest ? 1 * 60 * 1000 : 15 * 60 * 1000),
  AUTH_MAX_ATTEMPTS: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || (isDevOrTest ? 1000 : 5),
  
  // Password reset limits
  PASSWORD_RESET_WINDOW_MS: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET_WINDOW_MS) || (isDevelopment ? 10 * 60 * 1000 : 60 * 60 * 1000),
  PASSWORD_RESET_MAX: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET_MAX) || (isDevelopment ? 20 : 3),
  
  // Account creation limits
  CREATE_ACCOUNT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_CREATE_ACCOUNT_WINDOW_MS) || (isDevelopment ? 10 * 60 * 1000 : 60 * 60 * 1000),
  CREATE_ACCOUNT_MAX: parseInt(process.env.RATE_LIMIT_CREATE_ACCOUNT_MAX) || (isDevelopment ? 50 : 3),
  
  // Owner operation limits
  OWNER_WINDOW_MS: parseInt(process.env.RATE_LIMIT_OWNER_WINDOW_MS) || (60 * 60 * 1000),
  OWNER_MAX: parseInt(process.env.RATE_LIMIT_OWNER_MAX) || (isDevelopment ? 200 : 50),
  
  // Customer operation limits
  CUSTOMER_WINDOW_MS: parseInt(process.env.RATE_LIMIT_CUSTOMER_WINDOW_MS) || (60 * 60 * 1000),
  CUSTOMER_MAX: parseInt(process.env.RATE_LIMIT_CUSTOMER_MAX) || (isDevelopment ? 200 : 100),
  
  // Login limits
  LOGIN_WINDOW_MS: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS) || (isDevOrTest ? 1 * 60 * 1000 : 30 * 60 * 1000),
  CUSTOMER_LOGIN_MAX: parseInt(process.env.RATE_LIMIT_CUSTOMER_LOGIN_MAX) || (isDevOrTest ? 1000 : 5),
  OWNER_LOGIN_MAX: parseInt(process.env.RATE_LIMIT_OWNER_LOGIN_MAX) || (isDevOrTest ? 1000 : 10),
  
  // Email verification resend limits (strict to prevent email spam)
  RESEND_VERIFICATION_WINDOW_MS: parseInt(process.env.RATE_LIMIT_RESEND_VERIFICATION_WINDOW_MS) || (isDevelopment ? 10 * 60 * 1000 : 60 * 60 * 1000),
  RESEND_VERIFICATION_MAX: parseInt(process.env.RATE_LIMIT_RESEND_VERIFICATION_MAX) || (isDevelopment ? 20 : 3)
};

// General API rate limiter - applies to all API routes
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.API_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.API_MAX_REQUESTS,
  message: {
    error: 'تم تجاوز عدد الطلبات المسموح. يرجى المحاولة لاحقاً.',
    message: 'Too many requests, please try again later.',
    retryAfter: isDevelopment ? '1 minute' : '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for OPTIONS requests (CORS preflight)
    return req.method === 'OPTIONS';
  }
});

// Strict limiter for auth endpoints (login, register, refresh)
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.AUTH_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.AUTH_MAX_ATTEMPTS,
  message: {
    error: 'تم تجاوز عدد محاولات تسجيل الدخول. يرجى المحاولة لاحقاً.',
    message: 'Too many login attempts, please try again later.',
    retryAfter: isDevOrTest ? '1 minute' : '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  skip: (req) => {
    return req.method === 'OPTIONS' || isTest;
  },
  handler: (req, res) => {
    // Log rate limit violation
    securityLogger.logRateLimitViolation(req, RATE_LIMIT_CONFIG.AUTH_MAX_ATTEMPTS, RATE_LIMIT_CONFIG.AUTH_WINDOW_MS);
    
    const retryAfterMinutes = Math.ceil(RATE_LIMIT_CONFIG.AUTH_WINDOW_MS / (60 * 1000));
    res.status(429).json({
      error: 'تم تجاوز عدد محاولات تسجيل الدخول',
      message: 'Too many login attempts from this IP, please try again later.',
      retryAfter: `${retryAfterMinutes} minutes`
    });
  }
});

// Password reset limiter (very strict)
// Count ALL attempts (including successful ones) to prevent email spam
// Similar to resend verification - even if email doesn't exist, we return 200 OK for security
const passwordResetLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.PASSWORD_RESET_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.PASSWORD_RESET_MAX,
  message: {
    error: 'تم تجاوز عدد محاولات إعادة تعيين كلمة المرور',
    message: 'Too many password reset attempts',
    retryAfter: isDevelopment ? '10 minutes' : '1 hour'
  },
  skipSuccessfulRequests: false, // ✅ Count all attempts to prevent email spam
  handler: (req, res) => {
    // Log rate limit violation for password reset attempts
    securityLogger.logRateLimitViolation(req, RATE_LIMIT_CONFIG.PASSWORD_RESET_MAX, RATE_LIMIT_CONFIG.PASSWORD_RESET_WINDOW_MS);
    const retryAfterMinutes = Math.ceil(RATE_LIMIT_CONFIG.PASSWORD_RESET_WINDOW_MS / (60 * 1000));
    const retryAfterText = retryAfterMinutes >= 60 ? `${Math.floor(retryAfterMinutes / 60)} hour${Math.floor(retryAfterMinutes / 60) > 1 ? 's' : ''}` : `${retryAfterMinutes} minute${retryAfterMinutes > 1 ? 's' : ''}`;
    res.status(429).json({
      error: 'تم تجاوز عدد محاولات إعادة تعيين كلمة المرور',
      message: 'Too many password reset attempts from this IP, please try again later.',
      retryAfter: retryAfterText
    });
  }
});

// Create account limiter (prevent spam)
const createAccountLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.CREATE_ACCOUNT_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.CREATE_ACCOUNT_MAX,
  message: {
    error: 'تم تجاوز عدد محاولات إنشاء الحسابات',
    message: 'Too many accounts created from this IP',
    retryAfter: isDevelopment ? '10 minutes' : '1 hour'
  }
});

// Email verification resend limiter (strict to prevent email spam)
// Similar to password reset - counts ALL attempts (successful and failed) to prevent email spam
const resendVerificationLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.RESEND_VERIFICATION_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.RESEND_VERIFICATION_MAX,
  message: {
    error: 'تم تجاوز عدد محاولات إعادة إرسال رسالة التحقق',
    message: 'Too many verification email resend attempts',
    retryAfter: isDevelopment ? '10 minutes' : '1 hour'
  },
  // Count all attempts (including successful ones) to prevent email spam
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    // Log rate limit violation for verification resend attempts
    securityLogger.logRateLimitViolation(req, RATE_LIMIT_CONFIG.RESEND_VERIFICATION_MAX, RATE_LIMIT_CONFIG.RESEND_VERIFICATION_WINDOW_MS);
    
    const retryAfterMinutes = Math.ceil(RATE_LIMIT_CONFIG.RESEND_VERIFICATION_WINDOW_MS / (60 * 1000));
    const retryAfterText = retryAfterMinutes >= 60 ? `${Math.floor(retryAfterMinutes / 60)} hour${Math.floor(retryAfterMinutes / 60) > 1 ? 's' : ''}` : `${retryAfterMinutes} minute${retryAfterMinutes > 1 ? 's' : ''}`;
    
    res.status(429).json({
      error: 'تم تجاوز عدد محاولات إعادة إرسال رسالة التحقق',
      message: 'Too many verification email resend attempts from this IP, please try again later.',
      retryAfter: retryAfterText
    });
  }
});

// Owner-specific rate limiters - OPTIMIZED (single limiter for all operations)
const ownerOperationLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.OWNER_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.OWNER_MAX,
  message: {
    error: 'تم تجاوز عدد العمليات المسموحة',
    message: 'Too many operations from this IP',
    retryAfter: '1 hour'
  },
  skip: (req) => req.method === 'OPTIONS'
});

// OPTIMIZED: Use single owner limiter for all operations (eliminates duplication)
const ownerProductLimiter = ownerOperationLimiter;
const ownerUpdateLimiter = ownerOperationLimiter;
const ownerDeleteLimiter = ownerOperationLimiter;
const ownerBulkOperationLimiter = ownerOperationLimiter;
const ownerStatisticsLimiter = ownerOperationLimiter;
const ownerFileUploadLimiter = ownerOperationLimiter;

// Customer-specific rate limiters - OPTIMIZED (single limiter for all operations)
const customerOperationLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.CUSTOMER_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.CUSTOMER_MAX,
  message: {
    error: 'تم تجاوز عدد العمليات المسموحة',
    message: 'Too many operations from this IP',
    retryAfter: '1 hour'
  },
  skip: (req) => req.method === 'OPTIONS'
});

// Combined read/write limiter (eliminates duplication)
const customerReadLimiter = customerOperationLimiter; // Same limits for reads

const customerLoginLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.LOGIN_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.CUSTOMER_LOGIN_MAX,
  message: {
    error: 'تم تجاوز عدد محاولات تسجيل الدخول. يرجى المحاولة لاحقاً.',
    message: 'Too many login attempts, please try again later.',
    retryAfter: isDevOrTest ? '1 minute' : '30 minutes'
  },
  skipSuccessfulRequests: true,
  skip: (req) => req.method === 'OPTIONS' || isTest
});

// Owner login limiter (more lenient for business operations)
const ownerLoginLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.LOGIN_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.OWNER_LOGIN_MAX,
  message: {
    error: 'تم تجاوز عدد محاولات تسجيل الدخول. يرجى المحاولة لاحقاً.',
    message: 'Too many login attempts, please try again later.',
    retryAfter: isDevOrTest ? '1 minute' : '30 minutes'
  },
  skipSuccessfulRequests: true,
  skip: (req) => req.method === 'OPTIONS' || isTest
});

// Enhanced admin login limiter (stricter than owner login for security)
const adminLoginLimiter = rateLimit({
  windowMs: parseInt(process.env.ADMIN_LOGIN_WINDOW_MS) || (isDevOrTest ? 1 * 60 * 1000 : 15 * 60 * 1000), // 15 minutes in production
  max: parseInt(process.env.ADMIN_LOGIN_MAX_ATTEMPTS) || (isDevOrTest ? 1000 : 5), // 5 attempts in production
  message: {
    error: 'تم تجاوز عدد محاولات تسجيل الدخول. يرجى المحاولة لاحقاً.',
    message: 'Too many admin login attempts, please try again later.',
    retryAfter: isDevOrTest ? '1 minute' : '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: (req) => req.method === 'OPTIONS' || isTest,
  handler: (req, res) => {
    // Enhanced logging for admin login rate limit violations
    securityLogger.logRateLimitViolation(req, parseInt(process.env.ADMIN_LOGIN_MAX_ATTEMPTS) || (isDevOrTest ? 1000 : 5), parseInt(process.env.ADMIN_LOGIN_WINDOW_MS) || (isDevOrTest ? 1 * 60 * 1000 : 15 * 60 * 1000));
    
    // Log as suspicious activity for admin login attempts
    securityLogger.logSuspiciousActivity('ADMIN_LOGIN_RATE_LIMIT_EXCEEDED', req, {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      attemptedEmail: req.body?.email || req.body?.username || 'unknown'
    });
    
    const retryAfterMinutes = Math.ceil((parseInt(process.env.ADMIN_LOGIN_WINDOW_MS) || (isDevOrTest ? 1 * 60 * 1000 : 15 * 60 * 1000)) / (60 * 1000));
    res.status(429).json({
      error: 'تم تجاوز عدد محاولات تسجيل الدخول للإدارة',
      message: 'Too many admin login attempts from this IP, please try again later.',
      retryAfter: `${retryAfterMinutes} minutes`
    });
  }
});

// OPTIMIZED: Use single customer limiter for all operations (eliminates duplication)
const customerCommentLimiter = customerOperationLimiter;
const customerWishlistLimiter = customerOperationLimiter;
const customerReservationLimiter = customerOperationLimiter;
const customerCertificateLimiter = customerOperationLimiter;
const customerFavoriteLimiter = customerOperationLimiter;

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  createAccountLimiter,
  resendVerificationLimiter, // Strict limiter for email verification resend
  ownerOperationLimiter,
  ownerProductLimiter,
  ownerUpdateLimiter,
  ownerDeleteLimiter,
  ownerBulkOperationLimiter,
  ownerStatisticsLimiter,
  ownerFileUploadLimiter,
  ownerLoginLimiter,
  adminLoginLimiter, // Enhanced admin login limiter
  customerOperationLimiter,
  customerReadLimiter,
  customerLoginLimiter,
  customerCommentLimiter,
  customerWishlistLimiter,
  customerReservationLimiter,
  customerCertificateLimiter,
  customerFavoriteLimiter
};

