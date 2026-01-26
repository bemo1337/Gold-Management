import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Filter, X, Package, Star, Gem, Crown } from 'lucide-react';
import { toast } from '../../utils/toast';
import { useProducts } from '../../hooks/useProducts';
import { useDeleteProduct, useTogglePin, useToggleSpecial } from '../../hooks/useProducts';
import ProductList from './ProductList';
import { getOwnerPath } from '../../config/adminConfig';

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';

function ProductsDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get search term from URL query params
  const searchTerm = searchParams.get('search') || '';
  
  // Set light theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
  }, []);

  // Add CSS for "all" options
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* قواعد لخيارات "جميع" في الوضع الفاتح */
      [data-theme="light"] .filter-select option[value="all"],
      [data-theme="light"] select.filter-select option[value="all"],
      [data-theme="light"] .search-filter-section .filter-select option[value="all"],
      [data-theme="light"] option[value="all"] {
        color: #000000 !important;
        font-weight: 700 !important;
        background: #FFFFFF !important;
        -webkit-text-fill-color: #000000 !important;
        -webkit-text-stroke: 0 !important;
      }
      
      /* قواعد إضافية قوية لخيارات "جميع" */
      [data-theme="light"] .filter-select option[value="all"]:hover,
      [data-theme="light"] select.filter-select option[value="all"]:hover,
      [data-theme="light"] .search-filter-section .filter-select option[value="all"]:hover,
      [data-theme="light"] option[value="all"]:hover {
        color: #000000 !important;
        font-weight: 700 !important;
        background: #FFFFFF !important;
        -webkit-text-fill-color: #000000 !important;
        -webkit-text-stroke: 0 !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [filterMaterial, setFilterMaterial] = useState('all');
  const [filterProductType, setFilterProductType] = useState('all');
  const [filterKarat, setFilterKarat] = useState('all');
  // Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // React Query hooks for products with caching
  const { data: productsData, isLoading: loading, refetch } = useProducts({ 
    page: currentPage, 
    limit: 10 
  });

  // Extract data from React Query response
  const products = useMemo(() => {
    if (!productsData?.products) return [];
    return productsData.products.map(p => ({
      ...p,
      id: p._id || p.id || p.ID
    }));
  }, [productsData]);

  const totalPages = productsData?.totalPages || 1;
  const totalProducts = productsData?.totalProducts || 0;
  const stats = productsData?.stats || {
    totalProducts: 0,
    pinnedCount: 0,
    goldCount: 0,
    silverCount: 0,
    diamondCount: 0
  };

  // Mutations
  const deleteProductMutation = useDeleteProduct();
  const togglePinMutation = useTogglePin();
  const toggleSpecialMutation = useToggleSpecial();

  // Memoized filtered and sorted products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    // Filter by search term (name, type, material, karat, product ID)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(product => {
        const name = product.name?.toLowerCase() || '';
        const type = product.productType?.toLowerCase() || '';
        const material = product.material?.toLowerCase() || '';
        const karat = product.karat?.toString() || '';
        const productId = (product._id || product.id || '').toString().toLowerCase();
        
        return name.includes(searchLower) || 
               type.includes(searchLower) || 
               material.includes(searchLower) || 
               karat.includes(searchLower) ||
               productId.includes(searchLower);
      });
    }

    // Filter by material
    if (filterMaterial !== 'all') {
      filtered = filtered.filter(product => {
        const productMaterial = product.material?.toLowerCase();
        const filterMaterialLower = filterMaterial.toLowerCase();
        return productMaterial === filterMaterialLower || 
               (filterMaterialLower === 'gold' && productMaterial === 'ذهب') ||
               (filterMaterialLower === 'silver' && productMaterial === 'فضة') ||
               (filterMaterialLower === 'diamond' && productMaterial === 'ألماس');
      });
    }

    // Filter by product type
    if (filterProductType !== 'all') {
      filtered = filtered.filter(product => {
        const productType = product.productType?.toLowerCase();
        const filterTypeLower = filterProductType.toLowerCase();
        return productType === filterTypeLower ||
               (filterTypeLower === 'ring' && productType === 'خاتم') ||
               (filterTypeLower === 'sized-ring' && productType === 'محبس') ||
               (filterTypeLower === 'name' && productType === 'اسم') ||
               (filterTypeLower === 'earring' && productType === 'حلق') ||
               (filterTypeLower === 'bracelet' && productType === 'اسوارة') ||
               (filterTypeLower === 'necklace' && productType === 'طوق') ||
               (filterTypeLower === 'set' && productType === 'طقم') ||
               (filterTypeLower === 'anklet' && productType === 'خلخال') ||
               (filterTypeLower === 'lira' && productType === 'ليرة') ||
               (filterTypeLower === 'half-lira' && productType === 'نصف ليرة') ||
               (filterTypeLower === 'quarter-lira' && productType === 'ربع ليرة') ||
               (filterTypeLower === 'ounce' && productType === 'أونصة');
      });
    }

    // Filter by karat
    if (filterKarat !== 'all') {
      filtered = filtered.filter(product => {
        const productKarat = product.karat?.toString();
        return productKarat === filterKarat;
      });
    }

    // Sort (pinned first, then by date)
    return filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [products, searchTerm, filterMaterial, filterProductType, filterKarat]);

  // Instead of calling deleteProduct directly, open modal
  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const handleDeleteProduct = async (id) => {
    try {
      await deleteProductMutation.mutateAsync(id);
      toast.success('تم حذف المنتج بنجاح');
      setShowDeleteModal(false);
      setProductToDelete(null);
      // React Query will automatically refetch and update cache
    } catch (err) {
      toast.error(err.message || 'حدث خطأ أثناء حذف المنتج');
    }
  };

  const handleTogglePin = async (id) => {
    try {
      await togglePinMutation.mutateAsync(id);
      toast.success('تم تحديث حالة التثبيت بنجاح');
    } catch (err) {
      toast.error(err.message || 'حدث خطأ أثناء تثبيت المنتج');
    }
  };

  const handleToggleSpecial = async (id) => {
    try {
      const data = await toggleSpecialMutation.mutateAsync(id);
      toast.success(data.special ? 'تم تعيين المنتج كمنتج خاص' : 'تم إلغاء خاصية المنتج الخاص');
    } catch (err) {
      toast.error(err.message || 'حدث خطأ أثناء تحديث حالة المنتج');
    }
  };

  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Scroll to top of page when changing pages
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // React Query will automatically fetch the new page
    }
  }, [totalPages]);

  const handleEditProduct = (product) => {
    const id = product._id || product.id || product.ID;
    if (id) {
      navigate(getOwnerPath(`products/edit/${id}`));
    }
  };

  // Helper function to get product ID
  const getProductId = (product) => {
    if (!product) return null;
    
    // If it's already a string ID, return it
    if (typeof product === 'string') {
      return product;
    }
    
    // If it's an object, extract the ID
    if (typeof product === 'object') {
      return product._id || product.id || product.ID;
    }
    
    return null;
  };

  return (
    <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
      <div className="space-y-6">
        {/* Filters Section */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Filter className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
                <span>التصفية المتقدمة</span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Clear search from URL
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('search');
                  setSearchParams(newParams, { replace: true });
                  
                  setFilterMaterial('all');
                  setFilterProductType('all');
                  setFilterKarat('all');
                }}
                className="flex items-center gap-2 text-xs md:text-sm w-full sm:w-auto"
              >
                <X className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                <span>مسح الكل</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
              {/* Material Filter */}
              <div className="space-y-1.5 md:space-y-2">
                <Label className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium">
                  <Crown className="h-3 w-3 md:h-4 md:w-4 text-primary flex-shrink-0" />
                  <span className="truncate">المادة</span>
                </Label>
                <Select value={filterMaterial} onValueChange={setFilterMaterial}>
                  <SelectTrigger className="w-full h-9 md:h-10 text-xs md:text-sm">
                    <SelectValue placeholder="اختر المادة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المواد</SelectItem>
                    <SelectItem value="gold">ذهب</SelectItem>
                    <SelectItem value="silver">فضة</SelectItem>
                    <SelectItem value="diamond">ألماس</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Product Type Filter */}
              <div className="space-y-1.5 md:space-y-2">
                <Label className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium">
                  <Package className="h-3 w-3 md:h-4 md:w-4 text-primary flex-shrink-0" />
                  <span className="truncate">نوع المنتج</span>
                </Label>
                <Select value={filterProductType} onValueChange={setFilterProductType}>
                  <SelectTrigger className="w-full h-9 md:h-10 text-xs md:text-sm">
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    <SelectItem value="ring">خاتم</SelectItem>
                    <SelectItem value="sized-ring">محبس</SelectItem>
                    <SelectItem value="name">اسم</SelectItem>
                    <SelectItem value="earring">حلق</SelectItem>
                    <SelectItem value="bracelet">اسوارة</SelectItem>
                    <SelectItem value="necklace">طوق</SelectItem>
                    <SelectItem value="set">طقم</SelectItem>
                    <SelectItem value="anklet">خلخال</SelectItem>
                    <SelectItem value="lira">ليرة</SelectItem>
                    <SelectItem value="half-lira">نصف ليرة</SelectItem>
                    <SelectItem value="quarter-lira">ربع ليرة</SelectItem>
                    <SelectItem value="ounce">أونصة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Karat Filter */}
              <div className="space-y-1.5 md:space-y-2">
                <Label className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium">
                  <Gem className="h-3 w-3 md:h-4 md:w-4 text-primary flex-shrink-0" />
                  <span className="truncate">العيار</span>
                </Label>
                <Select value={filterKarat} onValueChange={setFilterKarat}>
                  <SelectTrigger className="w-full h-9 md:h-10 text-xs md:text-sm">
                    <SelectValue placeholder="اختر العيار" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع العيارات</SelectItem>
                    <SelectItem value="18">18 عيار</SelectItem>
                    <SelectItem value="21">21 عيار</SelectItem>
                    <SelectItem value="24">24 عيار</SelectItem>
                    <SelectItem value="925">فضة 925</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          {/* Total Products */}
          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 truncate">إجمالي المنتجات</p>
                  <p className="text-xl md:text-3xl font-bold text-foreground">{stats.totalProducts}</p>
                </div>
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Package className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pinned Products */}
          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 truncate">المنتجات المثبتة</p>
                  <p className="text-xl md:text-3xl font-bold text-foreground">{stats.pinnedCount}</p>
                </div>
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <Star className="h-5 w-5 md:h-6 md:w-6 text-yellow-600 fill-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gold Products */}
          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-yellow-50 to-amber-50">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 truncate">منتجات الذهب</p>
                  <p className="text-xl md:text-3xl font-bold text-foreground">{stats.goldCount}</p>
                </div>
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Crown className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Silver Products */}
          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-gray-50 to-slate-50">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 truncate">منتجات الفضة</p>
                  <p className="text-xl md:text-3xl font-bold text-foreground">{stats.silverCount}</p>
                </div>
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-gradient-to-br from-gray-300 to-slate-400 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Gem className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diamond Products */}
          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-purple-50">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 truncate">منتجات الألماس</p>
                  <p className="text-xl md:text-3xl font-bold text-foreground">{stats.diamondCount}</p>
                </div>
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Gem className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product List */}
        <ProductList
          products={filteredAndSortedProducts}
          onEdit={handleEditProduct}
          onDelete={handleDeleteClick}
          onTogglePin={handleTogglePin}
          onToggleSpecial={handleToggleSpecial}
          loadingMore={loading}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>صفحة {currentPage} من {totalPages}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">إجمالي المنتجات: {totalProducts}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                  >
                    السابق
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
                          className="min-w-[2.5rem]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف المنتج <span className="font-bold text-foreground">{productToDelete?.name}</span>؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setProductToDelete(null);
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  const id = getProductId(productToDelete);
                  
                  if (!id) {
                    if (process.env.NODE_ENV === 'development') {
                      console.error('No product ID found:', productToDelete);
                    }
                    toast.error('تعذر العثور على معرف المنتج');
                    setShowDeleteModal(false);
                    setProductToDelete(null);
                    return;
                  }
                  
                  await handleDeleteProduct(id);
                  setShowDeleteModal(false);
                  setProductToDelete(null);
                } catch (error) {
                  if (process.env.NODE_ENV === 'development') {
                    console.error('Delete modal error:', error);
                  }
                  toast.error('حدث خطأ أثناء حذف المنتج');
                  setShowDeleteModal(false);
                  setProductToDelete(null);
                }
              }}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductsDashboard;

