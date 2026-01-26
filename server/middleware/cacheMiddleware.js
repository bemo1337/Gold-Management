/**
 * Cache Middleware
 * 
 * Adds caching to Express routes with security-first approach
 * Security: User-specific cache keys, no sensitive data, proper headers
 */

const cache = require('../utils/cache');
const cacheKeys = require('../utils/cacheKeys');

// Sensitive endpoints that should never be cached
const SENSITIVE_ENDPOINTS = [
  '/login',
  '/register',
  '/logout',
  '/forgot-password',
  '/reset-password',
  '/change-password',
  '/verify-email',
  '/google-auth',
  '/refresh'
];

// Check if endpoint is sensitive
const isSensitiveEndpoint = (path) => {
  return SENSITIVE_ENDPOINTS.some(endpoint => path.includes(endpoint));
};

// Determine cache control header based on data type
const getCacheControlHeader = (ttl, isPublic = false, isUserSpecific = false) => {
  if (isUserSpecific) {
    // User-specific data: private cache, shorter TTL
    return `private, max-age=${ttl}, must-revalidate`;
  } else if (isPublic) {
    // Public data: can be cached by CDN with longer TTL
    // Add stale-while-revalidate for better performance
    return `public, max-age=${ttl}, stale-while-revalidate=${Math.min(ttl * 2, 3600)}`;
  } else {
    // Default: private cache
    return `private, max-age=${ttl}`;
  }
};

/**
 * Cache middleware for GET requests
 * @param {number} ttl - Time to live in seconds
 * @param {function} getCacheKey - Function to generate cache key from request
 * @param {object} options - Options { isPublic, isUserSpecific, requireAuth }
 * @returns {function} Express middleware
 */
const cacheMiddleware = (ttl = 300, getCacheKey = null, options = {}) => {
  const { isPublic = false, isUserSpecific = false, requireAuth = false } = options;
  
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching for sensitive endpoints
    if (isSensitiveEndpoint(req.path)) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      return next();
    }

    // Verify authentication for user-specific data
    if (requireAuth || isUserSpecific) {
      if (!req.user || !req.user._id) {
        // Not authenticated, skip caching user-specific data
        // Log security event for unauthorized cache access attempt
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'WARN',
          category: 'CACHE_SECURITY',
          event: 'UNAUTHORIZED_CACHE_ACCESS_ATTEMPT',
          path: req.path,
          method: req.method,
          hasUser: !!req.user,
          message: 'Attempted to cache user-specific data without authentication'
        }));
        res.set('Cache-Control', 'no-store, no-cache');
        return next();
      }
    }

    // Generate cache key
    let cacheKey;
    try {
      cacheKey = getCacheKey 
        ? getCacheKey(req) 
        : `cache:${req.method}:${req.path}:${JSON.stringify(req.query)}`;
      
      // Ensure cacheKey is a string
      if (!cacheKey || typeof cacheKey !== 'string') {
        throw new Error(`Invalid cache key generated: ${typeof cacheKey}`);
      }
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        category: 'CACHE_MIDDLEWARE',
        event: 'CACHE_KEY_GENERATION_ERROR',
        path: req.path,
        method: req.method,
        hasUser: !!req.user,
        userId: req.user?._id || req.user?.id,
        error: error.message,
        stack: error.stack
      }));
      // If cache key generation fails, skip caching but still set a header
      res.set('X-Cache', 'ERROR');
      res.set('X-Cache-Error', error.message);
      return next();
    }

    // Try to get from cache
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      // Set headers to prevent browser/CDN caching while allowing server-side caching
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      // Add cache debug headers only in development
      if (process.env.NODE_ENV === 'development') {
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        res.set('X-Cache-Timestamp', new Date().toISOString());
      }
      
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function(data) {
      // Only cache successful responses (status 200-299)
      // Default status code is 200 if not explicitly set
      const statusCode = res.statusCode || 200;
      
      if (statusCode >= 200 && statusCode < 300) {
        // Don't cache error responses or sensitive data
        if (data && typeof data === 'object') {
          // Check for sensitive data in response (including nested objects)
          // Enhanced detection for tokens, passwords, and other sensitive fields
          // Security: Never cache passwords, tokens, secrets, or verification/reset tokens
          const hasSensitiveData = data.token || data.password || data.refreshToken || data.accessToken ||
            data.secret || data.apiKey || data.privateKey ||
            data.verificationToken || data.passwordResetToken || data.resetToken ||
            (data.user && (data.user.token || data.user.password || data.user.refreshToken || 
             data.user.accessToken || data.user.secret || data.user.apiKey ||
             data.user.verificationToken || data.user.passwordResetToken || data.user.resetToken)) ||
            (Array.isArray(data) && data.some(item => 
              item && typeof item === 'object' && 
              (item.token || item.password || item.refreshToken || item.accessToken ||
               item.verificationToken || item.passwordResetToken || item.resetToken ||
               item.secret || item.apiKey || item.privateKey)
            ));
          
          if (!hasSensitiveData) {
            cache.set(cacheKey, data, ttl);
            // Set headers to prevent browser/CDN caching while allowing server-side caching
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
            
            // Add cache debug headers only in development
            if (process.env.NODE_ENV === 'development') {
              res.set('X-Cache', 'MISS');
              res.set('X-Cache-Key', cacheKey);
              res.set('X-Cache-Timestamp', new Date().toISOString());
            }
          } else {
            // Sensitive data found, don't cache
            // Log security event (only errors/warnings are logged in production)
            console.error(JSON.stringify({
              timestamp: new Date().toISOString(),
              level: 'WARN',
              category: 'CACHE_SECURITY',
              event: 'SENSITIVE_DATA_DETECTED',
              path: req.path,
              method: req.method,
              userId: req.user?._id || req.user?.id,
              role: req.user?.role,
              message: 'Attempted to cache response containing sensitive data'
            }));
            res.set('Cache-Control', 'no-store, no-cache');
            if (process.env.NODE_ENV === 'development') {
              res.set('X-Cache', 'SKIPPED');
              res.set('X-Cache-Key', cacheKey);
            }
          }
        } else {
          // Non-object data (string, number, etc.) or arrays
          if (Array.isArray(data)) {
            cache.set(cacheKey, data, ttl);
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
            if (process.env.NODE_ENV === 'development') {
              res.set('X-Cache', 'MISS');
              res.set('X-Cache-Key', cacheKey);
              res.set('X-Cache-Timestamp', new Date().toISOString());
            }
          } else {
            // Primitive types
            cache.set(cacheKey, data, ttl);
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
            if (process.env.NODE_ENV === 'development') {
              res.set('X-Cache', 'MISS');
              res.set('X-Cache-Key', cacheKey);
              res.set('X-Cache-Timestamp', new Date().toISOString());
            }
          }
        }
      } else {
        // Error response, don't cache
        res.set('Cache-Control', 'no-store, no-cache');
        if (process.env.NODE_ENV === 'development') {
          res.set('X-Cache', 'SKIPPED');
          res.set('X-Cache-Key', cacheKey);
        }
      }
      
      return originalJson(data);
    };

    next();
  };
};

/**
 * Invalidate cache by pattern(s)
 * @param {string|array|function} patternsOrFunction - Pattern(s) to match or function that returns patterns
 * @returns {function} Express middleware
 */
const invalidateCache = (patternsOrFunction) => {
  return (req, res, next) => {
    // Only invalidate on mutation requests
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return next();
    }

    // Invalidate cache BEFORE processing the request to ensure fresh data on next GET
    // This ensures that any subsequent requests will get fresh data from the database
    try {
      let patternsToInvalidate = [];
      
      // If patternsOrFunction is a function, call it to get patterns
      if (typeof patternsOrFunction === 'function') {
        const result = patternsOrFunction(req);
        if (result) {
          if (Array.isArray(result)) {
            patternsToInvalidate.push(...result);
          } else {
            patternsToInvalidate.push(result);
          }
        }
      } else if (patternsOrFunction) {
        // Static patterns provided
        if (Array.isArray(patternsOrFunction)) {
          patternsToInvalidate.push(...patternsOrFunction);
        } else {
          patternsToInvalidate.push(patternsOrFunction);
        }
      }
      
      // Invalidate all patterns BEFORE processing
      let totalDeleted = 0;
      patternsToInvalidate.forEach(pattern => {
        if (pattern && typeof pattern === 'string') {
          const deleted = cache.delByPattern(pattern);
          totalDeleted += deleted;
        }
      });
      
      // Also clear ALL product-related cache keys to ensure complete cache invalidation
      // This ensures all variations (public, user-specific, role-based) are cleared
      if (patternsToInvalidate.some(p => p && typeof p === 'string' && p.includes('products'))) {
        const additionalPatterns = [
          'products:*',
          'product:*',
          'products:public:*',
          'products:user:*',
          'products:owner:*',
          'products:customer:*'
        ];
        additionalPatterns.forEach(pattern => {
          const deleted = cache.delByPattern(pattern);
          totalDeleted += deleted;
        });
      }
      
      // Store invalidation info for response headers (only in development for debugging)
      if (process.env.NODE_ENV === 'development' && (totalDeleted > 0 || patternsToInvalidate.length > 0)) {
        res.locals.cacheInvalidated = {
          patterns: patternsToInvalidate,
          count: totalDeleted
        };
      } else if (totalDeleted > 0 || patternsToInvalidate.length > 0) {
        // In production, only store minimal info
        res.locals.cacheInvalidated = {
          count: totalDeleted
        };
      }
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        category: 'CACHE_MIDDLEWARE',
        event: 'CACHE_INVALIDATION_ERROR',
        path: req.path,
        method: req.method,
        error: error.message,
        stack: error.stack
      }));
    }

    // Store original json method to add headers
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // Add cache invalidation headers (only in development for debugging)
      if (res.locals.cacheInvalidated && process.env.NODE_ENV === 'development') {
        if (res.locals.cacheInvalidated.patterns) {
          res.set('X-Cache-Invalidated', res.locals.cacheInvalidated.patterns.join(', '));
        }
        res.set('X-Cache-Invalidated-Count', res.locals.cacheInvalidated.count.toString());
      }
      
      // Always set no-cache headers for mutation responses to prevent browser caching
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * Clear user cache middleware (for logout, password change, etc.)
 * @returns {function} Express middleware
 */
const clearUserCacheMiddleware = () => {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // Only clear cache on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const userId = req.user?._id || req.user?.id;
          const role = req.user?.role;
          
          if (userId) {
            const deletedCount = cache.clearUserCache(userId, role);
            if (deletedCount > 0) {
              res.set('X-Cache-Cleared', 'user');
              res.set('X-Cache-Cleared-Count', deletedCount.toString());
            }
          }
        } catch (error) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            category: 'CACHE_MIDDLEWARE',
            event: 'CACHE_CLEAR_USER_ERROR',
            path: req.path,
            userId: req.user?._id || req.user?.id,
            error: error.message
          }));
        }
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

// Export cache key generators for convenience
module.exports = {
  cacheMiddleware,
  invalidateCache,
  clearUserCacheMiddleware,
  // Cache key generators from cacheKeys
  cacheKeys,
  // Helper functions
  isSensitiveEndpoint,
  getCacheControlHeader
};
