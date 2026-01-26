const mongoose = require('mongoose');
const Certificate = require('../models/Certificate');
const Product = require('../models/Product');
const User = require('../models/User');
const QRCode = require('qrcode');
const crypto = require('crypto');
const securityLogger = require('../utils/securityLogger');
const VALIDATION_LIMITS = require('../constants/validationLimits');

// إنشاء شهادة جديدة
exports.createCertificate = async (req, res) => {
  try {
    const { productId, customerId, purchaseDetails, additionalInfo } = req.body;
    
    // التحقق من صحة معرف المنتج
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'معرف المنتج غير صحيح' });
    }
    
    // التحقق من وجود المنتج
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }
    
    // Validate certificate prices against product prices
    if (purchaseDetails && purchaseDetails.purchasePrice) {
      const productPriceUSD = product.totalPrice?.usd || 0;
      const productPriceSYP = product.totalPrice?.syp || 0;
      const certPriceUSD = purchaseDetails.purchasePrice.usd || 0;
      const certPriceSYP = purchaseDetails.purchasePrice.syp || 0;
      
      const priceDiffUSD = Math.abs(certPriceUSD - productPriceUSD);
      const priceDiffSYP = Math.abs(certPriceSYP - productPriceSYP);
      
      // Warn if difference is significant (>5% or >$50 for USD, >5% or >50000 for SYP)
      const usdThreshold = Math.max(VALIDATION_LIMITS.PRICE_THRESHOLDS.USD_THRESHOLD, productPriceUSD * VALIDATION_LIMITS.PRICE_THRESHOLDS.PERCENTAGE_THRESHOLD);
      const sypThreshold = Math.max(VALIDATION_LIMITS.PRICE_THRESHOLDS.SYP_THRESHOLD, productPriceSYP * VALIDATION_LIMITS.PRICE_THRESHOLDS.PERCENTAGE_THRESHOLD);
      
      if (priceDiffUSD > usdThreshold && productPriceUSD > 0) {
      }
      if (priceDiffSYP > sypThreshold && productPriceSYP > 0) {
      }
    }
    
    // Handle customer logic:
    // - If customerId provided: Registered customer (found by email search)
    // - If phone or email provided in additionalInfo: Unregistered customer (no account)
    // At least one must be provided (customerId OR phone OR email)
    let customer = null;
    let customerInfo = null;
    
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      // Registered customer - verify exists
      customer = await User.findById(customerId);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      // Even if registered, allow phone/email in customerInfo if provided
      if (additionalInfo && (additionalInfo.customerPhone || additionalInfo.customerEmail)) {
        customerInfo = {
          phone: additionalInfo.customerPhone || null,
          email: additionalInfo.customerEmail || null,
          name: additionalInfo.customerName || null
        };
      }
    } else if (additionalInfo && (additionalInfo.customerPhone || additionalInfo.customerEmail)) {
      // Unregistered customer - store phone/email in certificate
      // At least one of phone or email must be provided
      if (!additionalInfo.customerPhone && !additionalInfo.customerEmail) {
        return res.status(400).json({ message: 'Please provide either a customer email or phone number (at least one is required)' });
      }
      customerInfo = {
        phone: additionalInfo.customerPhone || null,
        email: additionalInfo.customerEmail || null,
        name: additionalInfo.customerName || null
      };
    } else {
      return res.status(400).json({ message: 'Please provide either a customer email (for registered user) or phone number (at least one is required)' });
    }
    
    // التحقق من عدم وجود شهادة سابقة لهذا المنتج
    // Note: This checks for duplicate certificates on the same PRODUCT, not same customer
    // Same customer can have multiple certificates for different products
    const existingCertificate = await Certificate.findOne({ product: productId });
    if (existingCertificate) {
      return res.status(400).json({ message: 'يوجد شهادة سابقة لهذا المنتج' });
    }
    
    // توليد معرف فريد للشهادة (عشوائي وغير قابل للتنبؤ)
    // Generate random certificate ID (unpredictable for security)
    const year = new Date().getFullYear();
    const generateRandomId = () => {
      // Generate 8 random alphanumeric characters (uppercase)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar-looking chars (0, O, I, 1)
      let randomId = '';
      for (let i = 0; i < 8; i++) {
        randomId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return randomId;
    };
    
    // Ensure uniqueness by checking database
    let certificateId;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      const randomId = generateRandomId();
      certificateId = `NIZAR-${year}-${randomId}`;
      const exists = await Certificate.findOne({ certificateId });
      if (!exists) {
        isUnique = true;
      }
      attempts++;
    }
    
    // Fallback if uniqueness check fails (very rare)
    if (!isUnique) {
      // Use timestamp + random for ultimate uniqueness
      const timestamp = Date.now().toString(36).toUpperCase();
      const randomPart = generateRandomId();
      certificateId = `NIZAR-${year}-${timestamp.slice(-4)}-${randomPart}`;
    }
    
    // توليد رمز تحقق فريد
    const verificationCode = 
      Math.random().toString(36).substring(2, 15) + 
      Math.random().toString(36).substring(2, 15);

    // إنشاء الشهادة
    const certificateData = {
      certificateId: certificateId,
      product: productId,
      customer: customer ? customer._id : null, // null if unknown customer
      customerInfo: customerInfo, // email/phone for unknown customers
      store: req.user._id, // المالك الحالي
      jewelryDetails: {
        name: product.name,
        material: product.material,
        karat: product.karat,
        weight: product.weight,
        productType: product.productType,
        description: product.description,
        images: product.images
      },
      purchaseDetails: {
        purchaseDate: purchaseDetails.purchaseDate || new Date(),
        purchasePrice: {
          usd: purchaseDetails.purchasePrice?.usd || product.totalPrice?.usd || 0,
          syp: purchaseDetails.purchasePrice?.syp || product.totalPrice?.syp || 0
        },
        invoiceNumber: purchaseDetails.invoiceNumber,
        paymentMethod: purchaseDetails.paymentMethod
      },
      certificateDetails: {
        issueDate: new Date(),
        status: 'active',
        verificationCode: verificationCode
      },
      additionalInfo: additionalInfo || {},
      security: {
        digitalSignature: generateDigitalSignature(product, customer, req.user, customerInfo),
        hash: generateHash(product, customer, customerInfo),
        encryptionKey: generateEncryptionKey()
      }
    };
    
    const certificate = new Certificate(certificateData);
    await certificate.save();
    
    // Log certificate creation
    securityLogger.logProductOperation('CERTIFICATE_CREATE', req, certificate._id, {
      productId: product._id,
      customerId: customer ? customer._id : null,
      customerPhone: customerInfo ? customerInfo.phone : null,
      status: certificate.status
    });
    
    // توليد QR Code بعد حفظ الشهادة
    try {
      const qrData = certificate.generateQRData();
      // generateQRData returns a string URL directly, not an object
      const qrCodeUrl = await generateQRCode(qrData);
      
      // إرجاع الشهادة مع QR Code
      res.status(201).json({
        certificate: certificate,
        qrCodeUrl: qrCodeUrl,
        qrData: qrData,
        message: 'تم إنشاء الشهادة بنجاح'
      });
    } catch (qrError) {
      // إرجاع الشهادة حتى لو فشل توليد QR Code
      res.status(201).json({
        certificate: certificate,
        qrCodeUrl: null,
        qrData: null,
        message: 'تم إنشاء الشهادة بنجاح، لكن فشل توليد QR Code',
        error: qrError.message
      });
    }
    
  } catch (err) {
    
    // Handle MongoDB duplicate key error (E11000)
    if (err.code === 11000) {
      const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : '';
      const value = err.keyValue ? Object.values(err.keyValue)[0] : '';
      
      let message = 'Duplicate entry detected';
      
      // Parse field name (might be nested like "purchaseDetails.invoiceNumber")
      const fieldName = field.split('.').pop() || field;
      
      if (fieldName.includes('invoiceNumber') || field.includes('invoiceNumber')) {
        message = `Invoice number "${value}" already exists. Please use a different invoice number.`;
      } else if (fieldName.includes('certificateId') || field.includes('certificateId')) {
        message = `Certificate ID "${value}" already exists. Please try again.`;
      } else if (fieldName.includes('verificationCode') || field.includes('verificationCode')) {
        message = `Verification code already exists. Please try again.`;
      } else {
        message = `The ${fieldName || 'value'} "${value}" already exists in the system.`;
      }
      
      return res.status(400).json({ 
        message: message,
        error: 'DUPLICATE_ENTRY',
        field: fieldName
      });
    }
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors || {}).map(e => e.message).join(', ');
      return res.status(400).json({ 
        message: `Validation error: ${messages}`,
        error: 'VALIDATION_ERROR'
      });
    }
    
    // Generic error
    res.status(500).json({ 
      message: err.message || 'An error occurred while creating the certificate',
      error: 'SERVER_ERROR'
    });
  }
};

// جلب شهادة بواسطة معرف الشهادة
exports.getCertificateById = async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    const certificate = await Certificate.findOne({ certificateId })
      .populate('product')
      .populate('customer', 'username email')
      .populate('store', 'username');
    
    if (!certificate) {
      return res.status(404).json({ message: 'الشهادة غير موجودة' });
    }
    
    // Block revoked/expired certificates from public view
    const status = certificate.certificateDetails.status;
    const expiryDate = certificate.certificateDetails.expiryDate;
    const isExpired = expiryDate && new Date(expiryDate) < new Date();
    
    if (status === 'revoked' || status === 'expired' || isExpired) {
      return res.status(403).json({ 
        message: 'هذه الشهادة غير متاحة (ملغاة أو منتهية الصلاحية)',
        status: status,
        isExpired: isExpired || status === 'expired'
      });
    }
    
    // توليد QR Code - استخدام البيانات المباشرة
    try {
      const qrData = certificate.generateQRData();
      const qrCodeUrl = await generateQRCode(qrData);
      
      res.json({
        certificate: certificate,
        qrCodeUrl: qrCodeUrl,
        qrData: qrData
      });
    } catch (qrError) {
      res.json({
        certificate: certificate,
        qrCodeUrl: null,
        qrData: null,
        error: qrError.message
      });
    }
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// التحقق من صحة الشهادة
exports.verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const { verificationCode } = req.query;
    
    // Build query - verificationCode is optional
    const query = { certificateId };
    if (verificationCode) {
      query['certificateDetails.verificationCode'] = verificationCode;
    }
    
    const certificate = await Certificate.findOne(query)
    .populate('product')
    .populate('customer', 'username email')
    .populate('store', 'username');
    
    if (!certificate) {
      return res.status(404).json({ 
        message: 'الشهادة غير صحيحة أو غير موجودة',
        isValid: false 
      });
    }
    
    // التحقق من حالة الشهادة
    const verification = certificate.verify();
    
    res.json({
      isValid: verification.isValid,
      certificate: certificate,
      verification: verification,
      message: verification.isValid ? 'الشهادة صحيحة' : 'الشهادة غير صالحة'
    });
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// جلب شهادات العميل
exports.getCustomerCertificates = async (req, res) => {
  try {
    const customerId = req.user._id;
    
    const certificates = await Certificate.find({ customer: customerId })
      .populate('product')
      .sort({ 'certificateDetails.issueDate': -1 });
    
    // توليد QR Codes للشهادات
    const certificatesWithQR = await Promise.all(
      certificates.map(async (cert) => {
        const qrData = cert.generateQRData();
        const qrCodeUrl = await generateQRCode(qrData.certificateUrl);
        return {
          certificate: cert,
          qrCodeUrl: qrCodeUrl
        };
      })
    );
    
    res.json({ certificates: certificatesWithQR });
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// جلب جميع الشهادات (للمالك)
exports.getAllCertificates = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, customer } = req.query;
    
    let filter = { store: req.user._id };
    
    if (status) {
      filter['certificateDetails.status'] = status;
    }
    
    if (customer) {
      filter.customer = customer;
    }
    
    const certificates = await Certificate.find(filter)
      .populate('product')
      .populate('customer', 'username email')
      .sort({ 'certificateDetails.issueDate': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Certificate.countDocuments(filter);
    
    res.json({
      certificates,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// تحديث حالة الشهادة
exports.updateCertificateStatus = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const { status, notes } = req.body;
    
    const certificate = await Certificate.findOne({ 
      certificateId,
      store: req.user._id 
    });
    
    if (!certificate) {
      return res.status(404).json({ message: 'الشهادة غير موجودة' });
    }
    
    certificate.certificateDetails.status = status;
    if (notes) {
      certificate.notes = notes;
    }
    
    await certificate.save();
    
    res.json({ message: 'تم تحديث حالة الشهادة بنجاح', certificate });
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// نقل ملكية الشهادة
exports.transferCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const { newCustomerId, transferReason, transferPrice } = req.body;
    
    const certificate = await Certificate.findOne({ 
      certificateId,
      customer: req.user._id 
    });
    
    if (!certificate) {
      return res.status(404).json({ message: 'الشهادة غير موجودة أو غير مملوكة لك' });
    }
    
    // التحقق من وجود العميل الجديد
    const newCustomer = await User.findById(newCustomerId);
    if (!newCustomer) {
      return res.status(404).json({ message: 'العميل الجديد غير موجود' });
    }
    
    // إضافة سجل النقل
    certificate.transferHistory.push({
      fromCustomer: certificate.customer,
      toCustomer: newCustomerId,
      transferDate: new Date(),
      transferReason: transferReason,
      transferPrice: transferPrice
    });
    
    // تحديث مالك الشهادة
    certificate.customer = newCustomerId;
    certificate.certificateDetails.status = 'transferred';
    
    await certificate.save();
    
    res.json({ message: 'تم نقل ملكية الشهادة بنجاح', certificate });
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// حذف الشهادة (إلغاؤها)
exports.revokeCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const { reason } = req.body || {};
    
    const certificate = await Certificate.findOne({ 
      certificateId,
      store: req.user._id 
    });
    
    if (!certificate) {
      return res.status(404).json({ message: 'الشهادة غير موجودة' });
    }
    
    certificate.certificateDetails.status = 'revoked';
    if (reason) {
      certificate.notes = reason;
    }
    
    await certificate.save();
    
    res.json({ message: 'تم إلغاء الشهادة بنجاح', certificate });
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// حذف الشهادة نهائياً
exports.deleteCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    const certificate = await Certificate.findOne({ 
      certificateId,
      store: req.user._id 
    });
    
    if (!certificate) {
      return res.status(404).json({ message: 'الشهادة غير موجودة أو غير مملوكة لك' });
    }
    
    // Log certificate deletion
    securityLogger.logProductOperation('CERTIFICATE_DELETE', req, certificate._id, {
      certificateId: certificate.certificateId,
      productId: certificate.product?._id,
      customerId: certificate.customer?._id
    });
    
    // Delete the certificate permanently
    await Certificate.findByIdAndDelete(certificate._id);
    
    res.json({ message: 'تم حذف الشهادة نهائياً', certificateId: certificate.certificateId });
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// تحميل الشهادة كـ HTML
exports.downloadCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    // Find certificate with minimal fields for performance
    const certificate = await Certificate.findOne({ certificateId })
      .populate('product', 'name material karat carat weight')
      .populate('customer', 'username email phone')
      .populate('store', 'username');
    
    if (!certificate) {
      return res.status(404).json({ message: 'الشهادة غير موجودة' });
    }
    
    // Security: Block revoked/expired certificates
    const status = certificate.certificateDetails.status;
    const expiryDate = certificate.certificateDetails.expiryDate;
    const isExpired = expiryDate && new Date(expiryDate) < new Date();
    
    if (status === 'revoked' || status === 'expired' || isExpired) {
      return res.status(403).json({ 
        message: 'هذه الشهادة غير متاحة للتحميل (ملغاة أو منتهية الصلاحية)',
        status: status,
        isExpired: isExpired || status === 'expired'
      });
    }
    
    // Generate QR Code (non-blocking - continue if it fails)
    let qrCodeUrl = null;
    let qrData = null;
    try {
      qrData = certificate.generateQRData();
      qrCodeUrl = await generateQRCode(qrData);
    } catch (qrError) {
      // Continue without QR code - not critical
    }
    
    // Generate HTML certificate
    const { generateImprovedCertificateHTML } = require('../utils/improvedCertificateHTML');
    const htmlContent = generateImprovedCertificateHTML(certificate, qrCodeUrl, qrData);
    
    // Return HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificateId}.html"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(htmlContent);
    
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'CERTIFICATE',
      event: 'DOWNLOAD_FAILED',
      certificateId: req.params.certificateId,
      error: err.message
    }));
    
    res.status(500).json({ 
      message: 'فشل في تحميل الشهادة',
      details: 'يرجى المحاولة مرة أخرى'
    });
  }
};

// اختبار QR Code (للتشخيص)
exports.testQRCode = async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    const certificate = await Certificate.findOne({ certificateId })
      .populate('product')
      .populate('customer', 'username email')
      .populate('store', 'username');
    
    if (!certificate) {
      return res.status(404).json({ message: 'الشهادة غير موجودة' });
    }
    
    const qrData = certificate.generateQRData();
    const qrCodeUrl = await generateQRCode(qrData);
    
    res.json({
      certificateId: certificate.certificateId,
      qrData: qrData,
      qrCodeUrl: qrCodeUrl,
      dataInQR: qrData,
      dataType: typeof qrData
    });
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// اختبار URL Helper (للتشخيص)
exports.testUrlHelper = async (req, res) => {
  try {
    const { getEnvironmentInfo, getFrontendUrl, getCertificateUrl } = require('../utils/urlHelper');
    
    const envInfo = getEnvironmentInfo();
    const frontendUrl = getFrontendUrl();
    const testCertificateUrl = getCertificateUrl('TEST-2025-000001');
    
    res.json({
      environment: envInfo,
      frontendUrl: frontendUrl,
      testCertificateUrl: testCertificateUrl,
      message: 'URL Helper is working correctly'
    });
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// تحميل الشهادة كـ HTML (للاحتياط)
exports.downloadCertificateHTML = async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    const certificate = await Certificate.findOne({ certificateId })
      .populate('product')
      .populate('customer', 'username email')
      .populate('store', 'username');
    
    if (!certificate) {
      return res.status(404).json({ message: 'الشهادة غير موجودة' });
    }
    
    // توليد QR Code - استخدام البيانات المباشرة
    const qrData = certificate.generateQRData();
    const qrCodeUrl = await generateQRCode(qrData);
    
    // إنشاء HTML للشهادة - تصميم محسن
    const { generateImprovedCertificateHTML } = require('../utils/improvedCertificateHTML');
    const htmlContent = generateImprovedCertificateHTML(certificate, qrCodeUrl, qrData);
    
    // إرجاع HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificateId}.html"`);
    res.send(htmlContent);
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// دوال مساعدة

// توليد QR Code - يدعم البيانات المباشرة أو الروابط
async function generateQRCode(data) {
  try {
    
    // Check if data is null or undefined
    if (data === null || data === undefined) {
      throw new Error('Data is null or undefined for QR Code generation');
    }
    
    // تحويل البيانات إلى JSON string إذا كانت object
    let qrData;
    if (typeof data === 'object' && data !== null) {
      qrData = JSON.stringify(data);
    } else if (typeof data === 'string') {
      qrData = data;
    } else {
      throw new Error(`Invalid data type for QR Code generation: ${typeof data}`);
    }
    
    // تأكد من أن البيانات صحيحة
    if (!qrData || qrData.length === 0) {
      throw new Error('Empty data for QR Code generation');
    }
    
    const qrCodeUrl = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrCodeUrl;
  } catch (err) {
    throw err;
  }
}

// توليد توقيع رقمي
function generateDigitalSignature(product, customer, store, customerInfo) {
  // Use customer ID if registered, or phone number if unregistered
  const customerIdentifier = customer ? customer._id : (customerInfo?.phone || 'unknown');
  const data = `${product._id}${customerIdentifier}${store._id}${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// توليد hash للتحقق من التكامل
function generateHash(product, customer, customerInfo) {
  // Use customer ID if registered, or phone number if unregistered
  const customerIdentifier = customer ? customer._id : (customerInfo?.phone || 'unknown');
  const data = `${product.name}${product.material}${product.karat}${product.weight}${customerIdentifier}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// توليد مفتاح تشفير
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

// توليد HTML للشهادة
function generateCertificateHTML(certificate, qrCodeUrl, qrData) {
  const issue = new Date(certificate.certificateDetails.issueDate);
  const purchase = new Date(certificate.purchaseDetails.purchaseDate);
  const pad2 = (n) => String(n).padStart(2, '0');
  const issueDate = `${issue.getFullYear()}-${pad2(issue.getMonth() + 1)}-${pad2(issue.getDate())}`;
  const purchaseDate = `${purchase.getFullYear()}-${pad2(purchase.getMonth() + 1)}-${pad2(purchase.getDate())}`;
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>شهادة ضمان - ${certificate.certificateId}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .certificate-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .certificate-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .certificate-header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: bold;
        }
        .certificate-header h2 {
            margin: 10px 0 0 0;
            font-size: 1.2em;
            opacity: 0.9;
        }
        .certificate-body {
            padding: 40px;
        }
        .certificate-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        .info-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            border-right: 4px solid #667eea;
        }
        .info-section h3 {
            color: #667eea;
            margin: 0 0 15px 0;
            font-size: 1.3em;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .info-item:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: bold;
            color: #495057;
        }
        .info-value {
            color: #212529;
        }
        .qr-section {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        .qr-code {
            max-width: 200px;
            margin: 0 auto 15px;
        }
        .qr-code img {
            width: 100%;
            height: auto;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .verification-info {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 10px;
            margin-top: 20px;
            border-right: 4px solid #2196f3;
        }
        .verification-info h3 {
            color: #1976d2;
            margin: 0 0 15px 0;
        }
        .verification-url {
            background: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            word-break: break-all;
            border: 1px solid #ddd;
        }
        .certificate-footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.9em;
        }
        .status-active {
            background: #d4edda;
            color: #155724;
        }
        .status-revoked {
            background: #f8d7da;
            color: #721c24;
        }
        .status-transferred {
            background: #fff3cd;
            color: #856404;
        }
        @media print {
            body {
                background: white;
                margin: 0;
                padding: 0;
            }
            .certificate-container {
                box-shadow: none;
                border: 2px solid #333;
                margin: 0;
                max-width: none;
                width: 100%;
            }
            .certificate-header {
                page-break-inside: avoid;
            }
            .certificate-body {
                page-break-inside: avoid;
            }
            .qr-section {
                page-break-inside: avoid;
            }
        }
        
        @page {
            size: A4;
            margin: 20mm;
        }
    </style>
</head>
<body>
    <div class="certificate-container">
        <div class="certificate-header">
            <h1>شهادة ضمان</h1>
            <h2>Certificate of Authenticity</h2>
            <p>رقم الشهادة: ${certificate.certificateId}</p>
        </div>
        
        <div class="certificate-body">
            <div class="certificate-info">
                <div class="info-section">
                    <h3>تفاصيل القطعة</h3>
                    <div class="info-item">
                        <span class="info-label">الاسم:</span>
                        <span class="info-value">${certificate.jewelryDetails.name}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">المادة:</span>
                        <span class="info-value">${certificate.jewelryDetails.material}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">العيار:</span>
                        <span class="info-value">${certificate.jewelryDetails.karat}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">الوزن:</span>
                        <span class="info-value">${certificate.jewelryDetails.weight} غرام</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">النوع:</span>
                        <span class="info-value">${certificate.jewelryDetails.productType}</span>
                    </div>
                </div>
                
                <div class="info-section">
                    <h3>تفاصيل الشراء</h3>
                    <div class="info-item">
                        <span class="info-label">تاريخ الشراء:</span>
                        <span class="info-value">${purchaseDate}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">السعر (USD):</span>
                        <span class="info-value">$${certificate.purchaseDetails.purchasePrice.usd}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">السعر (SYP):</span>
                        <span class="info-value">${certificate.purchaseDetails.purchasePrice.syp} ل.س</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">رقم الفاتورة:</span>
                        <span class="info-value">${certificate.purchaseDetails.invoiceNumber || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">طريقة الدفع:</span>
                        <span class="info-value">${certificate.purchaseDetails.paymentMethod || 'غير محدد'}</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h3>معلومات الشهادة</h3>
                <div class="info-item">
                    <span class="info-label">تاريخ الإصدار:</span>
                    <span class="info-value">${issueDate}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">الحالة:</span>
                    <span class="info-value">
                        <span class="status-badge status-${certificate.certificateDetails.status}">
                            ${getStatusText(certificate.certificateDetails.status)}
                        </span>
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">العميل:</span>
                    <span class="info-value">${certificate.customer.username}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">المتجر:</span>
                    <span class="info-value">${certificate.store.username}</span>
                </div>
            </div>
            
            ${qrCodeUrl ? `
            <div class="qr-section">
                <h3>رمز التحقق</h3>
                <div class="qr-code">
                    <img src="${qrCodeUrl}" alt="QR Code">
                </div>
                <p>امسح الرمز للتحقق من صحة الشهادة</p>
            </div>
            ` : ''}
            
            <div class="verification-info">
                <h3>معلومات التحقق</h3>
                <div class="info-item">
                    <span class="info-label">رمز التحقق:</span>
                    <span class="info-value">${certificate.certificateDetails.verificationCode}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">رابط التحقق:</span>
                    <div class="verification-url">${qrData.certificateUrl}</div>
                </div>
            </div>
        </div>
        
        <div class="certificate-footer">
            <p>هذه الشهادة صادرة من نظام نزار للتحقق من صحة المجوهرات</p>
            <p>© ${new Date().getFullYear()} Nizar Jewelry Authentication System</p>
        </div>
    </div>
</body>
</html>
  `;
}

// دالة مساعدة للحصول على نص الحالة
function getStatusText(status) {
  const statusMap = {
    'active': 'نشطة',
    'revoked': 'ملغاة',
    'transferred': 'منقولة',
    'expired': 'منتهية الصلاحية'
  };
  return statusMap[status] || status;
}

