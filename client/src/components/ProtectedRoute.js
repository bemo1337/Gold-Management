import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getAccessToken, initializeAuth, getUserRole } from '../utils/auth';
import { ADMIN_PATH, getOwnerPath } from '../config/adminConfig';

const ProtectedRoute = ({ children, requiredRole }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Check if we have access token in memory
      let token = getAccessToken();
      
      // If no token in memory, try to refresh from HttpOnly cookie
      if (!token) {
        const refreshed = await initializeAuth();
        if (refreshed) {
          token = getAccessToken();
        }
      }

      // Get user role from JWT token (secure - not from localStorage)
      const role = getUserRole();
      setUserRole(role);

      setIsAuthenticated(!!token);
      setIsChecking(false);
    };

    checkAuth();
  }, []);

  // Show loading while checking authentication
  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f8f9fa'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(212, 175, 55, 0.2)',
          borderTop: '4px solid #D4AF37',
          borderRadius: '50%',
          animation: 'spin 2.5s linear infinite'
        }}></div>
      </div>
    );
  }

  // Not authenticated - redirect based on required role
  if (!isAuthenticated) {
    // If owner route, redirect to admin path, else /login
    const redirectPath = requiredRole === 'owner' ? ADMIN_PATH : '/login';
    return <Navigate to={redirectPath} replace />;
  }

  // 🔒 SECURITY: Check if user's role matches the required role
  if (requiredRole && userRole !== requiredRole) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`🚨 UNAUTHORIZED ACCESS ATTEMPT: User role "${userRole}" tried to access "${requiredRole}" route`);
    }
    
    // Redirect based on user's actual role
    if (userRole === 'owner') {
      return <Navigate to={getOwnerPath('dashboard')} replace />;
    } else if (userRole === 'customer') {
      return <Navigate to="/customer/dashboard" replace />;
    } else {
      // Unknown role, redirect to login
      return <Navigate to="/login" replace />;
    }
  }
  
  return children;
};

export default ProtectedRoute; 
