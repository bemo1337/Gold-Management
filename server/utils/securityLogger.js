// Lightweight security logger for hosting platforms
// Uses console logging only - no file I/O that could cause issues

class SecurityLogger {
  // Get client IP address
  getClientIP(req) {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.headers['x-forwarded-for']?.split(',')[0] ||
           'unknown';
  }

  // Get user agent
  getUserAgent(req) {
    return req.headers['user-agent'] || 'unknown';
  }

  // Get current timestamp
  getTimestamp() {
    return new Date().toISOString();
  }

  // Log security events (console only) - CRITICAL EVENTS ONLY
  logSecurityEvent(event, req, details = {}) {
    const logEntry = {
      timestamp: this.getTimestamp(),
      level: 'SECURITY',
      category: 'SECURITY',
      event,
      ip: this.getClientIP(req),
      userAgent: this.getUserAgent(req),
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.id || 'anonymous',
      details
    };

    // Log critical security events only (structured JSON for Railway)
    console.error(JSON.stringify(logEntry));
  }

  // Log audit events (console only)
  logAuditEvent(action, req, details = {}) {
    const logEntry = {
      timestamp: this.getTimestamp(),
      action,
      ip: this.getClientIP(req),
      userAgent: this.getUserAgent(req),
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.id || 'anonymous',
      userRole: req.user?.role || 'unknown',
      details
    };

    // Audit logging disabled for production performance
  }

  // Log authentication events
  logAuthEvent(event, req, success, details = {}) {
    this.logSecurityEvent(`AUTH_${event}`, req, {
      success,
      ...details
    });
  }

  // Log product operations
  logProductOperation(operation, req, productId, details = {}) {
    // Product operation logging disabled for production performance
  }

  // Log suspicious activity - CRITICAL SECURITY EVENTS
  logSuspiciousActivity(activity, req, details = {}) {
    const logEntry = {
      timestamp: this.getTimestamp(),
      level: 'WARN',
      category: 'SECURITY',
      event: `SUSPICIOUS_${activity}`,
      ip: this.getClientIP(req),
      userAgent: this.getUserAgent(req),
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.id || 'anonymous',
      details
    };

    // Log suspicious activity (NoSQL injection, XSS attempts, etc.)
    console.error(JSON.stringify(logEntry));
  }

  // Log rate limit violations - CRITICAL SECURITY EVENTS
  logRateLimitViolation(req, limit, window) {
    const logEntry = {
      timestamp: this.getTimestamp(),
      level: 'WARN',
      category: 'SECURITY',
      event: 'RATE_LIMIT_VIOLATION',
      ip: this.getClientIP(req),
      userAgent: this.getUserAgent(req),
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.id || 'anonymous',
      details: {
        limit,
        windowMs: window
      }
    };

    // Log rate limit violations
    console.error(JSON.stringify(logEntry));
  }

  // Log input validation failures - SECURITY-CRITICAL FIELDS ONLY
  logValidationFailure(req, field, value, reason) {
    // Only log validation failures for security-critical fields
    const securityCriticalFields = ['password', 'email', 'token', 'verificationToken', 'resetToken', 'accessToken'];
    
    if (securityCriticalFields.includes(field.toLowerCase())) {
      const logEntry = {
        timestamp: this.getTimestamp(),
        level: 'WARN',
        category: 'SECURITY',
        event: 'VALIDATION_FAILURE',
        ip: this.getClientIP(req),
        userAgent: this.getUserAgent(req),
        url: req.originalUrl,
        method: req.method,
        userId: req.user?.id || 'anonymous',
        details: {
          field,
          value: field.toLowerCase() === 'password' ? '[HIDDEN]' : (typeof value === 'string' ? value.substring(0, 100) : value),
          reason
        }
      };

      // Log validation failures for security-critical fields
      console.error(JSON.stringify(logEntry));
    }
  }

  // Log file upload events
  logFileUpload(req, filename, size, success, details = {}) {
    // File upload logging disabled for production performance
  }

  // Log database operations
  logDatabaseOperation(operation, req, collection, details = {}) {
    // Database operation logging disabled for production performance
  }

  // No file operations - hosting friendly
  getRecentSecurityEvents() {
    return [];
  }

  getRecentAuditEvents() {
    return [];
  }

  // No cleanup needed - no files to clean
  cleanOldLogs() {
    // No-op for hosting compatibility
  }
}

// Create singleton instance
const securityLogger = new SecurityLogger();

module.exports = securityLogger;
