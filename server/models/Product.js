const mongoose = require('mongoose');
const VALIDATION_LIMITS = require('../constants/validationLimits');

const StoneSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true,
    enum: VALIDATION_LIMITS.STONE_TYPES
  }, // نوع الحجر
  color: { 
    type: String, 
    required: true,
    enum: VALIDATION_LIMITS.STONE_COLORS
  }, // لون الحجر
  count: { type: Number, required: true, min: 1 }, // العدد الكلي للاحجار
  caratPrice: {
    usd: { type: Number, default: 0 },
    syp: { type: Number, default: 0 }
  }, // سعر القيراط
  totalPrice: {
    usd: { type: Number, default: 0 },
    syp: { type: Number, default: 0 }
  }, // السعر الكلي للاحجار
  totalWeight: { type: Number, default: 0 } // الوزن الكلي للاحجار
});

const ProductSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    maxlength: VALIDATION_LIMITS.STRING_LIMITS.NAME
  }, // اسم المنتج
  material: { 
    type: String, 
    enum: VALIDATION_LIMITS.VALID_MATERIALS, 
    required: true 
  }, // مادة المنتج
  stones: {
    type: [StoneSchema],
    validate: {
      validator: function(v) {
        if (!v || !Array.isArray(v)) return true;
        return v.length <= VALIDATION_LIMITS.ARRAY_LIMITS.MAX_STONES;
      },
      message: `Stones array cannot exceed ${VALIDATION_LIMITS.ARRAY_LIMITS.MAX_STONES} items`
    }
  }, // تفاصيل الاحجار
  productType: { 
    type: String, 
    enum: VALIDATION_LIMITS.VALID_PRODUCT_TYPES, 
    required: true 
  },
  ringSizes: {
    type: [{ 
      type: String,
      validate: {
        validator: function(v) {
          // Allow empty string or valid number
          if (!v || v === '') return true;
          const num = parseInt(v);
          return !isNaN(num) && 
                 num >= VALIDATION_LIMITS.NUMERIC_LIMITS.RING_SIZE_MIN && 
                 num <= VALIDATION_LIMITS.NUMERIC_LIMITS.RING_SIZE_MAX;
        },
        message: `Ring size must be between ${VALIDATION_LIMITS.NUMERIC_LIMITS.RING_SIZE_MIN} and ${VALIDATION_LIMITS.NUMERIC_LIMITS.RING_SIZE_MAX}`
      }
    }],
    validate: {
      validator: function(v) {
        if (!v || !Array.isArray(v)) return true;
        return v.length <= VALIDATION_LIMITS.ARRAY_LIMITS.MAX_RING_SIZES;
      },
      message: `Ring sizes array cannot exceed ${VALIDATION_LIMITS.ARRAY_LIMITS.MAX_RING_SIZES} items`
    },
    required: false
  }, // قياسات المحبس
  setAccessories: {
    type: [{
      type: String,
      enum: VALIDATION_LIMITS.VALID_SET_ACCESSORIES
    }],
    validate: {
      validator: function(v) {
        if (!v || !Array.isArray(v)) return true;
        return v.length <= VALIDATION_LIMITS.ARRAY_LIMITS.MAX_SET_ACCESSORIES;
      },
      message: `Set accessories array cannot exceed ${VALIDATION_LIMITS.ARRAY_LIMITS.MAX_SET_ACCESSORIES} items`
    }
  }, // ملحقات الطقم
  description: { 
    type: String,
    maxlength: VALIDATION_LIMITS.STRING_LIMITS.DESCRIPTION
  }, // وصف المنتج
  karat: { type: String, enum: ['18','21','22','24','925'], required: true }, // العيار
  weight: { type: Number, required: true }, // الوزن
  gramWage: { type: Number }, // اجار الغرام (اختياري)
  craftingFeeUSD: { type: Number, default: 0 }, // اجار الغرام بالدولار
  gramPrice: {
    usd: { type: Number, default: 0 },
    syp: { type: Number, default: 0 }
  }, // سعر الغرام
  totalPrice: {
    usd: { type: Number, default: 0 },
    syp: { type: Number, default: 0 }
  }, // السعر الكلي للقطعة
  images: [{ type: String }], // روابط الصور
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // المستخدمون الذين أعجبوا بالمنتج
  pinned: { type: Boolean, default: false }, // مثبت
  special: { type: Boolean, default: false }, // خاص - يمكن حجزه مرة واحدة فقط
}, { 
  timestamps: true,
  // Indexes for cost-optimized queries (reduces MongoDB compute costs)
  indexes: [
    { material: 1 }, // Index for filtering by material
    { productType: 1 }, // Index for filtering by product type
    { availability: 1 }, // Index for filtering by availability
    { material: 1, productType: 1 }, // Compound index for common filter combinations
    { availability: 1, createdAt: -1 }, // Compound index for available products sorted by date
    { pinned: 1, createdAt: -1 }, // Index for pinned products
    { special: 1 }, // Index for special products
    { createdAt: -1 } // Index for sorting by creation date (most common)
  ]
});

module.exports = mongoose.model('Product', ProductSchema); 