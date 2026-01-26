const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const securityLogger = require('../utils/securityLogger');
const VALIDATION_LIMITS = require('../constants/validationLimits');

// MongoDB NoSQL injection protection - Railway compatible
const sanitizeMongo = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    // Log security event
    securityLogger.logSuspiciousActivity('NOSQL_INJECTION_ATTEMPT', req, {
      key,
      value: req.body[key]?.substring(0, 100), // Truncate long values
      severity: 'HIGH'
    });
  },
  // Fix for Railway compatibility
  onError: (err, req, res, next) => {
    next();
  }
});

// XSS protection
const sanitizeXSS = xss({
  whiteList: {
    // Allow basic HTML tags for rich text (if needed)
    p: [],
    br: [],
    strong: [],
    em: []
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script']
});

// HTTP Parameter Pollution protection
const sanitizeHPP = hpp();

// Custom MongoDB sanitization (Railway compatible)
const sanitizeMongoCustom = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        // Remove MongoDB operators
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
          securityLogger.logSuspiciousActivity('NOSQL_INJECTION_ATTEMPT', req, {
            key,
            severity: 'HIGH'
          });
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      }
    }
    return obj;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Custom input sanitization with XSS and MongoDB protection
const sanitizeInput = (req, res, next) => {
  // Sanitize string inputs
  const sanitizeString = (obj) => {
    if (typeof obj === 'string') {
      // Remove dangerous characters and XSS attempts
      return obj
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove object tags
        .replace(/<embed\b[^<]*>/gi, '') // Remove embed tags
        .replace(/<link\b[^<]*>/gi, '') // Remove link tags
        .replace(/<meta\b[^<]*>/gi, '') // Remove meta tags
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove style tags
        .trim();
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        // Remove MongoDB operators
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
          securityLogger.logSuspiciousActivity('NOSQL_INJECTION_ATTEMPT', req, {
            key,
            severity: 'HIGH'
          });
        } else if (typeof obj[key] === 'string') {
          obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object') {
          sanitizeString(obj[key]);
        }
      }
    }
    return obj;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeString(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeString(req.query);
  }

  // Sanitize route parameters
  if (req.params) {
    req.params = sanitizeString(req.params);
  }

  next();
};

// Validate ObjectId format
const validateObjectId = (req, res, next) => {
  const mongoose = require('mongoose');
  
  // Check all params for ObjectId format
  for (const [key, value] of Object.entries(req.params)) {
    if (key.includes('id') || key.includes('Id')) {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return res.status(400).json({ 
          message: 'Invalid ID format',
          error: 'INVALID_ID_FORMAT'
        });
      }
    }
  }
  
  next();
};

// Limit string lengths
const limitStringLengths = (req, res, next) => {
  const limits = {
    name: VALIDATION_LIMITS.STRING_LIMITS.NAME,
    description: VALIDATION_LIMITS.STRING_LIMITS.DESCRIPTION,
    username: VALIDATION_LIMITS.STRING_LIMITS.USERNAME,
    email: VALIDATION_LIMITS.STRING_LIMITS.EMAIL,
    title: VALIDATION_LIMITS.STRING_LIMITS.TITLE
  };

  const checkLength = (obj, path = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string') {
        const limit = limits[key] || VALIDATION_LIMITS.STRING_LIMITS.DEFAULT;
        if (value.length > limit) {
          // Log validation failure
          securityLogger.logValidationFailure(req, currentPath, value, 'STRING_TOO_LONG');
          
          return res.status(400).json({ 
            message: `Field ${key} exceeds maximum length of ${limit} characters`,
            error: 'STRING_TOO_LONG'
          });
        }
      } else if (typeof value === 'object' && value !== null) {
        const result = checkLength(value, currentPath);
        if (result) return result;
      }
    }
    return null;
  };

  if (req.body) {
    const result = checkLength(req.body);
    if (result) return result;
  }

  next();
};

// Validate numeric inputs
const validateNumericInputs = (req, res, next) => {
  const numericFields = ['weight', 'price', 'karat', 'count', 'size'];
  
  const validateNumbers = (obj) => {
    for (const [key, value] of Object.entries(obj)) {
      if (numericFields.includes(key)) {
        if (typeof value === 'string') {
          const num = parseFloat(value);
          if (isNaN(num) || num < 0) {
            // Log validation failure
            securityLogger.logValidationFailure(req, key, value, 'INVALID_NUMERIC');
            
            return res.status(400).json({ 
              message: `Invalid numeric value for ${key}`,
              error: 'INVALID_NUMERIC'
            });
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        const result = validateNumbers(value);
        if (result) return result;
      }
    }
    return null;
  };

  if (req.body) {
    const result = validateNumbers(req.body);
    if (result) return result;
  }

  next();
};

// Customer-specific input validation
const validateCustomerInput = (req, res, next) => {
  const customerFields = [
    'comment', 'description', 'message', 'notes', 'title', 'location',
    'productId', 'durationHours', 'priority', 'deadline', 'additionalInfo'
  ];
  
  const validateCustomerFields = (obj) => {
    for (const [key, value] of Object.entries(obj)) {
      if (customerFields.includes(key) && typeof value === 'string') {
        // Check length limits using constants
        if (key === 'comment' && value.length > VALIDATION_LIMITS.STRING_LIMITS.COMMENT) {
          securityLogger.logValidationFailure(req, key, value, 'COMMENT_TOO_LONG');
          return res.status(400).json({ 
            message: `Comment exceeds maximum length of ${VALIDATION_LIMITS.STRING_LIMITS.COMMENT} characters`,
            error: 'COMMENT_TOO_LONG'
          });
        }
        
        if ((key === 'description' || key === 'message') && value.length > VALIDATION_LIMITS.STRING_LIMITS.DESCRIPTION) {
          securityLogger.logValidationFailure(req, key, value, 'DESCRIPTION_TOO_LONG');
          return res.status(400).json({ 
            message: `Description exceeds maximum length of ${VALIDATION_LIMITS.STRING_LIMITS.DESCRIPTION} characters`,
            error: 'DESCRIPTION_TOO_LONG'
          });
        }
        
        if (key === 'title' && value.length > VALIDATION_LIMITS.STRING_LIMITS.TITLE) {
          securityLogger.logValidationFailure(req, key, value, 'TITLE_TOO_LONG');
          return res.status(400).json({ 
            message: `Title exceeds maximum length of ${VALIDATION_LIMITS.STRING_LIMITS.TITLE} characters`,
            error: 'TITLE_TOO_LONG'
          });
        }
        
        if (key === 'location' && value.length > VALIDATION_LIMITS.STRING_LIMITS.LOCATION) {
          securityLogger.logValidationFailure(req, key, value, 'LOCATION_TOO_LONG');
          return res.status(400).json({ 
            message: `Location exceeds maximum length of ${VALIDATION_LIMITS.STRING_LIMITS.LOCATION} characters`,
            error: 'LOCATION_TOO_LONG'
          });
        }
        
        if (key === 'additionalInfo' && value.length > VALIDATION_LIMITS.STRING_LIMITS.ADDITIONAL_INFO) {
          securityLogger.logValidationFailure(req, key, value, 'ADDITIONAL_INFO_TOO_LONG');
          return res.status(400).json({ 
            message: `Additional info exceeds maximum length of ${VALIDATION_LIMITS.STRING_LIMITS.ADDITIONAL_INFO} characters`,
            error: 'ADDITIONAL_INFO_TOO_LONG'
          });
        }
      } else if (key === 'productId' && value) {
        // Validate ObjectId format
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(value)) {
          securityLogger.logValidationFailure(req, key, value, 'INVALID_PRODUCT_ID');
          return res.status(400).json({ 
            message: 'Invalid product ID format',
            error: 'INVALID_PRODUCT_ID'
          });
        }
      } else if (key === 'durationHours' && value) {
        // Validate duration is a positive number
        const duration = parseInt(value);
        if (isNaN(duration) || duration < VALIDATION_LIMITS.NUMERIC_LIMITS.DURATION_HOURS_MIN || duration > VALIDATION_LIMITS.NUMERIC_LIMITS.DURATION_HOURS_MAX) {
          securityLogger.logValidationFailure(req, key, value, 'INVALID_DURATION');
          return res.status(400).json({ 
            message: `Duration must be between ${VALIDATION_LIMITS.NUMERIC_LIMITS.DURATION_HOURS_MIN} and ${VALIDATION_LIMITS.NUMERIC_LIMITS.DURATION_HOURS_MAX} hours`,
            error: 'INVALID_DURATION'
          });
        }
      } else if (key === 'priority' && value) {
        // Validate priority values
        const validPriorities = VALIDATION_LIMITS.VALID_PRIORITIES;
        if (!validPriorities.includes(value.toLowerCase())) {
          securityLogger.logValidationFailure(req, key, value, 'INVALID_PRIORITY');
          return res.status(400).json({ 
            message: 'Priority must be one of: low, medium, high, urgent',
            error: 'INVALID_PRIORITY'
          });
        }
      } else if (key === 'deadline' && value) {
        // Validate deadline is a future date
        const deadline = new Date(value);
        if (isNaN(deadline.getTime()) || deadline <= new Date()) {
          securityLogger.logValidationFailure(req, key, value, 'INVALID_DEADLINE');
          return res.status(400).json({ 
            message: 'Deadline must be a valid future date',
            error: 'INVALID_DEADLINE'
          });
        }
      } else if (typeof value === 'object' && value !== null) {
        const result = validateCustomerFields(value);
        if (result) return result;
      }
    }
    return null;
  };

  if (req.body) {
    const result = validateCustomerFields(req.body);
    if (result) return result;
  }

  next();
};

// Authentication field validation
const validateAuthFields = (req, res, next) => {
  const { email, username, password } = req.body;
  
  // Email validation
  if (email) {
    const emailRegex = VALIDATION_LIMITS.PATTERNS.EMAIL;
    if (!emailRegex.test(email)) {
      securityLogger.logValidationFailure(req, 'email', email, 'INVALID_EMAIL_FORMAT');
      return res.status(400).json({ 
        message: 'Invalid email format',
        error: 'INVALID_EMAIL_FORMAT'
      });
    }
    
    // Check for suspicious email patterns
    if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
      securityLogger.logSuspiciousActivity('SUSPICIOUS_EMAIL', req, { email });
      return res.status(400).json({ 
        message: 'Invalid email format',
        error: 'INVALID_EMAIL_FORMAT'
      });
    }
  }
  
  // Username validation
  if (username) {
    // Username should be 3-30 characters, alphanumeric and underscores only
    const usernameRegex = VALIDATION_LIMITS.PATTERNS.USERNAME;
    if (!usernameRegex.test(username)) {
      securityLogger.logValidationFailure(req, 'username', username, 'INVALID_USERNAME_FORMAT');
      return res.status(400).json({ 
        message: 'Username must be 3-30 characters, letters, numbers, and underscores only',
        error: 'INVALID_USERNAME_FORMAT'
      });
    }
    
    // Check for suspicious username patterns
    if (username.toLowerCase().includes('admin') || 
        username.toLowerCase().includes('root') || 
        username.toLowerCase().includes('system')) {
      securityLogger.logSuspiciousActivity('SUSPICIOUS_USERNAME', req, { username });
      return res.status(400).json({ 
        message: 'Username not allowed',
        error: 'INVALID_USERNAME_FORMAT'
      });
    }
  }
  
  // Password validation
  if (password) {
    // Determine minimum password length based on role
    const userRole = req.body?.role || 'customer';
    const minLength = userRole === 'owner' 
      ? VALIDATION_LIMITS.NUMERIC_LIMITS.PASSWORD_MIN_LENGTH_OWNER 
      : VALIDATION_LIMITS.NUMERIC_LIMITS.PASSWORD_MIN_LENGTH;
    
    // Password should meet minimum length requirement (role-based)
    if (password.length < minLength) {
      securityLogger.logValidationFailure(req, 'password', '[HIDDEN]', 'PASSWORD_TOO_SHORT');
      return res.status(400).json({ 
        message: `Password must be at least ${minLength} characters long${userRole === 'owner' ? ' for owner accounts' : ''}`,
        error: 'PASSWORD_TOO_SHORT'
      });
    }
    
    // Password should not be too long (prevent DoS)
    if (password.length > VALIDATION_LIMITS.NUMERIC_LIMITS.PASSWORD_MAX_LENGTH) {
      securityLogger.logValidationFailure(req, 'password', '[HIDDEN]', 'PASSWORD_TOO_LONG');
      return res.status(400).json({ 
        message: `Password must be less than ${VALIDATION_LIMITS.NUMERIC_LIMITS.PASSWORD_MAX_LENGTH} characters`,
        error: 'PASSWORD_TOO_LONG'
      });
    }
    
    // Password complexity validation
    const complexity = VALIDATION_LIMITS.PASSWORD_COMPLEXITY;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[@$!%*?&#^._-]/.test(password);
    
    // Check complexity requirements
    const missingRequirements = [];
    if (complexity.REQUIRE_UPPERCASE && !hasUppercase) {
      missingRequirements.push('uppercase letter');
    }
    if (complexity.REQUIRE_LOWERCASE && !hasLowercase) {
      missingRequirements.push('lowercase letter');
    }
    if (complexity.REQUIRE_NUMBER && !hasNumber) {
      missingRequirements.push('number');
    }
    if (complexity.REQUIRE_SPECIAL && !hasSpecial) {
      missingRequirements.push('special character (@$!%*?&#^._-)');
    }
    
    if (missingRequirements.length > 0) {
      securityLogger.logValidationFailure(req, 'password', '[HIDDEN]', 'PASSWORD_COMPLEXITY_FAILED');
      return res.status(400).json({ 
        message: `Password must contain at least one: ${missingRequirements.join(', ')}`,
        error: 'PASSWORD_COMPLEXITY_FAILED',
        missingRequirements
      });
    }
    
    // Check for common weak passwords
    const weakPasswords = VALIDATION_LIMITS.WEAK_PASSWORDS;
    if (weakPasswords.includes(password.toLowerCase())) {
      securityLogger.logValidationFailure(req, 'password', '[HIDDEN]', 'WEAK_PASSWORD');
      return res.status(400).json({ 
        message: 'Password is too common, please choose a stronger password',
        error: 'WEAK_PASSWORD'
      });
    }
    
    // Check for suspicious password patterns (SQL injection attempts)
    const suspiciousPatterns = VALIDATION_LIMITS.SUSPICIOUS_PATTERNS;
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(password)) {
        securityLogger.logSuspiciousActivity('SUSPICIOUS_PASSWORD', req, { 
          pattern: pattern.toString() 
        });
        return res.status(400).json({ 
          message: 'Password contains invalid characters',
          error: 'INVALID_PASSWORD_FORMAT'
        });
      }
    }
  }
  
  next();
};

// Owner-specific input validation
const validateOwnerInput = (req, res, next) => {
  const ownerFields = [
    'name', 'description', 'productType', 'material', 'specifications',
    'ringSizes', 'setAccessories', 'stones', 'gramPrice', 'totalPrice'
  ];
  
  const validateOwnerFields = (obj) => {
    for (const [key, value] of Object.entries(obj)) {
      if (ownerFields.includes(key) && typeof value === 'string') {
        // Check length limits using constants
        if (key === 'name' && value.length > VALIDATION_LIMITS.STRING_LIMITS.NAME) {
          securityLogger.logValidationFailure(req, key, value, 'PRODUCT_NAME_TOO_LONG');
          return res.status(400).json({ 
            message: `Product name exceeds maximum length of ${VALIDATION_LIMITS.STRING_LIMITS.NAME} characters`,
            error: 'PRODUCT_NAME_TOO_LONG'
          });
        }
        
        if (key === 'description' && value.length > VALIDATION_LIMITS.STRING_LIMITS.DESCRIPTION) {
          securityLogger.logValidationFailure(req, key, value, 'PRODUCT_DESCRIPTION_TOO_LONG');
          return res.status(400).json({ 
            message: `Product description exceeds maximum length of ${VALIDATION_LIMITS.STRING_LIMITS.DESCRIPTION} characters`,
            error: 'PRODUCT_DESCRIPTION_TOO_LONG'
          });
        }
        
        if (key === 'specifications' && value.length > VALIDATION_LIMITS.STRING_LIMITS.PRODUCT_SPECS) {
          securityLogger.logValidationFailure(req, key, value, 'PRODUCT_SPECS_TOO_LONG');
          return res.status(400).json({ 
            message: `Product specifications exceed maximum length of ${VALIDATION_LIMITS.STRING_LIMITS.PRODUCT_SPECS} characters`,
            error: 'PRODUCT_SPECS_TOO_LONG'
          });
        }
      } else if (key === 'productType' && value) {
        // Validate product type
        const validTypes = VALIDATION_LIMITS.VALID_PRODUCT_TYPES;
        if (!validTypes.includes(value)) {
          securityLogger.logValidationFailure(req, key, value, 'INVALID_PRODUCT_TYPE');
          return res.status(400).json({ 
            message: 'Invalid product type',
            error: 'INVALID_PRODUCT_TYPE'
          });
        }
      } else if (key === 'material' && value) {
        // Validate material type
        const validMaterials = VALIDATION_LIMITS.VALID_MATERIALS;
        if (!validMaterials.includes(value)) {
          securityLogger.logValidationFailure(req, key, value, 'INVALID_MATERIAL_TYPE');
          return res.status(400).json({ 
            message: 'Invalid material type',
            error: 'INVALID_MATERIAL_TYPE'
          });
        }
      } else if (key === 'ringSizes' && value) {
        // Validate ring sizes array
        try {
          const sizes = typeof value === 'string' ? JSON.parse(value) : value;
          if (!Array.isArray(sizes)) {
            securityLogger.logValidationFailure(req, key, value, 'INVALID_RING_SIZES');
            return res.status(400).json({ 
              message: 'Ring sizes must be an array',
              error: 'INVALID_RING_SIZES'
            });
          }
          // Validate each size is a valid number
          for (const size of sizes) {
            if (isNaN(parseFloat(size)) || parseFloat(size) < VALIDATION_LIMITS.NUMERIC_LIMITS.RING_SIZE_MIN || parseFloat(size) > VALIDATION_LIMITS.NUMERIC_LIMITS.RING_SIZE_MAX) {
              securityLogger.logValidationFailure(req, key, size, 'INVALID_RING_SIZE_VALUE');
              return res.status(400).json({ 
                message: `Ring sizes must be between ${VALIDATION_LIMITS.NUMERIC_LIMITS.RING_SIZE_MIN} and ${VALIDATION_LIMITS.NUMERIC_LIMITS.RING_SIZE_MAX}`,
                error: 'INVALID_RING_SIZE_VALUE'
              });
            }
          }
        } catch (error) {
          securityLogger.logValidationFailure(req, key, value, 'INVALID_RING_SIZES_JSON');
          return res.status(400).json({ 
            message: 'Invalid ring sizes format',
            error: 'INVALID_RING_SIZES_JSON'
          });
        }
      } else if (key === 'setAccessories' && value) {
        // Validate set accessories array
        try {
          const accessories = typeof value === 'string' ? JSON.parse(value) : value;
          if (!Array.isArray(accessories)) {
            securityLogger.logValidationFailure(req, key, value, 'INVALID_SET_ACCESSORIES');
            return res.status(400).json({ 
              message: 'Set accessories must be an array',
              error: 'INVALID_SET_ACCESSORIES'
            });
          }
          const validAccessories = VALIDATION_LIMITS.VALID_SET_ACCESSORIES;
          for (const accessory of accessories) {
            if (!validAccessories.includes(accessory)) {
              securityLogger.logValidationFailure(req, key, accessory, 'INVALID_SET_ACCESSORY');
              return res.status(400).json({ 
                message: 'Invalid set accessory',
                error: 'INVALID_SET_ACCESSORY'
              });
            }
          }
        } catch (error) {
          securityLogger.logValidationFailure(req, key, value, 'INVALID_SET_ACCESSORIES_JSON');
          return res.status(400).json({ 
            message: 'Invalid set accessories format',
            error: 'INVALID_SET_ACCESSORIES_JSON'
          });
        }
      } else if (typeof value === 'object' && value !== null) {
        const result = validateOwnerFields(value);
        if (result) return result;
      }
    }
    return null;
  };

  if (req.body) {
    const result = validateOwnerFields(req.body);
    if (result) return result;
  }

  next();
};

module.exports = {
  sanitizeMongo,
  sanitizeMongoCustom,
  sanitizeXSS,
  sanitizeHPP,
  sanitizeInput,
  validateObjectId,
  limitStringLengths,
  validateNumericInputs,
  validateCustomerInput,
  validateAuthFields,
  validateOwnerInput
};
