import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Bookmark, 
  BarChart3, 
  Menu, 
  X,
  Package,
  LogOut,
  DollarSign,
  Plus,
  Award,
  Users,
  Shield,
  ChevronDown,
  Home,
  Activity,
  Lock
} from 'lucide-react';
import logoImage from '../../images/favicon_io2/android-chrome-192x192.png';
import { useReservationsUnseenCount, useWishlistUnseenCount, useMarkReservationsAsSeen, useMarkWishlistAsSeen } from '../../hooks/useOwner';
import { getOwnerPath } from '../../config/adminConfig';

// shadcn/ui components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';


const Navbar = ({ 
  onAddProduct, 
  onShowReservations, 
  onShowMarketInsights,
  onShowMaterialPrices,
  onShowStatistics,
  onShowCertificates,
  onShowWishList,
  searchTerm,
  onSearchChange,
  currentPath
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const activePath = currentPath || location.pathname;
  const [searchQuery, setSearchQuery] = useState(searchTerm || '');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // إغلاق القوائم عند تغيير حجم الشاشة
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
        setIsDropdownOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // إغلاق القوائم عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.mobile-menu-container') && !event.target.closest('.mobile-menu-btn')) {
        setIsMobileMenuOpen(false);
      }
      if (!event.target.closest('.dropdown-menu') && !event.target.closest('.menu-toggle-btn')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // React Query hooks with caching and auto-refetch
  const { data: reservationsCountData } = useReservationsUnseenCount({
    refetchInterval: 30000 // Auto-refetch every 30 seconds
  });
  const { data: wishlistCountData } = useWishlistUnseenCount({
    refetchInterval: 30000 // Auto-refetch every 30 seconds
  });

  // Extract counts from React Query responses
  const unseenReservationsCount = reservationsCountData?.count || 0;
  const unseenWishListCount = wishlistCountData?.count || 0;

  // Mutations for marking as seen
  const markReservationsAsSeenMutation = useMarkReservationsAsSeen();
  const markWishlistAsSeenMutation = useMarkWishlistAsSeen();

  // Mark reservations as seen when visiting reservations page
  useEffect(() => {
    if (activePath === getOwnerPath('reservations') && unseenReservationsCount > 0) {
      markReservationsAsSeenMutation.mutate();
    }
  }, [activePath, unseenReservationsCount, markReservationsAsSeenMutation]);

  // Mark wishlist as seen when visiting wishlist page
  useEffect(() => {
    if (activePath === getOwnerPath('wishlist') && unseenWishListCount > 0) {
      markWishlistAsSeenMutation.mutate();
    }
  }, [activePath, unseenWishListCount, markWishlistAsSeenMutation]);

  // Sync search query with external searchTerm prop
  useEffect(() => {
    if (searchTerm !== undefined && searchTerm !== searchQuery) {
      setSearchQuery(searchTerm);
    }
  }, [searchTerm, searchQuery]);

  // eslint-disable-next-line no-unused-vars
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // يمكن إضافة وظيفة البحث هنا
    }
  };

  // Real-time search handler
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  // Clear search handler
  const handleClearSearch = () => {
    setSearchQuery('');
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = async () => {
    const { logout } = await import('../../utils/auth');
    await logout();
  };

  // الأزرار الرئيسية في Navbar (تظهر في السطر الثاني)
  const mainNavLinks = [
    { onClick: onAddProduct, label: 'إضافة منتج', icon: Plus },
    { onClick: onShowMaterialPrices, label: 'إدارة الأسعار', icon: DollarSign },
    { onClick: onShowCertificates, label: 'الشهادات', icon: Award },
    { onClick: onShowReservations, label: 'الحجوزات', icon: Bookmark },
  ];

  // جميع الأزرار للقائمة الجانبية والمنسدلة
  const allNavLinks = [
    { onClick: onAddProduct, label: 'إضافة منتج جديد', icon: Plus, path: getOwnerPath('products/add') },
    { onClick: onShowMaterialPrices, label: 'إدارة أسعار المواد', icon: DollarSign, path: getOwnerPath('prices') },
    { onClick: onShowCertificates, label: 'الشهادات الرقمية', icon: Award, path: getOwnerPath('certificates') },
    { onClick: onShowReservations, label: 'الحجوزات', icon: Bookmark, path: getOwnerPath('reservations') },
    { onClick: onShowStatistics, label: 'إحصائيات المنتجات', icon: BarChart3, path: getOwnerPath('statistics') },
    { onClick: onShowWishList, label: 'طلبات الزبائن', icon: Users, path: getOwnerPath('wishlist') },
    { onClick: null, label: 'تحليل السوق', icon: Package, path: getOwnerPath('analytics'), comingSoon: true },
    { onClick: () => navigate(getOwnerPath('monitoring')), label: 'مراقبة النظام', icon: Activity, path: getOwnerPath('monitoring') },
    { onClick: () => navigate(getOwnerPath('users')), label: 'إدارة المستخدمين', icon: Lock, path: getOwnerPath('users') },
  ];

  const isActive = (path) => {
    return activePath === path || activePath.startsWith(path + '/');
  };

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50" dir="rtl">
        <div className="elegant-container">
          {/* Top Row: Logo + Brand + Menu */}
          <div className="flex items-center justify-between h-20 px-4">
            {/* Logo and Brand */}
            <Link to={getOwnerPath('dashboard')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="relative">
                <img 
                  src={logoImage} 
                  alt="مجوهرات نذار" 
                  className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                />
              </div>
              <div>
                <h1 className="font-elegant text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  مجوهرات نذار
                </h1>
                <p className="text-xs text-slate-500">لوحة التحكم</p>
              </div>
            </Link>

            {/* Desktop Menu Dropdown */}
            <div className="hidden lg:block relative dropdown-menu">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDropdown();
                }}
                className="flex items-center gap-2 menu-toggle-btn relative"
                type="button"
              >
                <Menu className="h-4 w-4" />
                <span>القائمة</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                {(unseenReservationsCount > 0 || unseenWishListCount > 0) && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {(unseenReservationsCount + unseenWishListCount) > 99 ? '99+' : (unseenReservationsCount + unseenWishListCount)}
                  </span>
                )}
              </Button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div 
                    className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50 py-2 dropdown-menu"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {allNavLinks.map((link, index) => {
                      const IconComponent = link.icon;
                      const active = isActive(link.path);
                      const isReservations = link.label === 'الحجوزات';
                      const isWishList = link.label === 'طلبات الزبائن';
                      const isComingSoon = link.comingSoon;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isComingSoon) {
                              return; // Don't navigate if coming soon
                            }
                            setIsDropdownOpen(false);
                            // Use setTimeout to ensure the dropdown closes before navigation
                            setTimeout(() => {
                              if (link.onClick) {
                                link.onClick();
                              }
                            }, 0);
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                          disabled={isComingSoon}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors relative ${
                            isComingSoon 
                              ? 'text-slate-400 cursor-not-allowed opacity-60' 
                              : active 
                                ? 'bg-primary/10 text-primary font-semibold hover:bg-slate-50 cursor-pointer' 
                                : 'text-slate-700 hover:bg-slate-50 cursor-pointer'
                          }`}
                        >
                          <IconComponent className={`h-4 w-4 ${active && !isComingSoon ? 'text-primary' : ''}`} />
                          <span>{link.label}</span>
                          {isComingSoon && (
                            <span className="mr-auto bg-slate-200 text-slate-600 text-xs font-semibold rounded px-2 py-0.5">
                              قريباً
                            </span>
                          )}
                          {isReservations && unseenReservationsCount > 0 && (
                            <span className="mr-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                              {unseenReservationsCount > 99 ? '99+' : unseenReservationsCount}
                            </span>
                          )}
                          {isWishList && unseenWishListCount > 0 && (
                            <span className="mr-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                              {unseenWishListCount > 99 ? '99+' : unseenWishListCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    <div className="border-t border-slate-200 my-2" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDropdownOpen(false);
                        setTimeout(() => {
                          handleLogout();
                        }, 0);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDropdownOpen(false);
                        setTimeout(() => {
                          handleLogout();
                        }, 0);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-red-50 active:bg-red-100 transition-colors text-red-600 cursor-pointer touch-manipulation"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={toggleMobileMenu}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>

          {/* Bottom Row: Search + Quick Actions */}
          <div className="border-t border-slate-100 px-4 py-3">
            <div className="flex flex-col lg:flex-row items-center gap-4">
              {/* Search Bar */}
              <div className="relative flex-1 w-full lg:max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="ابحث عن المنتجات..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pr-10 pl-4 h-10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Quick Action Buttons */}
              <div className="hidden lg:flex items-center gap-2">
                <Link to={getOwnerPath('dashboard')}>
                  <Button
                    variant={activePath === getOwnerPath('dashboard') ? "default" : "outline"}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Home className="h-4 w-4" />
                    <span>الرئيسية</span>
                  </Button>
                </Link>
                {mainNavLinks.map((link, index) => {
                  const IconComponent = link.icon;
                  const isReservations = link.label === 'الحجوزات';
                  const isWishList = link.label === 'طلبات الزبائن';
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={link.onClick}
                      className="flex items-center gap-2 relative"
                    >
                      <IconComponent className="h-4 w-4" />
                      <span>{link.label}</span>
                      {isReservations && unseenReservationsCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {unseenReservationsCount > 99 ? '99+' : unseenReservationsCount}
                        </span>
                      )}
                      {isWishList && unseenWishListCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {unseenWishListCount > 99 ? '99+' : unseenWishListCount}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Side Menu */}
      {isMobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div 
            className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 lg:hidden overflow-y-auto" 
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
          >
            {/* Mobile Menu Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <img src={logoImage} alt="Logo" className="h-10 w-10 rounded-full" />
                <div>
                  <h2 className="font-bold text-slate-900">لوحة التحكم</h2>
                  <p className="text-xs text-slate-500">مجوهرات نذار</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Mobile Menu Links */}
            <div className="p-4 space-y-2" style={{ pointerEvents: 'auto' }}>
              <Button
                type="button"
                variant={activePath === getOwnerPath('dashboard') ? "default" : "ghost"}
                className={`w-full justify-start gap-3 h-auto py-3 ${activePath === getOwnerPath('dashboard') ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMobileMenuOpen(false);
                  navigate(getOwnerPath('dashboard'));
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMobileMenuOpen(false);
                  navigate(getOwnerPath('dashboard'));
                }}
              >
                <Home className={`h-5 w-5 ${activePath === getOwnerPath('dashboard') ? '' : 'text-primary'}`} />
                <span className="text-right">الرئيسية</span>
              </Button>
              {allNavLinks.map((link, index) => {
                const IconComponent = link.icon;
                const active = isActive(link.path);
                const isReservations = link.label === 'الحجوزات';
                const isWishList = link.label === 'طلبات الزبائن';
                const isComingSoon = link.comingSoon;
                return (
                  <Button
                    key={index}
                    type="button"
                    variant={active ? "default" : "ghost"}
                    disabled={isComingSoon}
                    className={`w-full justify-start gap-3 h-auto py-3 relative ${
                      isComingSoon 
                        ? 'opacity-60 cursor-not-allowed' 
                        : active 
                          ? 'bg-primary text-primary-foreground' 
                          : ''
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isComingSoon) {
                        return; // Don't navigate if coming soon
                      }
                      setIsMobileMenuOpen(false);
                      // Navigate directly using path for mobile
                      if (link.path) {
                        navigate(link.path);
                      } else if (link.onClick) {
                        link.onClick();
                      }
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isComingSoon) {
                        return; // Don't navigate if coming soon
                      }
                      setIsMobileMenuOpen(false);
                      // Navigate directly using path for mobile
                      if (link.path) {
                        navigate(link.path);
                      } else if (link.onClick) {
                        link.onClick();
                      }
                    }}
                  >
                    <IconComponent className={`h-5 w-5 ${active && !isComingSoon ? '' : isComingSoon ? 'text-slate-400' : 'text-primary'}`} />
                    <span className="text-right">{link.label}</span>
                    {isComingSoon && (
                      <span className="mr-auto bg-slate-200 text-slate-600 text-xs font-semibold rounded px-2 py-0.5">
                        قريباً
                      </span>
                    )}
                    {isReservations && unseenReservationsCount > 0 && (
                      <span className="mr-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                        {unseenReservationsCount > 99 ? '99+' : unseenReservationsCount}
                      </span>
                    )}
                    {isWishList && unseenWishListCount > 0 && (
                      <span className="mr-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                        {unseenWishListCount > 99 ? '99+' : unseenWishListCount}
                      </span>
                    )}
                  </Button>
                );
              })}
              <div className="border-t border-slate-200 my-4" />
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-3 text-red-600 hover:text-red-700 hover:bg-red-50 active:bg-red-100 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
              >
                <LogOut className="h-5 w-5" />
                <span className="text-right">تسجيل الخروج</span>
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navbar; 
