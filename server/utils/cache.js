/**
 * In-Memory Cache Utility
 * 
 * Uses node-cache for server-side caching
 * FREE - No additional services needed
 * Perfect for small to medium apps
 * 
 * Security: User-specific cache keys, no sensitive data
 */

const NodeCache = require('node-cache');
const { validateUserId } = require('./cacheKeys');

// Cache configuration optimized for Railway Starter ($5/month, 512MB RAM)
// Configurable via environment variable for flexibility
// Default: 500 keys (balanced for 50 concurrent users while staying within memory limits)
const CACHE_MAX_KEYS = parseInt(process.env.CACHE_MAX_KEYS) || 500;
const CACHE_STD_TTL = parseInt(process.env.CACHE_STD_TTL) || 300; // 5 minutes default TTL
const CACHE_CHECK_PERIOD = parseInt(process.env.CACHE_CHECK_PERIOD) || 60; // Check for expired keys every 60 seconds

// Create cache instance with optimized settings for cost efficiency
// maxKeys: Configurable (default 500) - Prevents memory bloat on Railway Starter
// useClones: false - Better performance and lower memory usage
const cache = new NodeCache({ 
  stdTTL: CACHE_STD_TTL,
  maxKeys: CACHE_MAX_KEYS,
  checkperiod: CACHE_CHECK_PERIOD,
  useClones: false // Better performance (don't clone objects)
});

// Cache statistics tracking
const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  invalidations: 0,
  memoryWarnings: 0
};

// Memory warning threshold (80% of maxKeys) - dynamically calculated
const MEMORY_WARNING_THRESHOLD = Math.floor(CACHE_MAX_KEYS * 0.8);

// Logging helper - only for important events
const logCacheEvent = (event, details = {}, level = 'INFO') => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    category: 'CACHE',
    event,
    details
  };
  
  // Only log warnings and errors in production
  if (level === 'WARN' || level === 'ERROR') {
    console.log(JSON.stringify(logEntry));
  }
};

// Log cache hit (silent - too verbose for production)
const logHit = (key) => {
  stats.hits++;
  // Removed: Too verbose for production
};

// Log cache miss (silent - too verbose for production)
const logMiss = (key) => {
  stats.misses++;
  // Removed: Too verbose for production
};

// Log cache set (silent - too verbose for production)
const logSet = (key, ttl) => {
  stats.sets++;
  // Removed: Too verbose for production
};

// Log cache delete (silent - too verbose for production)
const logDelete = (key, count = 1) => {
  stats.deletes += count;
  // Removed: Too verbose for production
};

// Log cache invalidation (silent - too verbose for production)
const logInvalidation = (pattern, count) => {
  stats.invalidations++;
  // Removed: Too verbose for production
};

// Check memory usage and log warning if needed
const checkMemoryUsage = () => {
  const keys = cache.keys();
  const keyCount = keys.length;
  
  if (keyCount >= MEMORY_WARNING_THRESHOLD) {
    stats.memoryWarnings++;
    logCacheEvent('CACHE_MEMORY_WARNING', {
      keyCount,
      maxKeys: cache.options.maxKeys,
      threshold: MEMORY_WARNING_THRESHOLD,
      percentage: Math.round((keyCount / cache.options.maxKeys) * 100)
    }, 'WARN');
  }
  
  return keyCount;
};

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {*} Cached value or undefined
 */
const get = (key) => {
  try {
    if (!key || typeof key !== 'string') {
      return undefined;
    }
    
    const value = cache.get(key);
    
    if (value !== undefined) {
      logHit(key);
      return value;
    } else {
      logMiss(key);
      return undefined;
    }
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'CACHE',
      event: 'CACHE_GET_ERROR',
      error: error.message,
      stack: error.stack
    }));
    logMiss(key);
    return undefined;
  }
};

/**
 * Set cached value
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttl - Time to live in seconds (optional, uses default if not provided)
 * @returns {boolean} Success
 */
const set = (key, value, ttl) => {
  try {
    if (!key || typeof key !== 'string') {
      return false;
    }
    
    // Check memory usage before setting
    checkMemoryUsage();
    
    const result = ttl 
      ? cache.set(key, value, ttl)
      : cache.set(key, value);
    
    if (result) {
      logSet(key, ttl || cache.options.stdTTL);
    }
    
    return result;
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'CACHE',
      event: 'CACHE_SET_ERROR',
      error: error.message,
      stack: error.stack
    }));
    return false;
  }
};

/**
 * Delete cached value
 * @param {string} key - Cache key
 * @returns {number} Number of deleted keys
 */
const del = (key) => {
  try {
    return cache.del(key);
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'CACHE',
      event: 'CACHE_DELETE_ERROR',
      error: error.message
    }));
    return 0;
  }
};

/**
 * Delete multiple cached values by pattern
 * @param {string} pattern - Pattern to match (e.g., 'products:*')
 * @returns {number} Number of deleted keys
 */
const delByPattern = (pattern) => {
  try {
    if (!pattern || typeof pattern !== 'string') {
      return 0;
    }
    
    const keys = cache.keys();
    let matchingKeys = [];
    
    // If pattern ends with *, match all keys that start with the prefix
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1); // Remove the *
      matchingKeys = keys.filter(key => key.startsWith(prefix));
    } else {
      // Use regex matching for more complex patterns
      // Escape special regex characters except * and ?
      const escapedPattern = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(`^${escapedPattern}$`);
      matchingKeys = keys.filter(key => regex.test(key));
    }
    
    if (matchingKeys.length > 0) {
      const deletedCount = cache.del(matchingKeys);
      logInvalidation(pattern, deletedCount);
      logDelete(pattern, deletedCount);
      
      return deletedCount;
    }
    
    return 0;
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'CACHE',
      event: 'CACHE_DELETE_PATTERN_ERROR',
      pattern,
      error: error.message,
      stack: error.stack
    }));
    return 0;
  }
};

/**
 * Clear all cache (use with caution)
 * @returns {void}
 */
const clear = () => {
  try {
    cache.flushAll();
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'CACHE',
      event: 'CACHE_CLEAR_ERROR',
      error: error.message
    }));
  }
};

/**
 * Get cache statistics
 * @returns {object} Cache stats
 */
const getStats = () => {
  const nodeCacheStats = cache.getStats();
  const keyCount = cache.keys().length;
  const memoryUsage = process.memoryUsage();
  
  // Calculate hit rate
  const totalRequests = stats.hits + stats.misses;
  const hitRate = totalRequests > 0 
    ? ((stats.hits / totalRequests) * 100).toFixed(2) 
    : 0;
  
  return {
    ...nodeCacheStats,
    keys: {
      total: keyCount,
      max: cache.options.maxKeys,
      warningThreshold: MEMORY_WARNING_THRESHOLD
    },
    performance: {
      hits: stats.hits,
      misses: stats.misses,
      hitRate: `${hitRate}%`,
      sets: stats.sets,
      deletes: stats.deletes,
      invalidations: stats.invalidations
    },
    memory: {
      warnings: stats.memoryWarnings,
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(memoryUsage.rss / 1024 / 1024) // MB
    }
  };
};

/**
 * Clear user-specific cache
 * @param {string} userId - User ID
 * @param {string} role - User role (optional, for role-based clearing)
 * @returns {number} Number of deleted keys
 */
const clearUserCache = (userId, role = null) => {
  try {
    // Validate user ID
    if (!validateUserId(userId)) {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        category: 'CACHE',
        event: 'INVALID_USER_ID',
        userId
      }));
      return 0;
    }
    
    let deletedCount = 0;
    
    // Clear user-specific cache patterns
    const patterns = [
      `*:user:${userId}:*`,
      `*:user:${userId}`, // Exact match
      `favorites:user:${userId}*`,
      `favorites:count:user:${userId}*`,
      `reservations:user:${userId}*`,
      `certificates:user:${userId}*`,
      `wishlist:user:${userId}*`,
      `user:profile:${userId}*`
    ];
    
    // If role is specified, also clear role-based cache
    if (role && ['owner', 'customer'].includes(role)) {
      patterns.push(
        `*:${role}:${userId}:*`,
        `*:${role}:${userId}`, // Exact match
        `reservations:${role}:${userId}*`,
        `certificates:${role}:${userId}*`,
        `wishlist:${role}:${userId}*`,
        `statistics:*:owner:${userId}*`,
        `material-prices:*:owner:${userId}*`,
        `favorite-alerts:${role}:${userId}*`,
        `users:search:${role}:${userId}*`,
        `products:search:${role}:${userId}*`
      );
    }
    
    // Delete by each pattern
    patterns.forEach(pattern => {
      deletedCount += delByPattern(pattern);
    });
    
    // Only log if significant number of keys deleted (not critical, so silent)
    // Removed verbose logging for production
    
    return deletedCount;
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'CACHE',
      event: 'CACHE_CLEAR_USER_ERROR',
      userId,
      error: error.message,
      stack: error.stack
    }));
    return 0;
  }
};

/**
 * Reset statistics
 * @returns {void}
 */
const resetStats = () => {
  stats.hits = 0;
  stats.misses = 0;
  stats.sets = 0;
  stats.deletes = 0;
  stats.invalidations = 0;
  stats.memoryWarnings = 0;
  // Removed: Stats reset is not critical enough to log
};

/**
 * Get memory usage information
 * @returns {object} Memory usage stats
 */
const getMemoryUsage = () => {
  const keyCount = checkMemoryUsage();
  const memoryUsage = process.memoryUsage();
  
  return {
    keyCount,
    maxKeys: cache.options.maxKeys,
    threshold: MEMORY_WARNING_THRESHOLD,
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(memoryUsage.rss / 1024 / 1024) // MB
    },
    warnings: stats.memoryWarnings
  };
};

module.exports = {
  get,
  set,
  del,
  delByPattern,
  clear,
  getStats,
  clearUserCache,
  resetStats,
  getMemoryUsage,
  checkMemoryUsage
};

