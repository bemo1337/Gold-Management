/**
 * Secure Cache Key Generator
 * 
 * Generates secure, user-specific cache keys with input sanitization
 * Security: Prevents cache key injection, includes role-based separation
 */

const crypto = require('crypto');

/**
 * Sanitize input to prevent cache key injection
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove dangerous characters that could be used for injection
  // Only allow alphanumeric, hyphens, underscores, and colons
  return input.replace(/[^a-zA-Z0-9:_-]/g, '').substring(0, 100);
};

/**
 * Validate user ID format
 * @param {string|Object} userId - User ID to validate (can be string or ObjectId)
 * @returns {boolean} True if valid
 */
const validateUserId = (userId) => {
  if (!userId) {
    return false;
  }
  
  // Convert ObjectId to string if needed
  const userIdStr = userId.toString ? userId.toString() : String(userId);
  
  // MongoDB ObjectId format: 24 hex characters
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(userIdStr) || userIdStr === 'anonymous';
};

/**
 * Hash sensitive query parameters
 * @param {object} params - Query parameters to hash
 * @returns {string} Hash of parameters
 */
const hashQueryParams = (params) => {
  if (!params || typeof params !== 'object') {
    return '';
  }
  
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return crypto.createHash('sha256')
    .update(sortedParams)
    .digest('hex')
    .substring(0, 16);
};

/**
 * Generate user-specific cache key
 * @param {string} prefix - Cache key prefix (e.g., 'products', 'reservations')
 * @param {string|Object} userId - User ID (can be string or ObjectId)
 * @param {string} role - User role (owner/customer)
 * @param {object} params - Additional parameters
 * @returns {string} Cache key
 */
const generateUserCacheKey = (prefix, userId, role = null, params = {}) => {
  const sanitizedPrefix = sanitizeInput(prefix);
  
  // Convert ObjectId to string if needed
  const userIdStr = userId && userId.toString ? userId.toString() : String(userId || '');
  
  if (!validateUserId(userIdStr)) {
    throw new Error(`Invalid user ID for cache key generation: ${typeof userId} - ${userIdStr}`);
  }
  
  const sanitizedUserId = sanitizeInput(userIdStr);
  const parts = [sanitizedPrefix, 'user', sanitizedUserId];
  
  if (role) {
    const sanitizedRole = sanitizeInput(role);
    if (['owner', 'customer'].includes(sanitizedRole)) {
      parts.push(sanitizedRole);
    }
  }
  
  // Add parameters
  if (params && Object.keys(params).length > 0) {
    const paramHash = hashQueryParams(params);
    if (paramHash) {
      parts.push(paramHash);
    }
  }
  
  return parts.join(':');
};

/**
 * Generate public cache key
 * @param {string} prefix - Cache key prefix
 * @param {object} params - Parameters
 * @returns {string} Cache key
 */
const generatePublicCacheKey = (prefix, params = {}) => {
  const sanitizedPrefix = sanitizeInput(prefix);
  const parts = [sanitizedPrefix, 'public'];
  
  // Add parameters
  if (params && Object.keys(params).length > 0) {
    const paramHash = hashQueryParams(params);
    if (paramHash) {
      parts.push(paramHash);
    }
  }
  
  return parts.join(':');
};

/**
 * Generate role-specific cache key
 * @param {string} prefix - Cache key prefix
 * @param {string} role - User role (owner/customer)
 * @param {string|Object} userId - User ID (can be string or ObjectId)
 * @param {object} params - Additional parameters
 * @returns {string} Cache key
 */
const generateRoleCacheKey = (prefix, role, userId, params = {}) => {
  const sanitizedPrefix = sanitizeInput(prefix);
  const sanitizedRole = sanitizeInput(role);
  
  if (!['owner', 'customer'].includes(sanitizedRole)) {
    throw new Error('Invalid role for cache key generation');
  }
  
  // Convert ObjectId to string if needed
  const userIdStr = userId && userId.toString ? userId.toString() : String(userId || '');
  
  if (!validateUserId(userIdStr)) {
    throw new Error(`Invalid user ID for cache key generation: ${typeof userId} - ${userIdStr}`);
  }
  
  const sanitizedUserId = sanitizeInput(userIdStr);
  const parts = [sanitizedPrefix, sanitizedRole, sanitizedUserId];
  
  // Add parameters
  if (params && Object.keys(params).length > 0) {
    const paramHash = hashQueryParams(params);
    if (paramHash) {
      parts.push(paramHash);
    }
  }
  
  return parts.join(':');
};

/**
 * Generate product cache key
 * @param {object} req - Express request
 * @returns {string} Cache key
 */
const generateProductCacheKey = (req) => {
  const userId = req.user?._id || req.user?.id || 'anonymous';
  const role = req.user?.role || null;
  const page = req.query.page || '1';
  const limit = req.query.limit || '10';
  const search = req.query.search || '';
  const materials = req.query.materials || '';
  const minPrice = req.query.minPrice || '';
  const maxPrice = req.query.maxPrice || '';
  
  const params = {
    page: sanitizeInput(page.toString()),
    limit: sanitizeInput(limit.toString()),
    search: sanitizeInput(search),
    materials: sanitizeInput(materials),
    minPrice: sanitizeInput(minPrice.toString()),
    maxPrice: sanitizeInput(maxPrice.toString())
  };
  
  if (userId === 'anonymous' || !req.user) {
    return generatePublicCacheKey('products', params);
  }
  
  return generateUserCacheKey('products', userId, role, params);
};

/**
 * Generate individual product cache key
 * @param {string} productId - Product ID
 * @param {string} userId - User ID (optional)
 * @returns {string} Cache key
 */
const generateProductByIdCacheKey = (productId, userId = 'anonymous') => {
  const sanitizedProductId = sanitizeInput(productId);
  const sanitizedUserId = validateUserId(userId) ? sanitizeInput(userId) : 'anonymous';
  
  return `product:${sanitizedProductId}:user:${sanitizedUserId}`;
};

/**
 * Generate favorites cache key
 * @param {string|Object} userId - User ID (can be string or ObjectId)
 * @returns {string} Cache key
 */
const generateFavoritesCacheKey = (userId) => {
  // Convert ObjectId to string if needed
  const userIdStr = userId && userId.toString ? userId.toString() : String(userId || '');
  
  if (!validateUserId(userIdStr)) {
    throw new Error(`Invalid user ID for favorites cache key: ${typeof userId} - ${userIdStr}`);
  }
  
  return generateUserCacheKey('favorites', userIdStr);
};

/**
 * Generate favorites count cache key
 * @param {string|Object} userId - User ID (can be string or ObjectId)
 * @returns {string} Cache key
 */
const generateFavoritesCountCacheKey = (userId) => {
  // Convert ObjectId to string if needed
  const userIdStr = userId && userId.toString ? userId.toString() : String(userId || '');
  
  if (!validateUserId(userIdStr)) {
    throw new Error(`Invalid user ID for favorites count cache key: ${typeof userId} - ${userIdStr}`);
  }
  
  return `favorites:count:user:${sanitizeInput(userIdStr)}`;
};

/**
 * Generate reservations cache key
 * @param {object} req - Express request
 * @param {string} type - Type: 'user' or 'owner'
 * @returns {string} Cache key
 */
const generateReservationsCacheKey = (req, type = 'user') => {
  const userId = req.user?._id || req.user?.id;
  const role = req.user?.role;
  
  if (!userId) {
    throw new Error('User ID required for reservations cache key');
  }
  
  const filters = {
    status: req.query.status || '',
    page: req.query.page || '1',
    limit: req.query.limit || '10'
  };
  
  if (type === 'owner') {
    return generateRoleCacheKey('reservations', 'owner', userId, filters);
  }
  
  return generateUserCacheKey('reservations', userId, role, filters);
};

/**
 * Generate comments cache key
 * @param {string} productId - Product ID
 * @returns {string} Cache key
 */
const generateCommentsCacheKey = (productId) => {
  const sanitizedProductId = sanitizeInput(productId);
  return `comments:product:${sanitizedProductId}`;
};

/**
 * Generate certificates cache key
 * @param {object} req - Express request
 * @param {string} type - Type: 'user' or 'owner'
 * @returns {string} Cache key
 */
const generateCertificatesCacheKey = (req, type = 'user') => {
  const userId = req.user?._id || req.user?.id;
  const role = req.user?.role;
  
  if (!userId) {
    throw new Error('User ID required for certificates cache key');
  }
  
  if (type === 'owner') {
    return generateRoleCacheKey('certificates', 'owner', userId);
  }
  
  return generateUserCacheKey('certificates', userId, role);
};

/**
 * Generate certificate by ID cache key
 * @param {string} certificateId - Certificate ID
 * @returns {string} Cache key
 */
const generateCertificateByIdCacheKey = (certificateId) => {
  const sanitizedCertId = sanitizeInput(certificateId);
  return `certificate:${sanitizedCertId}`;
};

/**
 * Generate user profile cache key
 * @param {string|Object} userId - User ID (can be string or ObjectId)
 * @returns {string} Cache key
 */
const generateUserProfileCacheKey = (userId) => {
  // Convert ObjectId to string if needed
  const userIdStr = userId && userId.toString ? userId.toString() : String(userId || '');
  
  if (!validateUserId(userIdStr)) {
    throw new Error(`Invalid user ID for profile cache key: ${typeof userId} - ${userIdStr}`);
  }
  
  return `user:profile:${sanitizeInput(userIdStr)}`;
};

/**
 * Generate user search cache key
 * @param {object} req - Express request
 * @returns {string} Cache key
 */
const generateUserSearchCacheKey = (req) => {
  const ownerId = req.user?._id || req.user?.id;
  const query = req.query.query || req.query.search || '';
  
  if (!ownerId) {
    throw new Error('Owner ID required for user search cache key');
  }
  
  const params = {
    query: sanitizeInput(query)
  };
  
  return generateRoleCacheKey('users:search', 'owner', ownerId, params);
};

/**
 * Generate wishlist cache key
 * @param {object} req - Express request
 * @param {string} type - Type: 'user' or 'owner'
 * @returns {string} Cache key
 */
const generateWishlistCacheKey = (req, type = 'user') => {
  const userId = req.user?._id || req.user?.id;
  const role = req.user?.role;
  
  if (!userId) {
    throw new Error('User ID required for wishlist cache key');
  }
  
  if (type === 'owner') {
    return generateRoleCacheKey('wishlist', 'owner', userId);
  }
  
  return generateUserCacheKey('wishlist', userId, role);
};

/**
 * Generate statistics cache key
 * @param {string} ownerId - Owner ID
 * @param {string} productId - Product ID (optional)
 * @returns {string} Cache key
 */
const generateStatisticsCacheKey = (ownerId, productId = null) => {
  if (!validateUserId(ownerId)) {
    throw new Error('Invalid owner ID for statistics cache key');
  }
  
  const sanitizedOwnerId = sanitizeInput(ownerId);
  
  if (productId) {
    const sanitizedProductId = sanitizeInput(productId);
    return `statistics:product:${sanitizedProductId}:owner:${sanitizedOwnerId}`;
  }
  
  return `statistics:products:owner:${sanitizedOwnerId}`;
};

/**
 * Generate material prices cache key
 * @param {string} ownerId - Owner ID
 * @param {string} karat - Karat (optional)
 * @returns {string} Cache key
 */
const generateMaterialPricesCacheKey = (ownerId, karat = null) => {
  if (!validateUserId(ownerId)) {
    throw new Error('Invalid owner ID for material prices cache key');
  }
  
  const sanitizedOwnerId = sanitizeInput(ownerId);
  
  if (karat) {
    const sanitizedKarat = sanitizeInput(karat.toString());
    return `material-prices:gold:${sanitizedKarat}:owner:${sanitizedOwnerId}`;
  }
  
  return `material-prices:owner:${sanitizedOwnerId}`;
};

/**
 * Generate favorite alerts cache key
 * @param {string} ownerId - Owner ID
 * @returns {string} Cache key
 */
const generateFavoriteAlertsCacheKey = (ownerId) => {
  if (!validateUserId(ownerId)) {
    throw new Error('Invalid owner ID for favorite alerts cache key');
  }
  
  return generateRoleCacheKey('favorite-alerts', 'owner', ownerId);
};

/**
 * Generate unseen count cache key
 * @param {string} type - Type: 'reservations' or 'wishlist'
 * @param {string} ownerId - Owner ID
 * @returns {string} Cache key
 */
const generateUnseenCountCacheKey = (type, ownerId) => {
  if (!validateUserId(ownerId)) {
    throw new Error('Invalid owner ID for unseen count cache key');
  }
  
  const sanitizedType = sanitizeInput(type);
  const sanitizedOwnerId = sanitizeInput(ownerId);
  
  return `${sanitizedType}:unseen-count:owner:${sanitizedOwnerId}`;
};

/**
 * Generate product search cache key (owner)
 * @param {object} req - Express request
 * @returns {string} Cache key
 */
const generateProductSearchCacheKey = (req) => {
  const ownerId = req.user?._id || req.user?.id;
  const query = req.query.query || req.query.search || '';
  
  if (!ownerId) {
    throw new Error('Owner ID required for product search cache key');
  }
  
  const params = {
    query: sanitizeInput(query)
  };
  
  return generateRoleCacheKey('products:search', 'owner', ownerId, params);
};

/**
 * Generate all users cache key (owner only)
 * @param {string|Object} ownerId - Owner ID (can be string or ObjectId)
 * @returns {string} Cache key
 */
const generateAllUsersCacheKey = (ownerId) => {
  if (!validateUserId(ownerId)) {
    throw new Error('Invalid owner ID for all users cache key');
  }
  
  const sanitizedOwnerId = sanitizeInput(ownerId.toString ? ownerId.toString() : String(ownerId));
  return `users:all:owner:${sanitizedOwnerId}`;
};

/**
 * Generate product reservation check cache key
 * @param {string} productId - Product ID
 * @param {string|Object} userId - User ID (optional, can be string or ObjectId)
 * @returns {string} Cache key
 */
const generateProductReservationCheckCacheKey = (productId, userId = 'anonymous') => {
  const sanitizedProductId = sanitizeInput(productId);
  const userIdStr = userId && userId.toString ? userId.toString() : String(userId || 'anonymous');
  const sanitizedUserId = validateUserId(userIdStr) ? sanitizeInput(userIdStr) : 'anonymous';
  
  return `reservation:check:product:${sanitizedProductId}:user:${sanitizedUserId}`;
};

/**
 * Generate wishlist request by ID cache key
 * @param {string} requestId - Wishlist request ID
 * @param {string|Object} userId - User ID (can be string or ObjectId)
 * @param {string} role - User role (owner/customer)
 * @returns {string} Cache key
 */
const generateWishlistRequestByIdCacheKey = (requestId, userId, role) => {
  const sanitizedRequestId = sanitizeInput(requestId);
  
  // Convert ObjectId to string if needed
  const userIdStr = userId && userId.toString ? userId.toString() : String(userId || '');
  
  if (!validateUserId(userIdStr)) {
    throw new Error(`Invalid user ID for wishlist request cache key: ${typeof userId} - ${userIdStr}`);
  }
  
  const sanitizedUserId = sanitizeInput(userIdStr);
  const sanitizedRole = sanitizeInput(role);
  
  // Role-based cache key to ensure proper isolation
  if (sanitizedRole === 'owner') {
    return `wishlist:request:${sanitizedRequestId}:owner:${sanitizedUserId}`;
  } else {
    return `wishlist:request:${sanitizedRequestId}:user:${sanitizedUserId}`;
  }
};

module.exports = {
  sanitizeInput,
  validateUserId,
  hashQueryParams,
  generateUserCacheKey,
  generatePublicCacheKey,
  generateRoleCacheKey,
  generateProductCacheKey,
  generateProductByIdCacheKey,
  generateFavoritesCacheKey,
  generateFavoritesCountCacheKey,
  generateReservationsCacheKey,
  generateCommentsCacheKey,
  generateCertificatesCacheKey,
  generateCertificateByIdCacheKey,
  generateUserProfileCacheKey,
  generateUserSearchCacheKey,
  generateWishlistCacheKey,
  generateStatisticsCacheKey,
  generateMaterialPricesCacheKey,
  generateFavoriteAlertsCacheKey,
  generateUnseenCountCacheKey,
  generateProductSearchCacheKey,
  generateWishlistRequestByIdCacheKey,
  generateAllUsersCacheKey,
  generateProductReservationCheckCacheKey
};

