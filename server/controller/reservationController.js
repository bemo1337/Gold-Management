const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Product = require('../models/Product');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const securityLogger = require('../utils/securityLogger');
const VALIDATION_LIMITS = require('../constants/validationLimits');

// إنشاء حجز جديد
exports.createReservation = async (req, res) => {
  try {
    // التحقق من وجود المستخدم
    if (!req.user) {
      return res.status(401).json({ message: 'يجب تسجيل الدخول أولاً' });
    }
    
    const { productId, durationHours = 24, phone } = req.body;
    
    if (!productId) {
      return res.status(400).json({ message: 'معرف المنتج مطلوب' });
    }
    
    // التحقق من وجود المنتج
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }
    
    // التحقق من أن المنتج الخاص لا يحتوي على حجز نشط
    if (product.special) {
      const existingSpecialReservation = await Reservation.findOne({
        product: productId,
        status: { $in: ['pending', 'approved'] }
      });
      
      if (existingSpecialReservation) {
        // Check if the reservation belongs to the current user
        const isCurrentUserReservation = existingSpecialReservation.customer && 
          existingSpecialReservation.customer.toString() === req.user._id.toString();
        
        if (!isCurrentUserReservation) {
          return res.status(400).json({ 
            message: 'هذا المنتج خاص وتم حجزه بالفعل من قبل عميل آخر. يمكن حجز منتج خاص واحد فقط.',
            isSpecial: true
          });
        }
      }
    }
    
    // التحقق من أن العميل لا يملك حجز نشط
    const existingReservation = await Reservation.hasActiveReservation(req.user._id);
    if (existingReservation) {
      return res.status(400).json({ 
        message: 'لا يمكنك إنشاء أكثر من حجز واحد في نفس الوقت. الرجاء إنهاء أو إلغاء الحجز الحالي أولاً.',
        existingReservation: existingReservation.getSummary()
      });
    }
    
    // التحقق من صحة مدة الحجز
    if (durationHours < VALIDATION_LIMITS.NUMERIC_LIMITS.DURATION_HOURS_MIN || durationHours > VALIDATION_LIMITS.NUMERIC_LIMITS.DURATION_HOURS_MAX) {
      return res.status(400).json({ 
        message: `مدة الحجز يجب أن تكون بين ${VALIDATION_LIMITS.NUMERIC_LIMITS.DURATION_HOURS_MIN} و ${VALIDATION_LIMITS.NUMERIC_LIMITS.DURATION_HOURS_MAX} ساعة`,
        code: 'INVALID_DURATION'
      });
    }
    
    // إنشاء الحجز
    const reservationData = {
      customer: req.user._id,
      product: productId,
      durationHours: durationHours,
      expiresAt: new Date(Date.now() + (durationHours * 60 * 60 * 1000)),
      phone: phone || ''
    };
    
    const reservation = new Reservation(reservationData);
    await reservation.save();
    
    // تحميل بيانات العميل والمنتج
    await reservation.populate([
      { path: 'customer', select: 'username email phone' },
      { path: 'product', select: 'name images totalPrice material karat weight' }
    ]);
    
    // Log reservation creation
    securityLogger.logProductOperation('RESERVATION_CREATE', req, reservation._id, {
      productId: product._id,
      status: reservation.status,
      appointmentDate: reservation.appointmentDate
    });
    
    // إرسال إشعار للتاجر
    await notifyTraderNewReservation(reservation);
    
    res.status(201).json({
      message: 'تم إنشاء الحجز بنجاح',
      reservation: reservation.getSummary()
    });
    
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'CREATE_RESERVATION_ERROR',
      userId: req.user?._id || 'unknown',
      details: { error: err.message }
    }));
    res.status(500).json({ 
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// جلب حجوزات العميل
exports.getCustomerReservations = async (req, res) => {
  try {
    // التحقق من وجود المستخدم
    if (!req.user) {
      return res.status(401).json({ message: 'يجب تسجيل الدخول أولاً' });
    }
    
    const { status, page = 1, limit = 10, sortBy = 'newest', timeRange } = req.query;
    
    let filter = { customer: req.user._id };
    
    if (status) {
      filter.status = status;
    }
    
    // Handle time range filter
    if (timeRange) {
      const now = new Date();
      switch (timeRange) {
        case 'today':
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          filter.createdAt = { $gte: today };
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filter.createdAt = { $gte: weekAgo };
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filter.createdAt = { $gte: monthAgo };
          break;
        case 'older':
          const monthAgoOlder = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filter.createdAt = { $lt: monthAgoOlder };
          break;
      }
    }
    
    // Handle sorting
    let sortOption = { createdAt: -1 }; // Default: newest first
    switch (sortBy) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'price-high':
        sortOption = { 'product.totalPrice': -1 };
        break;
      case 'price-low':
        sortOption = { 'product.totalPrice': 1 };
        break;
      case 'status':
        sortOption = { status: 1 };
        break;
      default: // 'newest'
        sortOption = { createdAt: -1 };
    }
    
    const reservations = await Reservation.find(filter)
      .populate('product', 'name images totalPrice material karat productType weight')
      .populate('respondedBy', 'username')
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Reservation.countDocuments(filter);
    
    // تحديث الحجوزات المنتهية
    await updateExpiredReservations();
    
    res.json({
      reservations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
    
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'FETCH_CUSTOMER_RESERVATIONS_ERROR',
      details: { error: err.message }
    }));
    res.status(500).json({ 
      message: 'حدث خطأ أثناء جلب الحجوزات',
      code: 'SERVER_ERROR'
    });
  }
};

// جلب عدد الحجوزات غير المرئية (للتجار)
exports.getUnseenReservationsCount = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'owner') {
      return res.status(403).json({ message: 'غير مصرح' });
    }
    
    const count = await Reservation.countDocuments({
      status: 'pending',
      seenByOwner: false
    });
    
    res.json({ count });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'FETCH_UNSEEN_RESERVATIONS_COUNT_ERROR',
      details: { error: err.message }
    }));
    res.status(500).json({ 
      message: 'حدث خطأ أثناء جلب عدد الحجوزات',
      code: 'SERVER_ERROR'
    });
  }
};

// تحديد الحجوزات كمقروءة (للتجار)
exports.markReservationsAsSeen = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'owner') {
      return res.status(403).json({ message: 'غير مصرح' });
    }
    
    const result = await Reservation.updateMany(
      { status: 'pending', seenByOwner: false },
      { $set: { seenByOwner: true } }
    );
    
    res.json({ 
      message: 'تم تحديد الحجوزات كمقروءة',
      updatedCount: result.modifiedCount
    });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'MARK_RESERVATIONS_SEEN_ERROR',
      details: { error: err.message }
    }));
    res.status(500).json({ 
      message: 'حدث خطأ أثناء تحديث حالة الحجوزات',
      code: 'SERVER_ERROR'
    });
  }
};

// التحقق من وجود حجز نشط لمنتج معين (للعملاء - للتحقق من المنتجات الخاصة)
exports.checkProductReservation = async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (!productId) {
      return res.status(400).json({ message: 'معرف المنتج مطلوب' });
    }
    
    const activeReservation = await Reservation.findOne({
      product: productId,
      status: { $in: ['pending', 'approved'] }
    });
    
    // Check if the reservation belongs to the current user
    const isCurrentUserReservation = req.user && activeReservation && 
      activeReservation.customer && 
      activeReservation.customer.toString() === req.user._id.toString();
    
    res.json({
      hasActiveReservation: !!activeReservation,
      isReserved: !!activeReservation,
      isCurrentUserReservation: isCurrentUserReservation || false
    });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'CHECK_PRODUCT_RESERVATION_ERROR',
      details: { error: err.message }
    }));
    res.status(500).json({ 
      message: 'حدث خطأ أثناء التحقق من حجز المنتج',
      code: 'SERVER_ERROR'
    });
  }
};

// جلب جميع طلبات الحجز (للتجار)
exports.getAllReservations = async (req, res) => {
  try {
    // التحقق من وجود المستخدم
    if (!req.user) {
      return res.status(401).json({ message: 'يجب تسجيل الدخول أولاً' });
    }
    
    const { 
      status, 
      productId,
      page = 1, 
      limit = 20 
    } = req.query;
    
    let filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (productId) {
      filter.product = productId;
    }
    
    const reservations = await Reservation.find(filter)
      .populate('customer', 'username email phone')
      .populate('product', 'name images totalPrice material karat productType weight')
      .populate('respondedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Reservation.countDocuments(filter);
    
    // تحديث الحجوزات المنتهية
    await updateExpiredReservations();
    
    res.json({
      reservations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
    
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'FETCH_ALL_RESERVATIONS_ERROR',
      details: { error: err.message }
    }));
    res.status(500).json({ 
      message: 'حدث خطأ أثناء جلب الحجوزات',
      code: 'SERVER_ERROR'
    });
  }
};

// جلب حجز محدد
exports.getReservationById = async (req, res) => {
  try {
    const { reservationId } = req.params;
    
    const reservation = await Reservation.findById(reservationId)
      .populate('customer', 'username email phone')
      .populate('product', 'name images totalPrice material karat productType weight')
      .populate('respondedBy', 'username');
    
    if (!reservation) {
      return res.status(404).json({ message: 'الحجز غير موجود' });
    }
    
    // التحقق من الصلاحيات
    if (reservation.customer._id.toString() !== req.user._id.toString() && 
        req.user.role !== 'owner') {
      return res.status(403).json({ message: 'غير مصرح لك بالوصول لهذا الحجز' });
    }
    
    // تحديث عدد المشاهدات
    reservation.stats.views += 1;
    reservation.stats.lastViewedAt = new Date();
    await reservation.save();
    
    res.json({ reservation });
    
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'FETCH_RESERVATION_ERROR',
      details: { error: err.message }
    }));
    res.status(500).json({ 
      message: 'حدث خطأ أثناء جلب الحجز',
      code: 'SERVER_ERROR'
    });
  }
};

// الموافقة على الحجز
exports.approveReservation = async (req, res) => {
  try {
    // التحقق من وجود المستخدم
    if (!req.user) {
      return res.status(401).json({ message: 'يجب تسجيل الدخول أولاً' });
    }
    
    const { reservationId } = req.params;
    const { notes } = req.body || {};
    
    const reservation = await Reservation.findById(reservationId)
      .populate('customer', 'username email')
      .populate('product', 'name');
    
    if (!reservation) {
      return res.status(404).json({ message: 'الحجز غير موجود' });
    }
    
    if (reservation.status !== 'pending') {
      return res.status(400).json({ message: 'لا يمكن الموافقة على هذا الحجز' });
    }
    
    // تحديث حالة الحجز
    await reservation.updateStatus('approved', '', req.user._id);
    
    if (notes) {
      reservation.notes = notes;
      await reservation.save();
    }
    
    // إرسال إشعار للعميل
    await notifyCustomerReservationUpdate(reservation, 'approved');
    
    res.json({
      message: 'تم الموافقة على الحجز بنجاح',
      reservation: reservation.getSummary()
    });
    
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'APPROVE_RESERVATION_ERROR',
      userId: req.user?._id || 'unknown',
      details: { error: err.message }
    }));
    res.status(500).json({ message: err.message });
  }
};

// رفض الحجز
exports.rejectReservation = async (req, res) => {
  try {
    // التحقق من وجود المستخدم
    if (!req.user) {
      return res.status(401).json({ message: 'يجب تسجيل الدخول أولاً' });
    }
    
    const { reservationId } = req.params;
    const { reason, notes } = req.body || {};
    
    const reservation = await Reservation.findById(reservationId)
      .populate('customer', 'username email')
      .populate('product', 'name');
    
    if (!reservation) {
      return res.status(404).json({ message: 'الحجز غير موجود' });
    }
    
    if (reservation.status !== 'pending') {
      return res.status(400).json({ message: 'لا يمكن رفض هذا الحجز' });
    }
    
    // تحديث حالة الحجز
    await reservation.updateStatus('rejected', reason || '', req.user._id);
    
    if (notes) {
      reservation.notes = notes;
      await reservation.save();
    }
    
    // إرسال إشعار للعميل
    await notifyCustomerReservationUpdate(reservation, 'rejected');
    
    res.json({
      message: 'تم رفض الحجز بنجاح',
      reservation: reservation.getSummary()
    });
    
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'REJECT_RESERVATION_ERROR',
      userId: req.user?._id || 'unknown',
      details: { error: err.message }
    }));
    res.status(500).json({ message: err.message });
  }
};

// إلغاء الحجز (من قبل العميل)
exports.cancelReservation = async (req, res) => {
  try {
    // التحقق من وجود المستخدم
    if (!req.user) {
      return res.status(401).json({ message: 'يجب تسجيل الدخول أولاً' });
    }
    
    const { reservationId } = req.params;
    const reservation = await Reservation.findById(reservationId);
    
    if (!reservation) {
      return res.status(404).json({ message: 'الحجز غير موجود' });
    }
    
    if (reservation.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'غير مصرح لك بإلغاء هذا الحجز' });
    }
    
    // السماح بإلغاء الحجوزات المنتهية أيضاً
    if (reservation.status === 'cancelled') {
      return res.status(400).json({ message: 'هذا الحجز ملغي بالفعل' });
    }
    
    if (reservation.status === 'completed') {
      return res.status(400).json({ message: 'لا يمكن إلغاء حجز مكتمل' });
    }
    
    await reservation.cancel();
    
    res.json({
      message: 'تم إلغاء الحجز بنجاح',
      reservation: reservation.getSummary()
    });
    
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'CANCEL_RESERVATION_ERROR',
      userId: req.user?._id || 'unknown',
      details: { error: err.message }
    }));
    res.status(500).json({ message: err.message });
  }
};

// تحديث الحجوزات المنتهية
exports.updateExpiredReservations = async (req, res) => {
  try {
    const updatedCount = await updateExpiredReservations();
    
    res.json({
      message: `تم تحديث ${updatedCount} حجز منتهي`,
      updatedCount
    });
    
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'UPDATE_EXPIRED_RESERVATIONS_ERROR',
      details: { error: err.message }
    }));
    res.status(500).json({ 
      message: 'حدث خطأ أثناء تحديث الحجوزات المنتهية',
      code: 'SERVER_ERROR'
    });
  }
};

// دوال مساعدة

// إشعار التاجر بطلب حجز جديد
async function notifyTraderNewReservation(reservation) {
  try {
    // Notification logic can be implemented here if needed
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'NOTIFICATION',
      event: 'NOTIFY_TRADER_ERROR',
      details: { error: error.message }
    }));
  }
}

// إشعار العميل بتحديث الحجز
async function notifyCustomerReservationUpdate(reservation, action) {
  try {
    // Notification logic can be implemented here if needed
    
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'NOTIFICATION',
      event: 'NOTIFY_CUSTOMER_ERROR',
      details: { error: error.message }
    }));
  }
}

// تحديث الحجوزات المنتهية
async function updateExpiredReservations() {
  try {
    const expiredReservations = await Reservation.findExpiredReservations();
    let updatedCount = 0;
    
    for (const reservation of expiredReservations) {
      await reservation.updateStatus('expired');
      
      // إرسال إشعار بانتهاء الحجز
      await reservation.populate(['customer', 'product']);
      await notifyCustomerReservationUpdate(reservation, 'expired');
      
      updatedCount++;
    }
    
    return updatedCount;
    
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'UPDATE_EXPIRED_RESERVATIONS_BACKGROUND_ERROR',
      details: { error: error.message }
    }));
    return 0;
  }
}

// حذف الحجز نهائياً
exports.deleteReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    
    // التحقق من وجود الحجز
    const reservation = await Reservation.findById(reservationId).populate('product');
    if (!reservation) {
      return res.status(404).json({ message: 'الحجز غير موجود' });
    }
    
    // التحقق من الصلاحيات - إذا كان owner، يمكنه حذف أي حجز
    const isOwner = req.user.role === 'owner';
    
    if (isOwner) {
      // حذف الحجز مباشرة
      await Reservation.findByIdAndDelete(reservationId);
      
      return res.json({ 
        message: 'تم حذف الحجز بنجاح',
        deletedReservationId: reservationId
      });
    }
    
    // إذا لم يكن owner، التحقق من أنه العميل نفسه
    const isCustomer = reservation.customer.toString() === req.user._id.toString();
    
    if (!isCustomer) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لحذف هذا الحجز' });
    }
    
    // إذا كان العميل، يجب أن يكون الحجز منتهي أو مرفوض أو ملغي
    const allowedStatuses = ['rejected', 'cancelled', 'expired'];
    if (!allowedStatuses.includes(reservation.status)) {
      return res.status(400).json({ 
        message: 'لا يمكن حذف الحجوزات النشطة. يجب إلغاؤها أولاً.',
        currentStatus: reservation.status
      });
    }
    
    // حذف الحجز
    await Reservation.findByIdAndDelete(reservationId);
    
    res.json({ 
      message: 'تم حذف الحجز بنجاح',
      deletedReservationId: reservationId
    });
    
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'DELETE_RESERVATION_ERROR',
      userId: req.user?._id || 'unknown',
      details: { error: error.message }
    }));
    res.status(500).json({ 
      message: 'حدث خطأ أثناء حذف الحجز',
      error: error.message 
    });
  }
};

// تشغيل تحديث الحجوزات المنتهية كل 5 دقائق
// Only run in production/test mode, skip in test environment
if (process.env.NODE_ENV !== 'test' && !process.env.TEST_MODE) {
  setInterval(updateExpiredReservations, 5 * 60 * 1000);
}

module.exports = {
  createReservation: exports.createReservation,
  getCustomerReservations: exports.getCustomerReservations,
  getUnseenReservationsCount: exports.getUnseenReservationsCount,
  markReservationsAsSeen: exports.markReservationsAsSeen,
  getAllReservations: exports.getAllReservations,
  getReservationById: exports.getReservationById,
  approveReservation: exports.approveReservation,
  rejectReservation: exports.rejectReservation,
  cancelReservation: exports.cancelReservation,
  deleteReservation: exports.deleteReservation,
  updateExpiredReservations: exports.updateExpiredReservations,
  checkProductReservation: exports.checkProductReservation
};
