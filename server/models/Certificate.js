const mongoose = require('mongoose');
const VALIDATION_LIMITS = require('../constants/validationLimits');

const CertificateSchema = new mongoose.Schema({
  // معرف فريد للشهادة
  certificateId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // ربط بالمنتج
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  
  // ربط بالعميل المشتري (اختياري - للعملاء المسجلين)
  // Note: NOT unique - same customer can have multiple certificates for different products
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  // معلومات العميل غير المسجل
  // Note: phone, email and name are NOT unique - same customer can buy multiple products
  customerInfo: {
    phone: String, // NOT unique - same phone can have multiple certificates
    email: String, // NOT unique - same email can have multiple certificates
    name: String   // NOT unique - same name can have multiple certificates
  },
  
  // ربط بالمالك/المتجر
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // تفاصيل القطعة
  jewelryDetails: {
    name: { 
      type: String, 
      required: true,
      maxlength: VALIDATION_LIMITS.STRING_LIMITS.NAME
    },
    material: { type: String, required: true },
    karat: { type: String, required: true },
    weight: { type: Number, required: true },
    productType: { type: String, required: true },
    description: {
      type: String,
      maxlength: VALIDATION_LIMITS.STRING_LIMITS.DESCRIPTION
    },
    images: [String]
  },
  
  // تفاصيل الشراء
  purchaseDetails: {
    purchaseDate: { type: Date, required: true },
    purchasePrice: {
      usd: { type: Number, required: true },
      syp: { type: Number, required: true }
    },
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null/undefined values but enforces uniqueness for non-null values
      index: true
    },
    paymentMethod: String
  },
  
  // تفاصيل الشهادة
  certificateDetails: {
    issueDate: { type: Date, default: Date.now },
    expiryDate: Date, // اختياري - للضمان
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked', 'transferred'],
      default: 'active'
    },
    verificationCode: {
      type: String,
      required: true,
      unique: true
    }
  },
  
  // معلومات إضافية
  additionalInfo: {
    gemstoneDetails: [{
      type: String,
      color: String,
      weight: Number,
      quality: String
    }],
    craftsmanship: String,
    origin: String,
    hallmarks: [String]
  },
  
  // معلومات الأمان
  security: {
    digitalSignature: String, // توقيع رقمي
    hash: String, // hash للتحقق من التكامل
    encryptionKey: String, // مفتاح التشفير
    lastVerified: Date
  },
  
  // معلومات النقل (إذا تم بيع القطعة لعميل آخر)
  transferHistory: [{
    fromCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    toCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    transferDate: Date,
    transferReason: String,
    transferPrice: {
      usd: Number,
      syp: Number
    }
  }],
  
  // معلومات إضافية
  notes: {
    type: String,
    maxlength: VALIDATION_LIMITS.STRING_LIMITS.NOTES
  },
  isPublic: { type: Boolean, default: false }, // للعرض العام
  
}, { 
  timestamps: true,
  // إضافة فهارس للبحث السريع
  indexes: [
    { certificateId: 1 },
    { 'certificateDetails.verificationCode': 1 },
    { product: 1 },
    { customer: 1 },
    { 'certificateDetails.status': 1 }
  ]
});

// Middleware لتوليد معرف فريد للشهادة (تم نقله إلى المتحكم)
// CertificateSchema.pre('save', async function(next) {
//   // تم نقل هذا المنطق إلى certificateController.js
// });

// دالة للتحقق من صحة الشهادة
CertificateSchema.methods.verify = function() {
  return {
    isValid: this.certificateDetails.status === 'active',
    certificateId: this.certificateId,
    verificationCode: this.certificateDetails.verificationCode,
    issueDate: this.certificateDetails.issueDate,
    status: this.certificateDetails.status
  };
};

// دالة لتوليد QR Code data - Self-Contained Approach (RECOMMENDED)
CertificateSchema.methods.generateQRData = function() {
  const { generateHybridQR } = require('../utils/qrCodeStrategies');
  
  // Use hybrid approach: self-contained data + online verification
  return generateHybridQR(this);
};

// دالة لتوليد QR Code data - URL-based approach (OLD - NOT RECOMMENDED)
CertificateSchema.methods.generateQRDataURL = function() {
  const { getCertificateUrl, getVerificationUrl, getFrontendUrl } = require('../utils/urlHelper');
  
  return {
    certificateId: this.certificateId,
    verificationCode: this.certificateDetails.verificationCode,
    productName: this.jewelryDetails.name,
    material: this.jewelryDetails.material,
    karat: this.jewelryDetails.karat,
    weight: this.jewelryDetails.weight,
    issueDate: this.certificateDetails.issueDate,
    status: this.certificateDetails.status,
    // معلومات إضافية
    storeName: this.store?.username || 'نزار للمجوهرات',
    customerName: this.customer?.username || '',
    purchasePrice: this.purchaseDetails.purchasePrice,
    purchaseDate: this.purchaseDetails.purchaseDate,
    paymentMethod: this.purchaseDetails.paymentMethod,
    // رابط التحقق التقليدي
    verificationUrl: getVerificationUrl(this.certificateId),
    // رابط مباشر لعرض الشهادة (الصفحة الجميلة) - هذا ما سيظهر في QR Code
    certificateUrl: getCertificateUrl(this.certificateId),
    // معلومات إضافية
    additionalInfo: {
      warranty: 'ضمان مدى الحياة',
      contact: 'info@nizar-jewelry.com',
      website: 'www.nizar-jewelry.com',
      system: 'نظام نزار للتحقق من المجوهرات'
    }
  };
};

module.exports = mongoose.model('Certificate', CertificateSchema);
