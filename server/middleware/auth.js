const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Validate JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}

// Authentication middleware: verifies JWT token
exports.authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      message: 'No token provided',
      code: 'NO_TOKEN'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    next();
  } catch (err) {
    // Provide specific error messages for different JWT errors
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    return res.status(401).json({ 
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

// Optional authentication: sets req.user if token present, continues if not
exports.optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without authentication
    return next();
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
  } catch (err) {
    // Invalid token, but continue anyway (as unauthenticated)
    // Silently fail for optional auth
  }
  
  next();
};

// Email verification middleware: checks if user's email is verified
exports.requireEmailVerification = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Fetch fresh user data to check verification status
    const user = await User.findById(req.user._id).select('emailVerified');
    
    if (!user) {
      return res.status(401).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ 
        message: 'يجب تأكيد البريد الإلكتروني للوصول إلى هذا المورد',
        emailVerified: false,
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    next();
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'AUTH',
      event: 'EMAIL_VERIFICATION_CHECK_ERROR',
      details: { error: error.message }
    }));
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Authorization middleware: checks user role
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user object exists
    if (!req.user) {
      return res.status(401).json({ 
        message: 'No user found in request',
        code: 'NO_USER'
      });
    }
    
    // Check if user role exists
    if (!req.user.role) {
      return res.status(403).json({ 
        message: 'No role found in user object',
        code: 'NO_ROLE'
      });
    }
    
    // Flatten roles array if needed
    const requiredRoles = roles.flat();
    
    // Check role match
    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Forbidden: insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    next();
  };
}; 