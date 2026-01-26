const mongoose = require('mongoose');
const VALIDATION_LIMITS = require('../constants/validationLimits');

const FavoriteAlertSchema = new mongoose.Schema({
  // معرف المستخدم (اختياري - للعملاء المسجلين)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // يمكن أن يكون للعملاء غير المسجلين
  },
  
  // معرف المنتج
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  
  // نوع التنبيه
  alertType: {
    type: String,
    required: true,
    enum: ['price_drop', 'out_of_stock', 'back_in_stock'],
    index: true
  },
  
  // السعر المستهدف (لتنبيهات انخفاض السعر)
  targetPrice: {
    type: Number,
    required: function() {
      return this.alertType === 'price_drop';
    },
    min: 0
  },
  
  // معلومات التواصل
  contactInfo: {
    email: {
      type: String,
      required: false,
      validate: {
        validator: function(v) {
          return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'البريد الإلكتروني غير صحيح'
      }
    },
    whatsapp: {
      type: String,
      required: false,
      validate: {
        validator: function(v) {
          return !v || /^(\+963|0)?9\d{8}$/.test(v);
        },
        message: 'رقم الواتساب غير صحيح'
      }
    },
    phone: {
      type: String,
      required: false
    }
  },
  
  // حالة التنبيه
  status: {
    type: String,
    enum: ['active', 'triggered', 'cancelled'],
    default: 'active',
    index: true
  },
  
  // تاريخ التفعيل (إذا تم تفعيل التنبيه)
  triggeredAt: {
    type: Date,
    required: false
  },
  
  // القيمة عند التفعيل (السعر أو حالة التوفر)
  triggeredValue: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  
  // ملاحظات إضافية
  notes: {
    type: String,
    maxlength: VALIDATION_LIMITS.STRING_LIMITS.NOTES
  },
  
  // إعدادات التنبيه
  settings: {
    // إرسال إشعار واحد فقط أم متكرر
    oneTime: {
      type: Boolean,
      default: true
    },
    // إشعارات إضافية
    emailNotifications: {
      type: Boolean,
      default: true
    },
    whatsappNotifications: {
      type: Boolean,
      default: false
    },
    pushNotifications: {
      type: Boolean,
      default: false
    }
  }
  
}, { 
  timestamps: true,
  // فهارس للبحث السريع
  indexes: [
    { product: 1, status: 1 },
    { alertType: 1, status: 1 },
    { targetPrice: 1 },
    { 'contactInfo.email': 1 },
    { createdAt: -1 }
  ]
});

// Middleware للتحقق من صحة البيانات
FavoriteAlertSchema.pre('save', function(next) {
  // التأكد من وجود طريقة تواصل واحدة على الأقل
  const contact = this.contactInfo;
  if (!contact.email && !contact.whatsapp && !contact.phone) {
    return next(new Error('يجب تحديد طريقة تواصل واحدة على الأقل'));
  }
  
  // التحقق من أن السعر المستهدف أقل من السعر الحالي (لتنبيهات انخفاض السعر)
  if (this.alertType === 'price_drop' && this.targetPrice) {
    // سيتم التحقق من هذا في Controller
  }
  
  // إذا كان المستخدم مسجل، استخدم معلوماته
  if (this.user && !contact.email) {
    // يمكن إضافة منطق لاستخدام إيميل المستخدم المسجل
  }
  
  next();
});

// دالة للتحقق من إمكانية تفعيل التنبيه
FavoriteAlertSchema.methods.canTrigger = function(product) {
  if (this.status !== 'active') return false;
  
  switch (this.alertType) {
    case 'price_drop':
      // تحقق من انخفاض السعر
      const currentPrice = product.totalPrice?.syp || product.totalPrice?.usd;
      return currentPrice && currentPrice <= this.targetPrice;
      
    case 'out_of_stock':
      // تحقق من نفاد المنتج
      return product.availability === 'out_of_stock' || product.quantity === 0;
      
    case 'back_in_stock':
      // تحقق من توفر المنتج مجدداً
      return product.availability === 'in_stock' && product.quantity > 0;
      
    default:
      return false;
  }
};

// دالة لتفعيل التنبيه
FavoriteAlertSchema.methods.trigger = function(product) {
  this.status = 'triggered';
  this.triggeredAt = new Date();
  
  // حفظ القيمة عند التفعيل
  switch (this.alertType) {
    case 'price_drop':
      this.triggeredValue = product.totalPrice;
      break;
    case 'out_of_stock':
    case 'back_in_stock':
      this.triggeredValue = {
        availability: product.availability,
        quantity: product.quantity
      };
      break;
  }
  
  return this.save();
};

// دالة للحصول على معلومات التواصل
FavoriteAlertSchema.methods.getContactInfo = function() {
  const contact = this.contactInfo;
  return {
    email: contact.email,
    whatsapp: contact.whatsapp,
    phone: contact.phone,
    hasEmail: !!contact.email,
    hasWhatsapp: !!contact.whatsapp,
    hasPhone: !!contact.phone
  };
};

// دالة للحصول على نوع التنبيه بالعربية
FavoriteAlertSchema.methods.getAlertTypeArabic = function() {
  const types = {
    'price_drop': 'انخفاض السعر',
    'out_of_stock': 'نفاد المنتج',
    'back_in_stock': 'توفر المنتج مجدداً'
  };
  return types[this.alertType] || this.alertType;
};

// دالة للحصول على وصف التنبيه
FavoriteAlertSchema.methods.getAlertDescription = function() {
  switch (this.alertType) {
    case 'price_drop':
      return `إشعار عند انخفاض السعر إلى ${this.targetPrice} ل.س أو أقل`;
    case 'out_of_stock':
      return 'إشعار عند نفاد المنتج من المخزون';
    case 'back_in_stock':
      return 'إشعار عند توفر المنتج مجدداً في المخزون';
    default:
      return 'تنبيه للمنتج';
  }
};

module.exports = mongoose.model('FavoriteAlert', FavoriteAlertSchema);

