const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { generateVerificationToken, sendVerificationEmail, sendPasswordResetEmail, sendAccountLockoutEmail } = require('../utils/emailService');
const securityLogger = require('../utils/securityLogger');
const VALIDATION_LIMITS = require('../constants/validationLimits');

// Validate JWT secrets are set (security requirement)
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET must be set in environment variables');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const isDevelopment = process.env.NODE_ENV !== 'production';

// Token expiration times (from constants)
const ACCESS_TOKEN_EXPIRY = isDevelopment 
  ? VALIDATION_LIMITS.TOKEN_EXPIRY.ACCESS_TOKEN_DEV 
  : VALIDATION_LIMITS.TOKEN_EXPIRY.ACCESS_TOKEN_PROD;
// Admin tokens have shorter expiration for security
const ADMIN_ACCESS_TOKEN_EXPIRY = isDevelopment
  ? VALIDATION_LIMITS.TOKEN_EXPIRY.ADMIN_ACCESS_TOKEN_DEV
  : VALIDATION_LIMITS.TOKEN_EXPIRY.ADMIN_ACCESS_TOKEN_PROD;
const REFRESH_TOKEN_EXPIRY = VALIDATION_LIMITS.TOKEN_EXPIRY.REFRESH_TOKEN_MS;

// Helper function to generate tokens
// Admin users get shorter token expiration for enhanced security
const generateAccessToken = (userId, role, username = null, email = null) => {
  const payload = { id: userId, role };
  if (username) payload.username = username;
  if (email) payload.email = email;
  
  // Use shorter expiration for admin users
  const expiresIn = role === 'owner' ? ADMIN_ACCESS_TOKEN_EXPIRY : ACCESS_TOKEN_EXPIRY;
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

const generateRefreshToken = () => {
  return crypto.randomBytes(VALIDATION_LIMITS.SECURITY.REFRESH_TOKEN_BYTES).toString('hex');
};

// Helper function to calculate lockout duration based on failed attempts
const getLockoutDuration = (failedAttempts) => {
  const { LOCKOUT } = VALIDATION_LIMITS;
  if (failedAttempts >= 20) return LOCKOUT.EXTENDED_LOCKOUT_MS;
  if (failedAttempts >= 10) return LOCKOUT.LONG_LOCKOUT_MS;
  if (failedAttempts >= 7) return LOCKOUT.MEDIUM_LOCKOUT_MS;
  return LOCKOUT.INITIAL_LOCKOUT_MS;
};

// Helper function to set refresh token cookie
const setRefreshTokenCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie('refreshToken', token, {
    httpOnly: true, // Cannot be accessed by JavaScript (XSS protection)
    secure: isProduction, // true in production (HTTPS only)
    sameSite: 'strict', // Prevent CSRF attacks
    maxAge: REFRESH_TOKEN_EXPIRY,
    path: '/'
  });
  
  // Cookie set
};

// User Controller
exports.register = async (req, res) => {
  try {
    // Register request received
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      // If user exists but email is not verified, offer to resend verification
      if (!existingUser.emailVerified && existingUser.authMethod === 'email') {
        return res.status(400).json({ 
          message: 'يوجد حساب بهذا البريد الإلكتروني غير مفعّل. يرجى طلب إعادة إرسال رسالة التحقق.',
          existingAccount: true,
          emailVerified: false,
          email: existingUser.email,
          canResendVerification: true
        });
      }
      return res.status(400).json({ message: 'اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل' });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, VALIDATION_LIMITS.SECURITY.BCRYPT_ROUNDS);
    
    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = new Date(Date.now() + VALIDATION_LIMITS.TOKEN_EXPIRY.VERIFICATION_TOKEN_MS);
    
    // Create user
    const user = new User({ 
      username, 
      email, 
      password: hashedPassword, 
      role: role || 'customer',
      authMethod: 'email',
      emailVerified: false, // Email users need to verify their email
      verificationToken: verificationToken,
      verificationTokenExpiry: verificationTokenExpiry
    });
    await user.save();
    
    // Send verification email
    let emailSent = false;
    let emailError = null;
    try {
      const emailResult = await sendVerificationEmail(user, verificationToken);
      emailSent = emailResult.success;
      // Removed: Email sent success logging (too verbose for production - only log errors)
    } catch (error) {
      emailError = error;
      emailSent = false;
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        category: 'OPERATION',
        event: 'EMAIL_SEND_FAILED',
        details: { 
          operation: 'verification_email', 
          email: user.email,
          error: error.message,
          errorCode: error.code,
          errorResponse: error.response?.body
        }
      }));
      // Don't fail registration if email fails - user can request resend later
    }
    
    // Return success message - DON'T log them in yet!
    res.status(201).json({
      message: emailSent 
        ? 'تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.'
        : 'تم إنشاء الحساب بنجاح. يرجى المحاولة لاحقاً لإرسال رسالة التحقق.',
      emailSent: emailSent,
      email: user.email,
      requiresVerification: true,
      ...(emailError && { emailError: 'فشل إرسال البريد الإلكتروني. يرجى المحاولة لاحقاً.' })
    });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ أثناء إنشاء الحساب' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!password || (!email && !username)) {
      securityLogger.logAuthEvent('LOGIN_ATTEMPT', req, false, { reason: 'Missing credentials' });
      return res.status(400).json({ message: 'Email or username and password are required.' });
    }
    // Find user by email or username
    const user = await User.findOne(email ? { email } : { username });
    if (!user) {
      securityLogger.logAuthEvent('LOGIN_ATTEMPT', req, false, { reason: 'User not found', email, username });
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // SECURITY: Check account lockout status and auto-unlock if expired
    const now = Date.now();
    if (user.accountLocked && user.lockedUntil) {
      if (user.lockedUntil.getTime() > now) {
        // Still locked - return locked status
        const unlockTime = new Date(user.lockedUntil).toLocaleString('ar-SA', {
          timeZone: 'Asia/Riyadh',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        securityLogger.logSecurityEvent('ACCOUNT_LOCKED_ACCESS_ATTEMPT', req, {
          userId: user._id,
          username: user.username,
          lockedUntil: user.lockedUntil,
          failedAttempts: user.failedAttempts
        });
        return res.status(423).json({ 
          message: 'تم قفل حسابك مؤقتاً بسبب عدة محاولات تسجيل دخول فاشلة. يرجى المحاولة لاحقاً.',
          accountLocked: true,
          lockedUntil: user.lockedUntil,
          unlockTime: unlockTime
        });
      } else {
        // Lockout expired - auto-unlock
        user.accountLocked = false;
        user.failedAttempts = 0;
        user.lockedUntil = null;
        user.lastFailedAttempt = null;
        await user.save();
      }
    }

    // SECURITY: Reset failed attempts if reset window has passed
    const { LOCKOUT } = VALIDATION_LIMITS;
    if (user.lastFailedAttempt) {
      const timeSinceLastAttempt = now - user.lastFailedAttempt.getTime();
      if (timeSinceLastAttempt > LOCKOUT.RESET_WINDOW_MS) {
        user.failedAttempts = 0;
        user.lastFailedAttempt = null;
        await user.save();
      }
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increment failed attempts
      user.failedAttempts = (user.failedAttempts || 0) + 1;
      user.lastFailedAttempt = new Date();

      // Check if account should be locked
      if (user.failedAttempts >= LOCKOUT.MAX_FAILED_ATTEMPTS) {
        const lockoutDuration = getLockoutDuration(user.failedAttempts);
        user.accountLocked = true;
        user.lockedUntil = new Date(now + lockoutDuration);

        await user.save();

        // Log lockout event
        securityLogger.logSecurityEvent('ACCOUNT_LOCKED', req, {
          userId: user._id,
          username: user.username,
          failedAttempts: user.failedAttempts,
          lockoutDuration: lockoutDuration,
          lockedUntil: user.lockedUntil
        });

        // Send lockout email (async - don't block)
        sendAccountLockoutEmail(user, user.lockedUntil).catch(err => {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            category: 'OPERATION',
            event: 'LOCKOUT_EMAIL_FAILED',
            userId: user._id,
            details: { error: err.message }
          }));
        });

        const unlockTime = new Date(user.lockedUntil).toLocaleString('ar-SA', {
          timeZone: 'Asia/Riyadh',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        return res.status(423).json({ 
          message: 'تم قفل حسابك مؤقتاً بسبب عدة محاولات تسجيل دخول فاشلة. يرجى المحاولة لاحقاً.',
          accountLocked: true,
          lockedUntil: user.lockedUntil,
          unlockTime: unlockTime
        });
      } else {
        // Save failed attempt but don't lock yet
        await user.save();
      }

      securityLogger.logAuthEvent('LOGIN_ATTEMPT', req, false, { 
        reason: 'Invalid password', 
        userId: user._id,
        failedAttempts: user.failedAttempts,
        maxAttempts: LOCKOUT.MAX_FAILED_ATTEMPTS
      });
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // SECURITY: Reset lockout fields on successful login
    if (user.failedAttempts > 0 || user.accountLocked) {
      user.failedAttempts = 0;
      user.accountLocked = false;
      user.lockedUntil = null;
      user.lastFailedAttempt = null;
      await user.save();
    }
    
    // SECURITY: Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({ 
        message: 'يجب تأكيد البريد الإلكتروني قبل تسجيل الدخول',
        emailVerified: false,
        email: user.email,
        canResendVerification: true
      });
    }
    
    // Delete old refresh tokens for this user
    const deletedCount = await RefreshToken.deleteMany({ userId: user._id });
      // Deleted old refresh tokens
    
    // Generate new tokens
    const accessToken = generateAccessToken(user._id, user.role, user.username, user.email);
    const refreshToken = generateRefreshToken();
    
    // Store refresh token in database
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);
    
    try {
      const savedToken = await RefreshToken.create({
        userId: user._id,
        token: refreshToken,
        expiresAt
      });
      
    } catch (saveError) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        category: 'OPERATION',
        event: 'TOKEN_SAVE_FAILED',
        userId: user._id,
        details: { error: saveError.message }
      }));
      // Continue anyway - user can still login with short-lived access token
    }
    
    // Set refresh token as HttpOnly cookie
    setRefreshTokenCookie(res, refreshToken);
    
    // Log successful login
    securityLogger.logAuthEvent('LOGIN_SUCCESS', req, true, { 
      userId: user._id, 
      username: user.username, 
      role: user.role
    });
    
    
    // Return access token and user info
    res.json({
      accessToken,
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'AUTH',
      event: 'LOGIN_ERROR',
      details: { error: err.message }
    }));
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (refreshToken) {
      // Delete refresh token from database
      const deleteResult = await RefreshToken.deleteOne({ token: refreshToken });
      
      if (deleteResult.deletedCount === 0) {
        // Token not found in database - log warning but don't fail
        if (isDevelopment) {
          console.warn(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'WARN',
            category: 'OPERATION',
            event: 'TOKEN_NOT_FOUND_ON_LOGOUT',
            userId: req.user?._id || 'unknown',
            details: { message: 'Refresh token cookie does not match any DB token' }
          }));
        }
      }
      
      // Also delete all tokens for this user (cleanup duplicates)
      if (req.user?._id) {
        await RefreshToken.deleteMany({ userId: req.user._id });
      }
    }
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'LOGOUT_ERROR',
      userId: req.user?._id || 'unknown',
      details: { error: err.message }
    }));
    res.status(500).json({ message: 'Server error during logout' });
  }
};

// Search customers by email (for certificate creation)
exports.searchCustomers = async (req, res) => {
  try {
    // Only allow owners to search customers
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'غير مصرح لك بالوصول إلى هذه البيانات' });
    }
    
    const { query } = req.query; // Search term (email)
    
    if (!query || query.trim().length < 2) {
      return res.json({ users: [] }); // Return empty if query too short
    }
    
    const searchTerm = query.trim().toLowerCase();
    
    // Search customers by email or username (filter by customer role)
    // Optimized: Use .lean() for read-only query and .select() to fetch only needed fields
    const users = await User.find({
      role: 'customer',
      $or: [
        { email: { $regex: searchTerm, $options: 'i' } },
        { username: { $regex: searchTerm, $options: 'i' } }
      ]
    })
    .select('_id username email role picture emailVerified createdAt')
    .limit(VALIDATION_LIMITS.QUERY_LIMITS.DEFAULT_LIMIT)
    .lean(); // Use lean() for read-only queries to reduce memory usage
    
    res.json({ users });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'SEARCH_CUSTOMERS_ERROR',
      userId: req.user?._id || 'unknown',
      details: { error: err.message }
    }));
    res.status(500).json({ message: 'حدث خطأ أثناء البحث عن العملاء' });
  }
};

// Get all users (for owner to select customers)
exports.getAllUsers = async (req, res) => {
  try {
    // Only allow owners to get all users
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'غير مصرح لك بالوصول إلى هذه البيانات' });
    }
    
    // Optimized: Use .lean() for read-only query and .select() to fetch only needed fields
    const users = await User.find({})
      .select('_id username email role picture emailVerified createdAt updatedAt')
      .lean(); // Use lean() for read-only queries to reduce memory usage
    res.json({ users });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'FETCH_USERS_ERROR',
      userId: req.user?._id || 'unknown',
      details: { error: err.message }
    }));
    res.status(500).json({ message: 'حدث خطأ أثناء جلب المستخدمين' });
  }
};

// Refresh token endpoint
exports.refreshToken = async (req, res) => {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;
    
    if (!oldRefreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }
    
    // Find refresh token in database
    // Optimized: Use .select() to fetch only needed user fields
    // Note: Cannot use .lean() with .populate() - populate needs Mongoose document
    const tokenDoc = await RefreshToken.findOne({ token: oldRefreshToken })
      .populate('userId', '_id username email role');
    
    if (!tokenDoc) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    
    // Check if token is expired
    if (tokenDoc.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ token: oldRefreshToken });
      return res.status(401).json({ message: 'Refresh token expired' });
    }
    
    const user = tokenDoc.userId;
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Token rotation: Delete old refresh token
    await RefreshToken.deleteOne({ token: oldRefreshToken });
    
    // Generate new tokens
    const newAccessToken = generateAccessToken(user._id, user.role, user.username, user.email);
    const newRefreshToken = generateRefreshToken();
    
    // Store new refresh token in database
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);
    await RefreshToken.create({
      userId: user._id,
      token: newRefreshToken,
      expiresAt
    });
    
    // Set new refresh token as HttpOnly cookie
    setRefreshTokenCookie(res, newRefreshToken);
    
    // Return new access token
    res.json({
      accessToken: newAccessToken,
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      }
    });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'AUTH',
      event: 'TOKEN_REFRESH_ERROR',
      details: { error: err.message }
    }));
    res.status(500).json({ message: 'Server error during token refresh' });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    // req.user is set by authenticate middleware
    // Optimized: Use .lean() for read-only query and explicit field selection
    const user = await User.findById(req.user._id)
      .select('_id username email role picture authMethod emailVerified createdAt updatedAt')
      .lean(); // Use lean() for read-only queries to reduce memory usage
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      picture: user.picture || null,
      authMethod: user.authMethod,
      emailVerified: user.emailVerified || false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'GET_PROFILE_ERROR',
      userId: req.user?._id || 'unknown',
      details: { error: err.message }
    }));
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify email with token
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ message: 'رمز التحقق مطلوب' });
    }
    
    // Find user with this verification token
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: Date.now() } // Token not expired
    });
    
    if (!user) {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        category: 'AUTH',
        event: 'EMAIL_VERIFICATION_INVALID_TOKEN',
        details: {
          tokenSnippet: token ? `${token.slice(0, 8)}...` : 'missing',
          reason: 'Token not found or expired'
        }
      }));
      
      // Check if user exists but token expired (for resend option)
      const userWithExpiredToken = await User.findOne({ verificationToken: token });
      const email = userWithExpiredToken ? userWithExpiredToken.email : null;
      
      return res.status(400).json({ 
        message: 'رمز التحقق غير صالح أو منتهي الصلاحية',
        expired: true,
        email: email,
        canResendVerification: !!email
      });
    }
    
    // Update user
    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();
    
    res.json({
      message: 'تم تأكيد البريد الإلكتروني بنجاح! يمكنك الآن تسجيل الدخول.',
      verified: true,
      email: user.email
    });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'AUTH',
      event: 'EMAIL_VERIFICATION_ERROR',
      details: { error: err.message }
    }));
    res.status(500).json({ message: 'حدث خطأ أثناء التحقق من البريد الإلكتروني' });
  }
};

// Resend verification email
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'البريد الإلكتروني مطلوب' });
    }
    
    // Validate email format
    const emailRegex = VALIDATION_LIMITS.PATTERNS.EMAIL;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'تنسيق البريد الإلكتروني غير صالح',
        error: 'INVALID_EMAIL_FORMAT'
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      // Don't reveal if email exists or not (security)
      return res.status(200).json({ 
        message: 'إذا كان البريد الإلكتروني موجوداً وغير مفعّل، سيتم إرسال رسالة التحقق.',
        emailSent: false
      });
    }
    
    // Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({ 
        message: 'البريد الإلكتروني مفعّل بالفعل',
        emailVerified: true
      });
    }
    
    // Check if user signed up with email (not Google OAuth)
    if (user.authMethod !== 'email') {
      return res.status(400).json({ 
        message: 'هذا الحساب مسجل عبر Google ولا يحتاج إلى تفعيل',
        authMethod: user.authMethod
      });
    }
    
    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = new Date(Date.now() + VALIDATION_LIMITS.TOKEN_EXPIRY.VERIFICATION_TOKEN_MS);
    
    // Update user with new token
    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = verificationTokenExpiry;
    await user.save();
    
    // Send verification email
    let emailSent = false;
    let emailError = null;
    try {
      const emailResult = await sendVerificationEmail(user, verificationToken);
      emailSent = emailResult.success;
    } catch (error) {
      emailError = error;
      emailSent = false;
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        category: 'OPERATION',
        event: 'EMAIL_SEND_FAILED',
        details: { 
          operation: 'resend_verification_email', 
          email: user.email,
          error: error.message,
          errorCode: error.code,
          errorResponse: error.response?.body
        }
      }));
    }
    
    if (emailSent) {
      res.json({
        message: 'تم إرسال رسالة التحقق بنجاح. يرجى التحقق من بريدك الإلكتروني.',
        emailSent: true,
        email: user.email
      });
    } else {
      res.status(500).json({
        message: 'فشل إرسال رسالة التحقق. يرجى المحاولة لاحقاً.',
        emailSent: false,
        emailError: emailError ? emailError.message : 'Unknown error'
      });
    }
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'AUTH',
      event: 'RESEND_VERIFICATION_ERROR',
      details: { error: err.message }
    }));
    res.status(500).json({ message: 'حدث خطأ أثناء إعادة إرسال رسالة التحقق' });
  }
};

// Delete user account
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    // Don't allow owners to delete their account (optional protection)
    if (user.role === 'owner') {
      return res.status(403).json({ message: 'لا يمكن حذف حساب المالك' });
    }

    // Delete all related data
    const Comment = require('../models/Comment');
    const WishList = require('../models/WishList');
    const Reservation = require('../models/Reservation');
    const FavoriteAlert = require('../models/FavoriteAlert');
    const RefreshToken = require('../models/RefreshToken');

    // Delete user's comments
    await Comment.deleteMany({ userId: userId });
    
    // Delete user's wishlists
    await WishList.deleteMany({ userId: userId });
    
    // Delete user's reservations
    await Reservation.deleteMany({ userId: userId });
    
    // Delete user's favorite alerts
    await FavoriteAlert.deleteMany({ userId: userId });
    
    // Delete user's refresh tokens
    await RefreshToken.deleteMany({ userId: userId });

    // Delete the user
    await User.findByIdAndDelete(userId);

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    res.json({
      message: 'تم حذف الحساب بنجاح',
      success: true
    });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'DELETE_ACCOUNT_ERROR',
      userId: req.user?._id || 'unknown',
      details: { error: err.message }
    }));
    res.status(500).json({ message: 'حدث خطأ أثناء حذف الحساب' });
  }
};

// Request password reset (forgot password) - CUSTOMERS ONLY
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'البريد الإلكتروني مطلوب' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    // Always return success message (prevent email enumeration)
    // But only send email if user exists, is a customer, and is NOT a Google user
    if (user && user.role === 'customer') {
      // Check if user is a Google OAuth user
      if (user.authMethod === 'google' || user.googleId) {
        // Google user - don't send reset email, but still return success (security)
        // Log the attempt for security monitoring
        securityLogger.logAuthEvent('PASSWORD_RESET_BLOCKED_GOOGLE_USER', req, false, { 
          userId: user._id, 
          email: user.email,
          reason: 'Google OAuth user - password reset not available'
        });
        // Still return success to prevent email enumeration
      } else {
        // Email/password user - proceed with password reset
        // Generate reset token
        const resetToken = generateVerificationToken();
        const resetTokenExpiry = new Date(Date.now() + VALIDATION_LIMITS.TOKEN_EXPIRY.PASSWORD_RESET_TOKEN_MS);
        
        // Save reset token to user
        user.passwordResetToken = resetToken;
        user.passwordResetTokenExpiry = resetTokenExpiry;
        user.passwordResetTokenUsed = false; // Reset the used flag
        await user.save();
        
        // Send password reset email
        try {
          await sendPasswordResetEmail(user, resetToken);
          securityLogger.logAuthEvent('PASSWORD_RESET_REQUESTED', req, true, { 
            userId: user._id, 
            email: user.email 
          });
        } catch (emailError) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            category: 'OPERATION',
            event: 'EMAIL_SEND_FAILED',
            details: { operation: 'password_reset_email', error: emailError.message }
          }));
          // Don't fail the request if email fails - user can request again
        }
      }
    }
    
    // Always return success (security best practice - prevent email enumeration)
    res.json({
      message: 'إذا كان البريد الإلكتروني موجوداً في نظامنا، سيتم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.',
      success: true
    });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'AUTH',
      event: 'FORGOT_PASSWORD_ERROR',
      details: { error: err.message }
    }));
    res.status(500).json({ message: 'حدث خطأ أثناء معالجة الطلب' });
  }
};

// Reset password with token
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'رمز إعادة التعيين مطلوب' });
    }
    
    if (!password) {
      return res.status(400).json({ message: 'كلمة المرور الجديدة مطلوبة' });
    }
    
    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetTokenExpiry: { $gt: Date.now() }, // Token not expired
      passwordResetTokenUsed: false // Token not used
    });
    
    if (!user) {
      return res.status(400).json({ 
        message: 'رمز إعادة التعيين غير صالح أو منتهي الصلاحية أو تم استخدامه بالفعل',
        expired: true
      });
    }
    
    // Block password reset for Google OAuth users (security)
    if (user.authMethod === 'google' || user.googleId) {
      securityLogger.logAuthEvent('PASSWORD_RESET_BLOCKED_GOOGLE_USER', req, false, { 
        userId: user._id, 
        email: user.email,
        reason: 'Google OAuth user - password reset not allowed'
      });
      return res.status(400).json({ 
        message: 'لا يمكن إعادة تعيين كلمة المرور لحساب Google. يرجى استخدام زر "تسجيل الدخول عبر Google".',
        isGoogleUser: true,
        code: 'GOOGLE_USER_PASSWORD_RESET_NOT_ALLOWED'
      });
    }
    
    // Validate password (use same validation as registration)
    if (password.length < VALIDATION_LIMITS.NUMERIC_LIMITS.PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ 
        message: `كلمة المرور يجب أن تكون ${VALIDATION_LIMITS.NUMERIC_LIMITS.PASSWORD_MIN_LENGTH} أحرف على الأقل`,
        error: 'PASSWORD_TOO_SHORT'
      });
    }
    
    if (password.length > VALIDATION_LIMITS.NUMERIC_LIMITS.PASSWORD_MAX_LENGTH) {
      return res.status(400).json({ 
        message: `كلمة المرور يجب أن تكون أقل من ${VALIDATION_LIMITS.NUMERIC_LIMITS.PASSWORD_MAX_LENGTH} حرفاً`,
        error: 'PASSWORD_TOO_LONG'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, VALIDATION_LIMITS.SECURITY.BCRYPT_ROUNDS);
    
    // Update password and invalidate reset token
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiry = undefined;
    user.passwordResetTokenUsed = true; // Mark token as used (single-use)
    await user.save();
    
    // Delete all refresh tokens for this user (invalidate all sessions)
    await RefreshToken.deleteMany({ userId: user._id });
    
    securityLogger.logAuthEvent('PASSWORD_RESET_SUCCESS', req, true, { 
      userId: user._id, 
      email: user.email 
    });
    
    res.json({
      message: 'تم إعادة تعيين كلمة المرور بنجاح. يرجى تسجيل الدخول بكلمة المرور الجديدة.',
      success: true
    });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'AUTH',
      event: 'RESET_PASSWORD_ERROR',
      details: { error: err.message }
    }));
    res.status(500).json({ message: 'حدث خطأ أثناء إعادة تعيين كلمة المرور' });
  }
};

// Change password (when logged in) - CUSTOMERS ONLY
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'كلمة المرور الحالية وكلمة المرور الجديدة مطلوبتان' });
    }
    
    // Only allow customers to change password (not owners)
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'لا يمكن تغيير كلمة مرور المالك من هنا' });
    }
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    // Verify current password
    if (!user.password) {
      return res.status(400).json({ message: 'لا توجد كلمة مرور لهذا الحساب (ربما تم التسجيل عبر Google)' });
    }
    
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      securityLogger.logAuthEvent('PASSWORD_CHANGE_FAILED', req, false, { 
        userId: user._id, 
        reason: 'Invalid current password' 
      });
      return res.status(401).json({ message: 'كلمة المرور الحالية غير صحيحة' });
    }
    
    // Validate new password
    if (newPassword.length < VALIDATION_LIMITS.NUMERIC_LIMITS.PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ 
        message: `كلمة المرور الجديدة يجب أن تكون ${VALIDATION_LIMITS.NUMERIC_LIMITS.PASSWORD_MIN_LENGTH} أحرف على الأقل`,
        error: 'PASSWORD_TOO_SHORT'
      });
    }
    
    if (newPassword.length > VALIDATION_LIMITS.NUMERIC_LIMITS.PASSWORD_MAX_LENGTH) {
      return res.status(400).json({ 
        message: `كلمة المرور الجديدة يجب أن تكون أقل من ${VALIDATION_LIMITS.NUMERIC_LIMITS.PASSWORD_MAX_LENGTH} حرفاً`,
        error: 'PASSWORD_TOO_LONG'
      });
    }
    
    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, VALIDATION_LIMITS.SECURITY.BCRYPT_ROUNDS);
    
    // Update password
    user.password = hashedPassword;
    await user.save();
    
    // Delete all refresh tokens for this user (invalidate all sessions - security best practice)
    await RefreshToken.deleteMany({ userId: user._id });
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    securityLogger.logAuthEvent('PASSWORD_CHANGE_SUCCESS', req, true, { 
      userId: user._id, 
      email: user.email 
    });
    
    res.json({
      message: 'تم تغيير كلمة المرور بنجاح. يرجى تسجيل الدخول مرة أخرى.',
      success: true,
      requiresReLogin: true
    });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'AUTH',
      event: 'CHANGE_PASSWORD_ERROR',
      userId: req.user?._id || 'unknown',
      details: { error: err.message }
    }));
    res.status(500).json({ message: 'حدث خطأ أثناء تغيير كلمة المرور' });
  }
};

// Get locked users list (owner only)
exports.getLockedUsers = async (req, res) => {
  try {
    const now = new Date();
    
    // Find all locked users where lockout hasn't expired
    const lockedUsers = await User.find({
      accountLocked: true,
      lockedUntil: { $gt: now }
    })
      .select('username email lockedUntil failedAttempts lastFailedAttempt createdAt')
      .sort({ lockedUntil: 1 }) // Earliest unlock first
      .lean(); // Use lean() for better performance

    // Format the response
    const formattedUsers = lockedUsers.map(user => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      lockedUntil: user.lockedUntil,
      failedAttempts: user.failedAttempts || 0,
      lastFailedAttempt: user.lastFailedAttempt,
      unlockTime: new Date(user.lockedUntil).toLocaleString('ar-SA', {
        timeZone: 'Asia/Riyadh',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

    res.json({
      success: true,
      lockedUsers: formattedUsers,
      count: formattedUsers.length
    });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'AUTH',
      event: 'GET_LOCKED_USERS_ERROR',
      userId: req.user?._id || 'unknown',
      details: { error: err.message }
    }));
    res.status(500).json({ message: 'حدث خطأ أثناء جلب قائمة المستخدمين المقفلين' });
  }
};

// Unlock user account (owner only)
exports.unlockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user._id;
    const adminUsername = req.user.username;

    // Validate userId
    if (!userId || !require('mongoose').Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'معرف المستخدم غير صالح' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    // Check if user is actually locked
    if (!user.accountLocked) {
      return res.status(400).json({ message: 'حساب المستخدم غير مقفل' });
    }

    // Unlock account
    user.accountLocked = false;
    user.failedAttempts = 0;
    user.lockedUntil = null;
    user.lastFailedAttempt = null;
    await user.save();

    // Log unlock event
    securityLogger.logSecurityEvent('ACCOUNT_UNLOCKED', req, {
      targetUserId: user._id,
      targetUsername: user.username,
      targetEmail: user.email,
      unlockedBy: adminId,
      unlockedByUsername: adminUsername,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `تم فك قفل حساب المستخدم ${user.username} بنجاح`,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'AUTH',
      event: 'UNLOCK_USER_ERROR',
      userId: req.user?._id || 'unknown',
      targetUserId: req.params.userId,
      details: { error: err.message }
    }));
    res.status(500).json({ message: 'حدث خطأ أثناء فك قفل المستخدم' });
  }
}; 