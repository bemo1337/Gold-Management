/**
 * Visit Tracking Model
 * 
 * Lightweight, privacy-friendly visit tracking
 * - Tracks unique visits per day (not every page view)
 * - Uses hashed IPs for privacy (GDPR-friendly)
 * - Minimal storage (only essential data)
 * - Cost-effective (aggregated daily data)
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const VisitSchema = new mongoose.Schema({
  // Date of visit (YYYY-MM-DD format for easy aggregation)
  date: {
    type: String,
    required: true,
    index: true
  },
  
  // Hashed IP address (privacy-friendly, GDPR compliant)
  // Uses SHA-256 hash - one-way, cannot be reversed
  hashedIP: {
    type: String,
    required: true,
    index: true
  },
  
  // First visit timestamp (for this unique visitor on this date)
  firstVisitAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Last visit timestamp (updated if same visitor returns same day)
  lastVisitAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Visit count for this visitor on this date (incremented if they return)
  visitCount: {
    type: Number,
    default: 1,
    min: 1
  }
}, {
  timestamps: true
});

// Compound index for unique visitor tracking per day
// Prevents duplicate entries for same visitor on same day
VisitSchema.index({ date: 1, hashedIP: 1 }, { unique: true });

// Index for date-based queries (most common)
VisitSchema.index({ date: -1 });

// TTL index: Auto-delete visits older than 90 days (reduce storage costs)
// Note: TTL indexes in MongoDB require the field to be a Date type
// Since we're using createdAt (from timestamps: true), this will work
VisitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

/**
 * Hash IP address for privacy
 * @param {string} ip - IP address
 * @returns {string} Hashed IP
 */
VisitSchema.statics.hashIP = function(ip) {
  if (!ip) return null;
  // Use SHA-256 for one-way hashing (privacy-friendly)
  const salt = process.env.JWT_SECRET || 'default-secret';
  return crypto.createHash('sha256').update(ip + salt).digest('hex');
};

/**
 * Get today's date string (YYYY-MM-DD)
 * @returns {string} Date string
 */
VisitSchema.statics.getTodayDate = function() {
  return new Date().toISOString().split('T')[0];
};

module.exports = mongoose.model('Visit', VisitSchema);

