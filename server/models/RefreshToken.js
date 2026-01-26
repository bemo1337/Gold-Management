const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Index for user token lookups
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Indexes for cost-optimized queries (reduces MongoDB compute costs)
  indexes: [
    { userId: 1, expiresAt: 1 }, // Compound index for user token cleanup queries
    { token: 1 } // Already unique, but explicit for clarity
  ]
});

// Auto-delete expired tokens (TTL index - must be separate from regular indexes)
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);

