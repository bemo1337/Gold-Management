const mongoose = require('mongoose');
const VALIDATION_LIMITS = require('../constants/validationLimits');

const ReservationSchema = new mongoose.Schema({
  // معرف العميل
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // معرف المنتج
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  
  // حالة الحجز
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // مدة الحجز بالساعات (افتراضي 24 ساعة)
  durationHours: {
    type: Number,
    default: 24,
    min: VALIDATION_LIMITS.NUMERIC_LIMITS.DURATION_HOURS_MIN,
    max: VALIDATION_LIMITS.NUMERIC_LIMITS.DURATION_HOURS_MAX
  },
  
  // تاريخ انتهاء الحجز
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  
  // تاريخ الموافقة/الرفض
  respondedAt: {
    type: Date,
    default: null
  },
  
  // معرف التاجر الذي رد على الحجز
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // سبب الرفض (إذا كان مرفوض)
  rejectionReason: {
    type: String,
    maxlength: VALIDATION_LIMITS.STRING_LIMITS.MESSAGE,
    default: ''
  },
  
  // ملاحظات إضافية من التاجر
  notes: {
    type: String,
    maxlength: VALIDATION_LIMITS.STRING_LIMITS.NOTES,
    default: ''
  },
  
  // رقم الهاتف للتواصل (من العميل)
  phone: {
    type: String,
    maxlength: 15,
    default: ''
  },
  
  // تم رؤية الحجز من قبل المالك
  seenByOwner: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // إحصائيات
  stats: {
    // عدد المرات التي تم عرض الحجز
    views: {
      type: Number,
      default: 0
    },
    // آخر مرة تم عرض الحجز
    lastViewedAt: {
      type: Date,
      default: Date.now
    }
  }
  
}, { 
  timestamps: true,
  // فهارس للبحث السريع
  indexes: [
    { customer: 1, status: 1 },
    { product: 1, status: 1 },
    { status: 1, expiresAt: 1 },
    { expiresAt: 1 },
    { customer: 1, expiresAt: 1 }
  ]
});

// Middleware للتحقق من صحة البيانات
ReservationSchema.pre('save', function(next) {
  // إذا كان الحجز جديد، احسب تاريخ الانتهاء
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + (this.durationHours * 60 * 60 * 1000));
  }
  
  // السماح بتحديث الحجوزات المنتهية (للموافقة/الرفض/الإلغاء)
  // التحقق من أن تاريخ الانتهاء في المستقبل فقط للحجوزات الجديدة
  if (this.isNew && this.expiresAt && this.expiresAt <= new Date()) {
    return next(new Error('تاريخ انتهاء الحجز يجب أن يكون في المستقبل'));
  }
  
  next();
});

// دالة للحصول على حالة الحجز بالعربية
ReservationSchema.methods.getStatusArabic = function() {
  const statuses = {
    'pending': 'بانتظار الموافقة',
    'approved': 'مقبول',
    'rejected': 'مرفوض',
    'expired': 'منتهي الصلاحية',
    'completed': 'مكتمل',
    'cancelled': 'ملغي'
  };
  return statuses[this.status] || this.status;
};

// دالة للتحقق من أن الحجز لا يزال نشط
ReservationSchema.methods.isActive = function() {
  return this.status === 'pending' || this.status === 'approved';
};

// دالة للتحقق من انتهاء صلاحية الحجز
ReservationSchema.methods.isExpired = function() {
  return this.expiresAt && this.expiresAt <= new Date();
};

// دالة لتحديث حالة الحجز
ReservationSchema.methods.updateStatus = function(newStatus, reason = '', respondedBy = null) {
  this.status = newStatus;
  this.respondedAt = new Date();
  
  if (respondedBy) {
    this.respondedBy = respondedBy;
  }
  
  if (newStatus === 'rejected' && reason) {
    this.rejectionReason = reason;
  }
  
  return this.save();
};

// دالة لإلغاء الحجز
ReservationSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.respondedAt = new Date();
  return this.save();
};

// دالة للحصول على الوقت المتبقي
ReservationSchema.methods.getTimeRemaining = function() {
  if (!this.expiresAt) return null;
  
  const now = new Date();
  const timeLeft = this.expiresAt - now;
  
  if (timeLeft <= 0) return 'منتهي';
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours} ساعة و ${minutes} دقيقة`;
  } else {
    return `${minutes} دقيقة`;
  }
};

// دالة للحصول على ملخص الحجز
ReservationSchema.methods.getSummary = function() {
  return {
    id: this._id,
    status: this.getStatusArabic(),
    timeRemaining: this.getTimeRemaining(),
    isActive: this.isActive(),
    isExpired: this.isExpired(),
    createdAt: this.createdAt,
    expiresAt: this.expiresAt
  };
};

// Static method للعثور على الحجوزات المنتهية
ReservationSchema.statics.findExpiredReservations = function() {
  return this.find({
    status: { $in: ['pending', 'approved'] },
    expiresAt: { $lte: new Date() }
  });
};

// Static method للتحقق من وجود حجز نشط للعميل
ReservationSchema.statics.hasActiveReservation = function(customerId) {
  return this.findOne({
    customer: customerId,
    status: { $in: ['pending', 'approved'] }
  });
};

module.exports = mongoose.model('Reservation', ReservationSchema);
