// Authentication utility for secure token management
// Tokens are stored in memory, not localStorage (XSS protection)

import { buildApiUrl } from '../config/api';
import { ADMIN_PATH } from '../config/adminConfig';

let accessToken = null;
let tokenRefreshTimeout = null;
let isRefreshing = false; // Prevent concurrent refresh requests
let refreshPromise = null; // Store ongoing refresh promise

// Session timeout management
// eslint-disable-next-line no-unused-vars
let lastActivity = Date.now();
let sessionTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds
let sessionTimeoutId = null;
let warningTimeoutId = null;

// Decode JWT token to get payload (no secret needed for decoding, only for verification)
const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error decoding JWT:', error);
    }
    return null;
  }
};

// Get current access token
export const getAccessToken = () => {
  return accessToken;
};

// Get user role from JWT token
export const getUserRole = () => {
  if (!accessToken) return null;
  const decoded = decodeJWT(accessToken);
  return decoded?.role || null;
};

// Get user email from JWT token
export const getUserEmail = () => {
  if (!accessToken) return null;
  const decoded = decodeJWT(accessToken);
  return decoded?.email || null;
};

// Get user username from JWT token
export const getUsername = () => {
  if (!accessToken) return null;
  const decoded = decodeJWT(accessToken);
  return decoded?.username || null;
};

// Get user id from JWT token
export const getUserId = () => {
  if (!accessToken) return null;
  const decoded = decodeJWT(accessToken);
  return decoded?.id || decoded?._id || decoded?.sub || null;
};

// Update last activity timestamp
export const updateActivity = () => {
  lastActivity = Date.now();
  resetSessionTimeout();
};

// Reset session timeout
const resetSessionTimeout = () => {
  // Clear existing timeouts
  if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
  if (warningTimeoutId) clearTimeout(warningTimeoutId);
  
  // Warning timeout removed - session will expire without warning
  
  // Set logout timeout
  sessionTimeoutId = setTimeout(() => {
    handleSessionTimeout();
  }, sessionTimeout);
};

// Show session warning (unused - commented out)
// eslint-disable-next-line no-unused-vars
const showSessionWarning = () => {
  if (accessToken) {
    const warningMessage = 'Your session will expire in 5 minutes due to inactivity. Click anywhere to extend your session.';
    alert(warningMessage);
    
    // Add click listener to extend session
    const extendSession = () => {
      updateActivity();
      document.removeEventListener('click', extendSession);
      document.removeEventListener('keypress', extendSession);
    };
    
    document.addEventListener('click', extendSession);
    document.addEventListener('keypress', extendSession);
  }
};

// Handle session timeout
const handleSessionTimeout = () => {
  // console.log('🔒 Session timeout - logging out user');
  clearAccessToken();
  localStorage.removeItem('user');
  window.location.replace('/login');
};

// Set access token and schedule refresh
export const setAccessToken = (token) => {
  accessToken = token;
  
  // Clear existing refresh timeout
  if (tokenRefreshTimeout) {
    clearTimeout(tokenRefreshTimeout);
  }
  
  if (token) {
    // Start session timeout tracking
    updateActivity();
    
    // Refresh token 1 minute before expiry (14 minutes for 15-minute tokens)
    const refreshTime = 14 * 60 * 1000; // 14 minutes
    tokenRefreshTimeout = setTimeout(() => {
      refreshAccessToken();
    }, refreshTime);
  }
};

// Clear access token
export const clearAccessToken = () => {
  accessToken = null;
  if (tokenRefreshTimeout) {
    clearTimeout(tokenRefreshTimeout);
    tokenRefreshTimeout = null;
  }
  
  // Clear session timeouts
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId);
    sessionTimeoutId = null;
  }
  if (warningTimeoutId) {
    clearTimeout(warningTimeoutId);
    warningTimeoutId = null;
  }
};

// Refresh access token using refresh token (HttpOnly cookie)
export const refreshAccessToken = async () => {
  // If already refreshing, return the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  
  // Set flag to prevent concurrent requests
  isRefreshing = true;
  
  // Create refresh promise
  refreshPromise = (async () => {
    try {
      const response = await fetch(buildApiUrl('/api/users/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Set new access token
        setAccessToken(data.accessToken);
        
        // Update user info in localStorage (username only for display)
        if (data.user) {
          localStorage.setItem('user', JSON.stringify({
            username: data.user.username
          }));
        }
        
        return data.accessToken;
      } else {
        // Refresh failed, clear everything and redirect to login
        clearAccessToken();
        localStorage.removeItem('user');
        window.location.replace('/login');
        return null;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error refreshing token:', error);
      }
      clearAccessToken();
      localStorage.removeItem('user');
      window.location.replace('/login');
      return null;
    } finally {
      // Reset flags after refresh completes
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
};

// Login function
export const login = async (credentials) => {
  try {
    // Build API URL (environment-aware)
    const response = await fetch(buildApiUrl('/api/users/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Important: include cookies
      body: JSON.stringify(credentials)
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Store access token in memory
      setAccessToken(data.accessToken);
      
      // Store username only (role and email are in JWT token)
      localStorage.setItem('user', JSON.stringify({
        username: data.user.username
      }));
      
      return { success: true, user: data.user };
    } else {
      const error = await response.json();
      return { 
        success: false, 
        message: error.message,
        emailVerified: error.emailVerified,
        email: error.email,
        canResendVerification: error.canResendVerification
      };
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Login error:', error);
    }
    return { success: false, message: 'حدث خطأ أثناء تسجيل الدخول' };
  }
};

// Resend verification email
export const resendVerificationEmail = async (email) => {
  try {
    const response = await publicFetch('/api/users/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    return {
      success: response.ok,
      message: data.message,
      emailSent: data.emailSent
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Resend verification error:', error);
    }
    return { 
      success: false, 
      message: 'حدث خطأ أثناء إعادة إرسال رسالة التحقق' 
    };
  }
};

// Logout function
export const logout = async () => {
  // Determine redirect based on current path (not localStorage role)
  const currentPath = window.location.pathname;
  const isOwnerRoute = currentPath.startsWith('/owner') || currentPath === ADMIN_PATH;
  const redirectPath = isOwnerRoute ? ADMIN_PATH : '/login';
  
  try {
    // Call backend to delete refresh token
    await fetch(buildApiUrl('/api/users/logout'), {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Logout error:', error);
    }
  }
  
  // Clear everything locally
  clearAccessToken();
  localStorage.removeItem('user');
  
  // Redirect based on current route
  window.location.replace(redirectPath);
};

// Public fetch - no authentication required
// Use this for public endpoints like certificate verification
export const publicFetch = async (url, options = {}) => {
  // Build API URL (environment-aware)
  const absoluteUrl = buildApiUrl(url);
  
  // Make request without authorization
  const response = await fetch(absoluteUrl, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  return response;
};

// Fetch with automatic token refresh
export const authenticatedFetch = async (url, options = {}) => {
  // Update activity on each API call
  updateActivity();
  
  // Get current access token
  let token = getAccessToken();
  
  // If no token in memory, try to refresh
  if (!token) {
    token = await refreshAccessToken();
    
    if (!token) {
      throw new Error('Authentication required');
    }
  }
  
  // Build API URL (environment-aware)
  const absoluteUrl = buildApiUrl(url);
  
  // Add authorization header
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };
  
  // Make request
  let response = await fetch(absoluteUrl, {
    ...options,
    credentials: 'include',
    headers
  });
  
  // If 401, try to refresh token once
  if (response.status === 401) {
    // console.log('Received 401, refreshing token...');
    token = await refreshAccessToken();
    
    if (token) {
      // Retry request with new token
      headers['Authorization'] = `Bearer ${token}`;
      response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers
      });
    }
  }
  
  return response;
};

// Optional auth fetch - tries to send token if available, but doesn't fail if not
// Use this for endpoints with optionalAuth middleware
export const optionalAuthFetch = async (url, options = {}) => {
  // Build API URL (environment-aware)
  const absoluteUrl = buildApiUrl(url);
  
  // Try to get token, but don't fail if not available
  let token = null;
  try {
    token = getAccessToken();
    if (!token) {
      // Try to refresh silently
      token = await refreshAccessToken().catch(() => null);
    }
  } catch (error) {
    // No token available, continue without it
    token = null;
  }
  
  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Add authorization header if token is available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Make request with cache: 'no-store' to prevent browser caching
  // React Query will handle client-side caching
  const response = await fetch(absoluteUrl, {
    ...options,
    credentials: 'include',
    cache: 'no-store', // Prevent browser from caching - React Query handles caching
    headers
  });
  
  return response;
};

// Initialize auth on app load
export const initializeAuth = async () => {
  // Check if user exists in localStorage
  const user = localStorage.getItem('user');
  
  if (user) {
    // Try to refresh token
    const token = await refreshAccessToken();
    
    if (!token) {
      // Refresh failed, clear localStorage
      localStorage.removeItem('user');
      return false;
    }
    
    return true;
  }
  
  return false;
};

