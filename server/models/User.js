const mongoose = require('mongoose');
const VALIDATION_LIMITS = require('../constants/validationLimits');

const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    maxlength: VALIDATION_LIMITS.STRING_LIMITS.USERNAME,
    match: VALIDATION_LIMITS.PATTERNS.USERNAME
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    maxlength: VALIDATION_LIMITS.STRING_LIMITS.EMAIL,
    match: VALIDATION_LIMITS.PATTERNS.EMAIL
  },
  password: { type: String, required: false }, // Optional (not required for Google users)
  role: { type: String, enum: ['owner', 'customer'], default: 'customer' },
  
  // Email verification
  emailVerified: { type: Boolean, default: false }, // True for Google users, requires verification for email/password users
  verificationToken: { type: String }, // Token for email verification
  verificationTokenExpiry: { type: Date }, // Expiry for verification token
  
  // Password reset
  passwordResetToken: { type: String }, // Token for password reset
  passwordResetTokenExpiry: { type: Date }, // Expiry for password reset token
  passwordResetTokenUsed: { type: Boolean, default: false }, // Track if reset token was used (single-use)
  
  // Metadata
  lastLogin: { type: Date },
  
  // Account lockout fields
  failedAttempts: { type: Number, default: 0 }, // Track failed login attempts
  accountLocked: { type: Boolean, default: false }, // Lock status flag
  lockedUntil: { type: Date }, // Lockout expiration time
  lastFailedAttempt: { type: Date }, // Timestamp of last failed attempt (for reset logic)
}, { 
  timestamps: true,
  // Indexes for cost-optimized queries
  indexes: [
    { role: 1 }, // Index for filtering by role (common query pattern)
    { email: 1, role: 1 }, // Compound index for email + role lookups
    { username: 1, role: 1 }, // Compound index for username + role lookups
    { verificationToken: 1 }, // Index for email verification queries
    { passwordResetToken: 1 } // Index for password reset queries
  ]
});

module.exports = mongoose.model('User', UserSchema); 