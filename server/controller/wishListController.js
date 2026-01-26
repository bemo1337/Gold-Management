const mongoose = require('mongoose');
const WishList = require('../models/WishList');
const Product = require('../models/Product');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const securityLogger = require('../utils/securityLogger');

// إنشاء طلب جديد
exports.createWishListRequest = async (req, res) => {
  try {
    const {
      title,
      description,
      specifications,
      images,
      priority,
      deadline,
      location,
      privacy,
      notes,
      phone
    } = req.body;
    
    // التحقق من صحة البيانات
    if (!title || !description) {
      return res.status(400).json({ 
        message: 'العنوان والوصف مطلوبان' 
      });
    }
    
    if (title.length > 200) {
      return res.status(400).json({ 
        message: 'العنوان يجب أن يكون أقل من 200 حرف' 
      });
    }
    
    if (description.length > 500) {
      return res.status(400).json({ 
        message: 'الوصف يجب أن يكون أقل من 500 حرف' 
      });
    }
    
    // التحقق من الموعد المطلوب
    if (deadline && new Date(deadline) < new Date()) {
      return res.status(400).json({ 
        message: 'الموعد المطلوب يجب أن يكون في المستقبل' 
      });
    }
    
    // إنشاء الطلب
    const wishListData = {
      customer: req.user._id,
      title,
      description,
      specifications: {
        material: specifications?.material || 'ذهب',
        karat: specifications?.karat || 'غير محدد',
        weight: specifications?.weight || 0,
        productType: specifications?.productType || 'أخرى',
        budget: {
          min: specifications?.budget?.min || 0,
          max: specifications?.budget?.max || 0,
          currency: specifications?.budget?.currency || 'SYP'
        },
        size: specifications?.size || '',
        color: specifications?.color || '',
        design: specifications?.design || ''
      },
      images: images || [],
      priority: priority || 'medium',
      deadline: deadline ? new Date(deadline) : null,
      location: {
        city: location?.city || '',
        area: location?.area || ''
      },
      privacy: {
        isPublic: privacy?.isPublic !== false,
        showContactInfo: privacy?.showContactInfo !== false,
        allowDirectContact: privacy?.allowDirectContact !== false
      },
      notes: notes || '',
      phone: phone || ''
    };
    
    const wishListRequest = new WishList(wishListData);
    await wishListRequest.save();
    
    // Log wishlist creation
    securityLogger.logProductOperation('WISHLIST_CREATE', req, wishListRequest._id, {
      title: wishListRequest.title,
      isPublic: wishListRequest.privacy.isPublic,
      status: wishListRequest.status
    });
    
    // تحميل بيانات العميل
    await wishListRequest.populate('customer', 'username email');
    
    // إرسال إشعار للتجار
    await notifyTradersNewRequest(wishListRequest);
    
    res.status(201).json({
      message: 'تم إنشاء الطلب بنجاح',
      wishListRequest: wishListRequest
    });
    
  } catch (err) {
    console.error('Error creating wish list request:', err);
    res.status(500).json({ message: err.message });
  }
};

// جلب طلبات العميل
exports.getCustomerWishListRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let filter = { customer: req.user._id };
    
    if (status) {
      filter.status = status;
    }
    
    // Optimized: Use .lean() for read-only query to reduce memory usage
    const wishListRequests = await WishList.find(filter)
      .populate('responses.trader', 'username email')
      .populate('responses.suggestedProducts', 'name images totalPrice')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean(); // Use lean() for read-only queries to reduce memory usage
    
    const total = await WishList.countDocuments(filter);
    
    res.json({
      wishListRequests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
    
  } catch (err) {
    console.error('Error fetching customer wish list requests:', err);
    res.status(500).json({ message: err.message });
  }
};

// جلب جميع الطلبات (للتجار)
exports.getAllWishListRequests = async (req, res) => {
  try {
    const { 
      status, 
      material, 
      productType, 
      city, 
      priority,
      sortBy = 'newest',
      page = 1, 
      limit = 20 
    } = req.query;
    
    let filter = { 'privacy.isPublic': true };
    
    if (status) {
      filter.status = status;
    }
    
    if (material) {
      filter['specifications.material'] = material;
    }
    
    if (productType) {
      filter['specifications.productType'] = productType;
    }
    
    if (city) {
      filter['location.city'] = new RegExp(city, 'i');
    }
    
    if (priority) {
      filter.priority = priority;
    }
    
    // Determine sort order
    let sortCriteria = { priority: -1 };
    if (sortBy === 'newest') {
      sortCriteria.createdAt = -1;
    } else if (sortBy === 'oldest') {
      sortCriteria.createdAt = 1;
    }
    
    
    // Optimized: Use .lean() for read-only query to reduce memory usage
    const wishListRequests = await WishList.find(filter)
      .populate('customer', 'username email')
      .populate({
        path: 'responses.trader',
        select: 'username email',
        model: 'User',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'responses.suggestedProducts',
        select: 'name images totalPrice',
        model: 'Product',
        options: { strictPopulate: false }
      })
      .sort(sortCriteria)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean(); // Use lean() for read-only queries to reduce memory usage
    
    const total = await WishList.countDocuments(filter);
    
    
    
    res.json({
      wishListRequests,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total
    });
    
  } catch (err) {
    console.error('Error fetching all wish list requests:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ message: err.message || 'حدث خطأ أثناء جلب طلبات العملاء' });
  }
};

// جلب طلب محدد
exports.getWishListRequestById = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const wishListRequest = await WishList.findById(requestId)
      .populate('customer', 'username email phone')
      .populate('responses.trader', 'username email phone')
      .populate('responses.suggestedProducts', 'name images totalPrice material productType');
    
    if (!wishListRequest) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }
    
    // التحقق من الصلاحيات
    if (wishListRequest.customer._id.toString() !== req.user._id.toString() && 
        req.user.role !== 'owner') {
      return res.status(403).json({ message: 'غير مصرح لك بالوصول لهذا الطلب' });
    }
    
    // تحديث عدد المشاهدات
    wishListRequest.stats.views += 1;
    wishListRequest.stats.lastViewedAt = new Date();
    await wishListRequest.save();
    
    res.json({ wishListRequest });
    
  } catch (err) {
    console.error('Error fetching wish list request:', err);
    res.status(500).json({ message: err.message });
  }
};

// تحديث طلب
exports.updateWishListRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const updateData = req.body;
    
    const wishListRequest = await WishList.findOne({
      _id: requestId,
      customer: req.user._id
    });
    
    if (!wishListRequest) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }
    
    if (wishListRequest.status === 'completed' || wishListRequest.status === 'cancelled') {
      return res.status(400).json({ message: 'لا يمكن تعديل طلب مكتمل أو ملغي' });
    }
    
    // تحديث البيانات
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        wishListRequest[key] = updateData[key];
      }
    });
    
    await wishListRequest.save();
    
    res.json({
      message: 'تم تحديث الطلب بنجاح',
      wishListRequest
    });
    
  } catch (err) {
    console.error('Error updating wish list request:', err);
    res.status(500).json({ message: err.message });
  }
};

// حذف طلب
exports.deleteWishListRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Allow customers to delete their own requests, or owners to delete any request
    const wishListRequest = await WishList.findById(requestId);
    
    if (!wishListRequest) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }
    
    // Check if user is owner or the customer who created the request
    if (req.user.role !== 'owner' && wishListRequest.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'غير مصرح لك بحذف هذا الطلب' });
    }
    
    await WishList.findByIdAndDelete(requestId);
    
    res.json({ message: 'تم حذف الطلب بنجاح' });
    
  } catch (err) {
    console.error('Error deleting wish list request:', err);
    res.status(500).json({ message: err.message });
  }
};

// إضافة رد على الطلب
exports.addResponseToRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const {
      message,
      suggestedProducts,
      priceEstimate,
      canCustomize,
      estimatedTime,
      contactInfo
    } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'الرسالة مطلوبة' });
    }
    
    const wishListRequest = await WishList.findById(requestId);
    
    if (!wishListRequest) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }
    
    if (!wishListRequest.canRespond()) {
      return res.status(400).json({ message: 'لا يمكن الرد على هذا الطلب' });
    }
    
    // التحقق من أن التاجر لم يرد من قبل
    const existingResponse = wishListRequest.responses.find(
      response => response.trader.toString() === req.user._id.toString()
    );
    
    if (existingResponse) {
      return res.status(400).json({ message: 'لقد قمت بالرد على هذا الطلب من قبل' });
    }
    
    // إنشاء الرد
    const responseData = {
      trader: req.user._id,
      message,
      suggestedProducts: suggestedProducts || [],
      priceEstimate: priceEstimate || {},
      canCustomize: canCustomize || false,
      estimatedTime: estimatedTime || '',
      contactInfo: contactInfo || {}
    };
    
    await wishListRequest.addResponse(responseData);
    
    
    // تحميل بيانات التاجر
    await wishListRequest.populate('responses.trader', 'username email');
    
    // إرسال إشعار للعميل
    await notifyCustomerNewResponse(wishListRequest, responseData);
    
    res.json({
      message: 'تم إضافة الرد بنجاح',
      wishListRequest
    });
    
  } catch (err) {
    console.error('Error adding response to request:', err);
    res.status(500).json({ message: err.message });
  }
};

// تحديث حالة الطلب
exports.updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, reason } = req.body;
    
    const wishListRequest = await WishList.findOne({
      _id: requestId,
      customer: req.user._id
    });
    
    if (!wishListRequest) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }
    
    await wishListRequest.updateStatus(status, reason);
    
    res.json({
      message: 'تم تحديث حالة الطلب بنجاح',
      wishListRequest
    });
    
  } catch (err) {
    console.error('Error updating request status:', err);
    res.status(500).json({ message: err.message });
  }
};

// جلب عدد الطلبات غير المقرؤة
exports.getUnseenWishListCount = async (req, res) => {
  try {
    const count = await WishList.countDocuments({
      'privacy.isPublic': true,
      status: { $in: ['pending', 'in_progress'] },
      seenByOwner: false
    });
    
    res.json({ count });
  } catch (err) {
    console.error('Error getting unseen wishlist count:', err);
    res.status(500).json({ message: err.message });
  }
};

// تعليم الطلبات كمقروءة عند زيارة صفحة الطلبات
exports.markWishListAsSeen = async (req, res) => {
  try {
    await WishList.updateMany(
      {
        'privacy.isPublic': true,
        status: { $in: ['pending', 'in_progress'] },
        seenByOwner: false
      },
      {
        $set: { seenByOwner: true }
      }
    );
    
    res.json({ message: 'تم تعليم الطلبات كمقروءة' });
  } catch (err) {
    console.error('Error marking wishlist as seen:', err);
    res.status(500).json({ message: err.message });
  }
};

// دوال مساعدة

// إشعار التجار بطلب جديد
async function notifyTradersNewRequest(wishListRequest) {
  try {
    // Notification logic can be implemented here if needed
  } catch (error) {
    console.error('Error notifying traders:', error);
  }
}

// إشعار العميل برد جديد
async function notifyCustomerNewResponse(wishListRequest, responseData) {
  try {
    if (!wishListRequest.customer.email) return;
    
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: wishListRequest.customer.email,
      subject: `رد جديد على طلبك: ${wishListRequest.title}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #D4AF37;">رد جديد على طلبك</h2>
          <p>عزيزي ${wishListRequest.customer.username}،</p>
          <p>تم الرد على طلبك "<strong>${wishListRequest.title}</strong>" من قبل تاجر.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3>تفاصيل الرد:</h3>
            <p><strong>الرسالة:</strong> ${responseData.message}</p>
            ${responseData.priceEstimate.amount ? `
              <p><strong>التقدير السعري:</strong> ${responseData.priceEstimate.amount} ${responseData.priceEstimate.currency}</p>
            ` : ''}
            ${responseData.estimatedTime ? `
              <p><strong>الوقت المتوقع:</strong> ${responseData.estimatedTime}</p>
            ` : ''}
            ${responseData.canCustomize ? `
              <p><strong>يمكن التصنيع حسب الطلب:</strong> نعم</p>
            ` : ''}
          </div>
          
          <p>زر موقعنا لمشاهدة الرد الكامل: <a href="${process.env.FRONTEND_URL || 'http://localhost:3002'}">نزار للمجوهرات</a></p>
          <p>شكراً لثقتكم في نزار للمجوهرات</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
  } catch (error) {
    console.error('Error sending response notification:', error);
  }
}

module.exports = {
  createWishListRequest: exports.createWishListRequest,
  getCustomerWishListRequests: exports.getCustomerWishListRequests,
  getAllWishListRequests: exports.getAllWishListRequests,
  getWishListRequestById: exports.getWishListRequestById,
  updateWishListRequest: exports.updateWishListRequest,
  deleteWishListRequest: exports.deleteWishListRequest,
  addResponseToRequest: exports.addResponseToRequest,
  updateRequestStatus: exports.updateRequestStatus,
  getUnseenWishListCount: exports.getUnseenWishListCount,
  markWishListAsSeen: exports.markWishListAsSeen
};
