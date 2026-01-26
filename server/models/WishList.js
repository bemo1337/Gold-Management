const mongoose = require('mongoose');
const VALIDATION_LIMITS = require('../constants/validationLimits');

const WishListSchema = new mongoose.Schema({
  // معرف العميل
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // عنوان الطلب
  title: {
    type: String,
    required: true,
    maxlength: VALIDATION_LIMITS.STRING_LIMITS.TITLE,
    trim: true
  },
  
  // الوصف النصي
  description: {
    type: String,
    required: true,
    maxlength: 500, // Wishlist description limit (separate from product descriptions)
    trim: true
  },
  
  // خيارات تحديد مسبقة
  specifications: {
    // نوع المادة
    material: {
      type: String,
      enum: ['ذهب', 'فضة', 'ألماس', 'مختلط', 'أخرى'],
      default: 'ذهب'
    },
    
    // العيار (للذهب)
    karat: {
      type: String,
      enum: ['18', '21', '24', 'غير محدد'],
      default: 'غير محدد'
    },
    
    // الوزن التقريبي
    weight: {
      type: Number,
      min: 0,
      default: 0
    },
    
    // نوع المنتج
    // Note: WishList uses a subset of Product types for customer requests
    productType: {
      type: String,
      enum: ['خاتم', 'سوار', 'قلادة', 'أقراط', 'سلسلة', 'محبس', 'طقم', 'أخرى'],
      default: 'أخرى'
    },
    
    // الميزانية التقريبية
    budget: {
      min: {
        type: Number,
        min: 0,
        default: 0
      },
      max: {
        type: Number,
        min: 0,
        default: 0
      },
      currency: {
        type: String,
        enum: ['SYP', 'USD'],
        default: 'SYP'
      }
    },
    
    // الحجم (للخواتم)
    size: {
      type: String,
      default: ''
    },
    
    // اللون المفضل
    color: {
      type: String,
      default: ''
    },
    
    // التصميم المفضل
    design: {
      type: String,
      default: ''
    }
  },
  
  // الصور المرفقة
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      maxlength: 200
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // حالة الطلب
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'responded', 'completed', 'cancelled', 'archived'],
    default: 'pending',
    index: true
  },
  
  // تم رؤيته من قبل المالك
  seenByOwner: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // الأولوية
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // الموعد المطلوب
  deadline: {
    type: Date,
    required: false
  },
  
  // الموقع/المنطقة
  location: {
    city: {
      type: String,
      default: ''
    },
    area: {
      type: String,
      default: ''
    }
  },
  
  // رقم الهاتف للتواصل
  phone: {
    type: String,
    maxlength: 15,
    default: ''
  },
  
  // الردود من التجار
  responses: [{
    trader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: VALIDATION_LIMITS.STRING_LIMITS.MESSAGE
    },
    suggestedProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    priceEstimate: {
      amount: {
        type: Number,
        min: 0
      },
      currency: {
        type: String,
        enum: ['SYP', 'USD'],
        default: 'SYP'
      },
      note: {
        type: String,
        maxlength: VALIDATION_LIMITS.STRING_LIMITS.NOTES
      }
    },
    canCustomize: {
      type: Boolean,
      default: false
    },
    estimatedTime: {
      type: String,
      default: ''
    },
    contactInfo: {
      phone: String,
      email: String,
      whatsapp: String
    },
    respondedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'negotiating'],
      default: 'pending'
    }
  }],
  
  // إحصائيات
  stats: {
    views: {
      type: Number,
      default: 0
    },
    responsesCount: {
      type: Number,
      default: 0
    },
    lastViewedAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // إعدادات الخصوصية
  privacy: {
    isPublic: {
      type: Boolean,
      default: true
    },
    showContactInfo: {
      type: Boolean,
      default: true
    },
    allowDirectContact: {
      type: Boolean,
      default: true
    }
  },
  
  // ملاحظات إضافية
  notes: {
    type: String,
    maxlength: VALIDATION_LIMITS.STRING_LIMITS.NOTES
  },
  
  // تاريخ الإنجاز
  completedAt: {
    type: Date,
    required: false
  },
  
  // تاريخ الإلغاء
  cancelledAt: {
    type: Date,
    required: false
  },
  
  // سبب الإلغاء
  cancellationReason: {
    type: String,
    maxlength: VALIDATION_LIMITS.STRING_LIMITS.MESSAGE
  }
  
}, { 
  timestamps: true,
  // فهارس للبحث السريع
  indexes: [
    { customer: 1, status: 1 },
    { status: 1, createdAt: -1 },
    { 'specifications.material': 1 },
    { 'specifications.productType': 1 },
    { 'location.city': 1 },
    { priority: 1 },
    { deadline: 1 }
  ]
});

// Middleware للتحقق من صحة البيانات
WishListSchema.pre('save', function(next) {
  // التحقق من أن الميزانية القصوى أكبر من الدنيا
  if (this.specifications.budget.max > 0 && this.specifications.budget.min > 0) {
    if (this.specifications.budget.max < this.specifications.budget.min) {
      return next(new Error('الميزانية القصوى يجب أن تكون أكبر من الدنيا'));
    }
  }
  
  // التحقق من الموعد المطلوب
  if (this.deadline && this.deadline < new Date()) {
    return next(new Error('الموعد المطلوب يجب أن يكون في المستقبل'));
  }
  
  // تحديث عدد الردود
  this.stats.responsesCount = this.responses.length;
  
  next();
});

// دالة للحصول على حالة الطلب بالعربية
WishListSchema.methods.getStatusArabic = function() {
  const statuses = {
    'pending': 'بانتظار الرد',
    'in_progress': 'جاري الرد',
    'responded': 'تم الرد',
    'completed': 'مكتمل',
    'cancelled': 'ملغي',
    'archived': 'مؤرشف'
  };
  return statuses[this.status] || this.status;
};

// دالة للحصول على الأولوية بالعربية
WishListSchema.methods.getPriorityArabic = function() {
  const priorities = {
    'low': 'منخفضة',
    'medium': 'متوسطة',
    'high': 'عالية',
    'urgent': 'عاجلة'
  };
  return priorities[this.priority] || this.priority;
};

// دالة للحصول على نوع المادة بالعربية
WishListSchema.methods.getMaterialArabic = function() {
  const materials = {
    'ذهب': 'ذهب',
    'فضة': 'فضة',
    'ألماس': 'ألماس',
    'مختلط': 'مختلط',
    'أخرى': 'أخرى'
  };
  return materials[this.specifications.material] || this.specifications.material;
};

// دالة للحصول على نوع المنتج بالعربية
WishListSchema.methods.getProductTypeArabic = function() {
  const types = {
    'خاتم': 'خاتم',
    'سوار': 'سوار',
    'قلادة': 'قلادة',
    'أقراط': 'أقراط',
    'سلسلة': 'سلسلة',
    'محبس': 'محبس',
    'طقم': 'طقم',
    'أخرى': 'أخرى'
  };
  return types[this.specifications.productType] || this.specifications.productType;
};

// دالة للحصول على ملخص الطلب
WishListSchema.methods.getSummary = function() {
  const summary = {
    title: this.title,
    material: this.getMaterialArabic(),
    productType: this.getProductTypeArabic(),
    status: this.getStatusArabic(),
    priority: this.getPriorityArabic(),
    responsesCount: this.stats.responsesCount,
    createdAt: this.createdAt
  };
  
  if (this.specifications.karat !== 'غير محدد') {
    summary.karat = `${this.specifications.karat} عيار`;
  }
  
  if (this.specifications.weight > 0) {
    summary.weight = `${this.specifications.weight} غرام`;
  }
  
  if (this.specifications.budget.max > 0) {
    summary.budget = `${this.specifications.budget.max} ${this.specifications.budget.currency}`;
  }
  
  return summary;
};

// دالة للتحقق من إمكانية الرد
WishListSchema.methods.canRespond = function() {
  return this.status === 'pending' || this.status === 'in_progress';
};

// دالة لإضافة رد
WishListSchema.methods.addResponse = function(responseData) {
  if (!this.canRespond()) {
    throw new Error('لا يمكن الرد على هذا الطلب');
  }
  
  this.responses.push(responseData);
  this.stats.responsesCount = this.responses.length;
  
  // تحديث حالة الطلب
  if (this.status === 'pending') {
    this.status = 'responded';
  }
  
  return this.save();
};

// دالة لتحديث حالة الطلب
WishListSchema.methods.updateStatus = function(newStatus, reason = '') {
  this.status = newStatus;
  
  if (newStatus === 'completed') {
    this.completedAt = new Date();
  } else if (newStatus === 'cancelled') {
    this.cancelledAt = new Date();
    this.cancellationReason = reason;
  }
  
  return this.save();
};

module.exports = mongoose.model('WishList', WishListSchema);

