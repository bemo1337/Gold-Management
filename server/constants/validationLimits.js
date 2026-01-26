/**
 * Validation Limits Constants
 * 
 * Centralized location for all validation limits used throughout the application.
 * This makes it easy to adjust limits and ensures consistency.
 */

module.exports = {
  // String length limits
  STRING_LIMITS: {
    NAME: 200,
    DESCRIPTION: 2000,
    USERNAME: 30,
    EMAIL: 100,
    TITLE: 100,
    COMMENT: 500,
    LOCATION: 100,
    ADDITIONAL_INFO: 1000,
    PRODUCT_SPECS: 1000,
    MESSAGE: 2000,
    NOTES: 2000,
    DEFAULT: 1000 // Default limit for unspecified strings
  },

  // Numeric limits
  NUMERIC_LIMITS: {
    RING_SIZE_MIN: 1,
    RING_SIZE_MAX: 50, // Increased to accommodate various sizing systems (US: 3-13, European: 40-70, UK: varies)
    DURATION_HOURS_MIN: 1,
    DURATION_HOURS_MAX: 168, // 1 week
    PASSWORD_MIN_LENGTH: 8, // Minimum for customers
    PASSWORD_MIN_LENGTH_OWNER: 12, // Minimum for owner/admin accounts
    PASSWORD_MAX_LENGTH: 128
  },

  // Array limits
  ARRAY_LIMITS: {
    MAX_RING_SIZES: 50,
    MAX_SET_ACCESSORIES: 10,
    MAX_STONES: 20
  },

  // File upload limits
  FILE_LIMITS: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_FILES: 10,
    MAX_TOTAL_SIZE: 5 * 1024 * 1024, // 5MB total
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    ALLOWED_MIMETYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  },

  // Validation patterns
  PATTERNS: {
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    USERNAME: /^[a-zA-Z0-9_]{3,30}$/
  },

  // Product type validation (from model - original enum)
  VALID_PRODUCT_TYPES: ['خاتم', 'محبس', 'اسم', 'حلق', 'اسوارة', 'طوق', 'طقم', 'خلخال', 'ليرة', 'نصف ليرة', 'ربع ليرة', 'أونصة'],

  // Material type validation
  VALID_MATERIALS: ['ذهب', 'فضة', 'ألماس'],

  // Set accessories validation (for طقم products)
  VALID_SET_ACCESSORIES: ['خاتم', 'سوار', 'قلادة', 'أقراط', 'دبوس'],

  // Stone validation (for diamond products)
  STONE_TYPES: ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3'],
  STONE_COLORS: ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],

  // Token expiry times
  TOKEN_EXPIRY: {
    ACCESS_TOKEN_DEV: '24h',
    ACCESS_TOKEN_PROD: '1h',
    // Admin tokens have shorter expiration for security
    ADMIN_ACCESS_TOKEN_DEV: '24h', // Same as dev for testing
    ADMIN_ACCESS_TOKEN_PROD: '2h', // 2 hours for admin in production (shorter than regular users)
    REFRESH_TOKEN_MS: 5 * 24 * 60 * 60 * 1000, // 5 days in milliseconds (reduced from 7 days for security)
    VERIFICATION_TOKEN_MS: 12 * 60 * 60 * 1000, // 12 hours in milliseconds (reduced from 24 hours for security)
    PASSWORD_RESET_TOKEN_MS: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
  },

  // Security constants
  SECURITY: {
    BCRYPT_ROUNDS: 10,
    REFRESH_TOKEN_BYTES: 64
  },

  // Price validation thresholds
  PRICE_THRESHOLDS: {
    USD_THRESHOLD: 50,
    SYP_THRESHOLD: 50000,
    PERCENTAGE_THRESHOLD: 0.05 // 5%
  },

  // Query limits
  QUERY_LIMITS: {
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },

  // Priority validation
  VALID_PRIORITIES: ['low', 'medium', 'high', 'urgent'],

  // Weak passwords to reject
  WEAK_PASSWORDS: ['password', '123456', '12345678', 'qwerty', 'abc123', 'password123'],

  // Suspicious patterns for password validation
  SUSPICIOUS_PATTERNS: [
    /['"]/,      // Quotes
    /--/,        // SQL comments
    /\/\*/,      // SQL block comments
    /union/i,    // SQL union
    /select/i,   // SQL select
    /insert/i,   // SQL insert
    /update/i,   // SQL update
    /delete/i,   // SQL delete
    /drop/i,     // SQL drop
    /script/i,   // XSS attempts
    /<script/i,  // XSS attempts
    /javascript:/i // XSS attempts
  ],

  // Password complexity requirements
  PASSWORD_COMPLEXITY: {
    REQUIRE_UPPERCASE: true,  // At least one uppercase letter
    REQUIRE_LOWERCASE: true,  // At least one lowercase letter
    REQUIRE_NUMBER: true,     // At least one number
    REQUIRE_SPECIAL: true     // At least one special character
  },

  // Account lockout configuration
  LOCKOUT: {
    MAX_FAILED_ATTEMPTS: 5,                     // Lock after 5 failed attempts
    INITIAL_LOCKOUT_MS: 15 * 60 * 1000,        // 15 minutes
    MEDIUM_LOCKOUT_MS: 30 * 60 * 1000,         // 30 minutes (7-10 attempts)
    LONG_LOCKOUT_MS: 60 * 60 * 1000,           // 1 hour (10-20 attempts)
    EXTENDED_LOCKOUT_MS: 24 * 60 * 60 * 1000,  // 24 hours (20+ attempts)
    RESET_WINDOW_MS: 60 * 60 * 1000            // Reset attempts after 1 hour of no activity
  }
};

