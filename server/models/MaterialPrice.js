const mongoose = require('mongoose');

const MaterialPriceSchema = new mongoose.Schema({
  material: { 
    type: String, 
    enum: ['ذهب', 'فضة', 'ألماس'], 
    required: true,
    unique: true 
  },
  // الأسعار الأساسية (للذهب عيار 21، للفضة والألماس سعر واحد)
  pricePerGram: {
    usd: { type: Number, required: true, default: 0 },
    syp: { type: Number, required: true, default: 0 }
  },
  // أسعار العيارات المختلفة للذهب فقط
  goldKaratPrices: {
    '18': {
      usd: { type: Number, default: 0 },
      syp: { type: Number, default: 0 }
    },
    '21': {
      usd: { type: Number, default: 0 },
      syp: { type: Number, default: 0 }
    },
    '24': {
      usd: { type: Number, default: 0 },
      syp: { type: Number, default: 0 }
    }
  },
  // هل الأسعار يدوية أم تلقائية؟
  isManualPricing: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('MaterialPrice', MaterialPriceSchema); 