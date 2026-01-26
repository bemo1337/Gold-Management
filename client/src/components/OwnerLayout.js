import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../pages/Owner/Navbar';
import { ADMIN_PATH, getOwnerPath } from '../config/adminConfig';
import { logout } from '../utils/auth';

// Admin session timeout configuration
const ADMIN_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes of inactivity
const ADMIN_SESSION_WARNING_TIME = 5 * 60 * 1000; // Show warning 5 minutes before timeout

// Admin session timeout hook with warning
function useAdminSessionTimeout() {
  const [showWarning, setShowWarning] = useState(false);
  const timeoutTimer = useRef();
  const warningTimer = useRef();

  useEffect(() => {
    const resetTimers = () => {
      // Clear existing timers
      clearTimeout(timeoutTimer.current);
      clearTimeout(warningTimer.current);
      setShowWarning(false);

      // Set warning timer (show warning 5 minutes before timeout)
      warningTimer.current = setTimeout(() => {
        setShowWarning(true);
      }, ADMIN_IDLE_TIMEOUT - ADMIN_SESSION_WARNING_TIME);

      // Set logout timer
      timeoutTimer.current = setTimeout(async () => {
        await logout();
        window.location.href = ADMIN_PATH;
      }, ADMIN_IDLE_TIMEOUT);
    };

    // Listen for user activity
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'];
    events.forEach(event => {
      window.addEventListener(event, resetTimers, { passive: true });
    });

    // Initialize timers
    resetTimers();

    // Cleanup
    return () => {
      clearTimeout(timeoutTimer.current);
      clearTimeout(warningTimer.current);
      events.forEach(event => {
        window.removeEventListener(event, resetTimers);
      });
    };
  }, []);

  return { showWarning, setShowWarning };
}

const OwnerLayout = () => {
  const { showWarning, setShowWarning } = useAdminSessionTimeout();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Check if we're on the dashboard route
  const isDashboard = location.pathname === getOwnerPath('dashboard');
  
  // Get search term from URL query params (only for dashboard)
  const searchTerm = isDashboard ? searchParams.get('search') || '' : '';
  
  // Handle search change - update URL query params
  const handleSearchChange = (value) => {
    if (isDashboard) {
      const newParams = new URLSearchParams(searchParams);
      if (value.trim()) {
        newParams.set('search', value);
      } else {
        newParams.delete('search');
      }
      setSearchParams(newParams, { replace: true });
    }
  };

  // Navigation handlers - use React Router navigate
  const handleAddProduct = () => {
    navigate(getOwnerPath('products/add'));
  };

  const handleShowReservations = () => {
    navigate(getOwnerPath('reservations'));
  };

  const handleShowMarketInsights = () => {
    navigate(getOwnerPath('analytics'));
  };

  const handleShowMaterialPrices = () => {
    navigate(getOwnerPath('prices'));
  };

  const handleShowStatistics = () => {
    navigate(getOwnerPath('statistics'));
  };

  const handleShowCertificates = () => {
    navigate(getOwnerPath('certificates'));
  };

  const handleShowWishList = () => {
    navigate(getOwnerPath('wishlist'));
  };

  const handleStayLoggedIn = () => {
    setShowWarning(false);
    // Reset timers by triggering a user activity event
    window.dispatchEvent(new Event('mousemove'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
      {/* Session Timeout Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="mr-3 text-lg font-semibold text-gray-900">تحذير انتهاء الجلسة</h3>
            </div>
            <p className="text-gray-700 mb-6">
              لم يتم اكتشاف أي نشاط منك خلال آخر 25 دقيقة. سيتم تسجيل خروجك تلقائياً خلال 5 دقائق لأسباب أمنية.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleStayLoggedIn}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                البقاء متصل
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar
        onAddProduct={handleAddProduct}
        onShowReservations={handleShowReservations}
        onShowMarketInsights={handleShowMarketInsights}
        onShowMaterialPrices={handleShowMaterialPrices}
        onShowStatistics={handleShowStatistics}
        onShowCertificates={handleShowCertificates}
        onShowWishList={handleShowWishList}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        currentPath={location.pathname}
      />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default OwnerLayout;

