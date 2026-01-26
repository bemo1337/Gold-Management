import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Pin, Star, Edit, Gem, Crown, Package } from 'lucide-react';
// PinOff, Eye - unused, removed
import { useNavigate } from 'react-router-dom';
import { getOptimizedImageUrl } from '../../utils/cloudinary';
import { getOwnerPath } from '../../config/adminConfig';

// shadcn/ui components
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';


const ProductList = ({
  products,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleSpecial,
  loadingMore = false,
}) => {
  const navigate = useNavigate();

  const getProductTypeLabel = (type) => {
    const types = {
      'ring': 'خاتم',
      'sized-ring': 'محبس',
      'necklace': 'أسم',
      'earring': 'حلق',
      'bracelet': 'اسوارة',
      'collar': 'طوق',
      'set': 'طقم',
      'anklet': 'خلخال',
      'lira': 'ليرة',
      'half-lira': 'نصف ليرة',
      'quarter-lira': 'ربع ليرة',
      'ounce': 'أونصة',
    };
    return types[type] || type;
  };

  // Helper for image slideshow per product
  const [imageIndexes, setImageIndexes] = useState({});
  const intervalRefs = useRef({});

  useEffect(() => {
    // Start interval for each product with multiple images
    products.forEach(product => {
      if (product.images && product.images.length > 1 && !intervalRefs.current[product.id || product._id]) {
        intervalRefs.current[product.id || product._id] = setInterval(() => {
          setImageIndexes(prev => ({
            ...prev,
            [product.id || product._id]: ((prev[product.id || product._id] || 0) + 1) % product.images.length
          }));
        }, 3000);
      }
    });
    // Cleanup on unmount
    return () => {
      Object.values(intervalRefs.current).forEach(clearInterval);
      intervalRefs.current = {};
    };
  }, [products]);

  // تم تبسيط الانيميشن - جميع المنتجات تظهر مباشرة

  const getMaterialIcon = (material) => {
    if (material === 'ذهب' || material === 'gold') return Crown;
    if (material === 'فضة' || material === 'silver') return Gem;
    if (material === 'ألماس' || material === 'diamond') return Gem;
    return Gem;
  };

  const getMaterialColor = (material) => {
    if (material === 'ذهب' || material === 'gold') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (material === 'فضة' || material === 'silver') return 'bg-gray-100 text-gray-700 border-gray-200';
    if (material === 'ألماس' || material === 'diamond') return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  if (loadingMore && products.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Package className="h-16 w-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">لا توجد منتجات</h3>
          <p className="text-sm text-slate-500">ابدأ بإضافة منتج جديد</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => {
        const productId = product.id || product._id;
        const currentImageIndex = imageIndexes[productId] || 0;
        const displayImage = product.images && product.images.length > 0
          ? (product.images[currentImageIndex]?.url || product.images[currentImageIndex])
          : null;
        
        const MaterialIcon = getMaterialIcon(product.material);
        const materialColorClass = getMaterialColor(product.material);

        return (
          <Card 
            key={productId} 
            className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-slate-200 hover:border-primary/20"
          >
            {/* Product Image */}
            <div className="relative h-64 bg-slate-100 overflow-hidden">
              {displayImage ? (
                <img
                  src={getOptimizedImageUrl(displayImage, { width: 400, height: 400, crop: 'fill', quality: 'auto', fetch_format: 'auto' })}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    if (displayImage && displayImage !== e.target.src) {
                      e.target.src = displayImage;
                    } else {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgdmlld0JveD0iMCAwIDE2MCAxNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik04MCA2MEM4OC4yODQzIDYwIDk1IDY2LjcxNTcgOTUgNzVDOTUgODMuMjg0MyA4OC4yODQzIDkwIDgwIDkwQzcxLjcxNTcgOTAgNjUgODMuMjg0MyA2NSA3NUM2NSA2Ni43MTU3IDcxLjcxNTcgNjAgODAgNjBaIiBmaWxsPSIjQ0NDQ0NDIi8+CjxwYXRoIGQ9Ik0xMDAgMTEwSDYwVjEzMEgxMDBWMTEwWiIgZmlsbD0iI0NDQ0NDQyIvPgo8L3N2Zz4K';
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                  <Package className="h-16 w-16 text-slate-400" />
                </div>
              )}
              
              {/* Pinned Badge */}
              {product.pinned && (
                <div className="absolute top-3 left-3">
                  <Badge className="bg-yellow-500 text-white border-yellow-600 hover:bg-yellow-600">
                    <Pin className="h-3 w-3 mr-1 fill-current" />
                    مثبت
                  </Badge>
                </div>
              )}
              
              {/* Special Badge */}
              {product.special && (
                <div className={`absolute top-3 ${product.pinned ? 'left-12' : 'left-3'}`}>
                  <Badge className="bg-purple-600 text-white border-purple-700 hover:bg-purple-700">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    خاص
                  </Badge>
                </div>
              )}

              {/* Material Badge */}
              <div className={`absolute top-3 right-3 ${materialColorClass}`}>
                <Badge variant="outline" className={`${materialColorClass} border`}>
                  <MaterialIcon className="h-3 w-3 ml-1" />
                  {product.material}
                </Badge>
              </div>

            </div>

            {/* Product Info */}
            <CardContent className="p-4 space-y-3">
              {/* Product Name */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 
                    className="font-semibold text-lg text-slate-900 line-clamp-1 cursor-pointer hover:text-primary transition-colors flex-1"
                    onClick={() => navigate(getOwnerPath(`products/${productId}`))}
                  >
                    {product.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSpecial(productId);
                    }}
                    className="flex-shrink-0 p-1 hover:bg-slate-100 rounded transition-colors"
                    title={product.special ? 'إلغاء خاصية المنتج الخاص' : 'تعيين المنتج كمنتج خاص'}
                  >
                    <Star 
                      className={`h-5 w-5 transition-colors ${
                        product.special 
                          ? 'text-purple-600 fill-purple-600' 
                          : 'text-slate-400 hover:text-purple-600'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-slate-500">{getProductTypeLabel(product.productType)}</p>
              </div>

              {/* Details */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                {product.karat && (
                  <Badge variant="outline" className="text-xs">
                    {product.karat} عيار
                  </Badge>
                )}
                {product.weight && (
                  <Badge variant="outline" className="text-xs">
                    {product.weight}g
                  </Badge>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-sm text-slate-600 line-clamp-2">
                  {product.description}
                </p>
              )}

              {/* Prices */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-primary">
                    ${product.totalPrice?.usd || 0}
                  </span>
                  <span className="text-xs text-slate-500">
                    {(product.totalPrice?.syp || 0).toLocaleString()} ل.س
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant={product.pinned ? "default" : "outline"}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(productId);
                  }}
                  className="flex-1 text-xs"
                >
                  <Pin className={`h-4 w-4 ml-1 ${product.pinned ? 'fill-current' : ''}`} />
                  {product.pinned ? 'إلغاء' : 'تثبيت'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(product);
                  }}
                  className="flex-1 text-xs"
                >
                  <Edit className="h-4 w-4 ml-1" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(product);
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ProductList; 
