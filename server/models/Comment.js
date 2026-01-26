const mongoose = require('mongoose');
const VALIDATION_LIMITS = require('../constants/validationLimits');

const CommentSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { 
    type: String, 
    required: true,
    maxlength: VALIDATION_LIMITS.STRING_LIMITS.COMMENT
  },
}, { 
  timestamps: true,
  // Indexes for cost-optimized queries (reduces MongoDB compute costs)
  indexes: [
    { product: 1, createdAt: -1 }, // Compound index for product comments sorted by date
    { user: 1, createdAt: -1 }, // Compound index for user comments sorted by date
    { product: 1 }, // Index for filtering by product
    { user: 1 } // Index for filtering by user
  ]
});

module.exports = mongoose.model('Comment', CommentSchema); 