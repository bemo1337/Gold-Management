import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, Trash2, Pin, PinOff, X, ChevronLeft, ChevronRight, Package, Loader2, Star, MessageCircle } from 'lucide-react';
import { toast } from '../../utils/toast';
import { useProduct, useDeleteProduct, useTogglePin, useToggleSpecial } from '../../hooks/useProducts';
import { useDeleteComment } from '../../hooks/useComments';
import { getOptimizedImageUrl } from '../../utils/cloudinary';
import { getOwnerPath } from '../../config/adminConfig';

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';



const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsLimit, setCommentsLimit] = useState(20);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);

  // Set light mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    // Scroll to top when page loads
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // React Query hooks with caching
  const { data: productData, isLoading: loading, error, refetch: refetchProduct } = useProduct(id);
  
  const product = productData ? {
    ...productData,
    id: productData._id || productData.id
  } : null;
  
  // Mutations
  const deleteProductMutation = useDeleteProduct();
  const togglePinMutation = useTogglePin();
  const toggleSpecialMutation = useToggleSpecial();
  const deleteCommentMutation = useDeleteComment();

  // Comments state for pagination (manual fetch needed)
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  // Handle navigation on error
  useEffect(() => {
    if (error && !loading) {
      navigate(getOwnerPath('dashboard'));
    }
  }, [error, loading, navigate]);

  const fetchComments = async (limit = 20, append = false) => {
    if (!product) return;
    try {
      setCommentsLoading(true);
      const { authenticatedFetch } = await import('../../utils/auth');
      const productId = product.id || product._id;
      const res = await authenticatedFetch(`/api/comments?product=${productId}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        
        // Check if there might be more comments
        setHasMoreComments(data.length >= limit);
        
        if (append) {
          // Append new comments, avoiding duplicates
          setComments(prev => {
            const existingIds = new Set(prev.map(c => c._id || c.id));
            const newComments = data.filter(c => !existingIds.has(c._id || c.id));
            return [...prev, ...newComments];
          });
        } else {
          setComments(data);
        }
      } else {
        toast.error('فشل تحميل التعليقات');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching comments:', error);
      }
      toast.error('حدث خطأ أثناء تحميل التعليقات');
    } finally {
      setCommentsLoading(false);
    }
  };

  const loadMoreComments = () => {
    const newLimit = commentsLimit + 20;
    setCommentsLimit(newLimit);
    fetchComments(newLimit, true);
  };

  // Fetch comments when modal opens
  useEffect(() => {
    if (product && showCommentsModal) {
      fetchComments(20, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, showCommentsModal]);

  const handleDeleteCommentClick = (commentId) => {
    setCommentToDelete(commentId);
    setShowDeleteCommentModal(true);
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    
    try {
      setDeletingCommentId(commentToDelete);
      await deleteCommentMutation.mutateAsync(commentToDelete);
      toast.success('تم حذف التعليق بنجاح');
      // Remove comment from state
      setComments(prev => prev.filter(c => (c._id || c.id) !== commentToDelete));
      // Update hasMoreComments if needed
      if (comments.length <= commentsLimit) {
        setHasMoreComments(false);
      }
      setShowDeleteCommentModal(false);
      setCommentToDelete(null);
    } catch (error) {
      toast.error(error.message || 'حدث خطأ أثناء حذف التعليق');
    } finally {
      setDeletingCommentId(null);
    }
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightbox.open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLightbox({ ...lightbox, open: false });
      } else if (e.key === 'ArrowLeft') {
        setLightbox(l => ({ ...l, index: (l.index + 1) % l.images.length }));
      } else if (e.key === 'ArrowRight') {
        setLightbox(l => ({ ...l, index: (l.index - 1 + l.images.length) % l.images.length }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox]);

  const handleEdit = () => {
    const productId = product?.id || product?._id;
    if (productId) {
      navigate(getOwnerPath(`products/edit/${productId}`));
    }
  };

  const handleDelete = async () => {
    try {
      const productId = product.id || product._id;
      if (!productId) {
        toast.error('تعذر العثور على معرف المنتج');
        return;
      }
      await deleteProductMutation.mutateAsync(productId);
      toast.success('تم حذف المنتج بنجاح');
      setShowDeleteModal(false);
      // Navigate to dashboard after successful deletion
      navigate(getOwnerPath('dashboard'));
    } catch (err) {
      toast.error(err.message || 'حدث خطأ أثناء حذف المنتج');
    }
  };

  const togglePin = async () => {
    try {
      const productId = product.id || product._id;
      await togglePinMutation.mutateAsync(productId);
      toast.success('تم تحديث حالة التثبيت بنجاح');
    } catch (err) {
      toast.error(err.message || 'حدث خطأ أثناء تثبيت المنتج');
    }
  };

  const toggleSpecial = async () => {
    try {
      const productId = product.id || product._id;
      const data = await toggleSpecialMutation.mutateAsync(productId);
      toast.success(data.special ? 'تم تعيين المنتج كمنتج خاص' : 'تم إلغاء خاصية المنتج الخاص');
    } catch (err) {
      toast.error(err.message || 'حدث خطأ أثناء تحديث حالة المنتج');
    }
  };

  if (loading) {
    return (
      <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-slate-600">جاري تحميل المنتج...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">المنتج غير موجود</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto space-y-6">
          {/* Header with actions */}
          <div className="flex items-center justify-end flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={togglePin}
                variant={product.pinned ? "default" : "outline"}
                title={product.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                className="flex items-center gap-2"
              >
                {product.pinned ? <PinOff size={18} /> : <Pin size={18} />}
                {product.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
              </Button>

              <Button
                onClick={toggleSpecial}
                variant={product.special ? "default" : "outline"}
                title={product.special ? 'إلغاء خاصية المنتج الخاص' : 'تعيين المنتج كمنتج خاص'}
                className="flex items-center gap-2"
              >
                <Star className={`h-4 w-4 ${product.special ? 'fill-current' : ''}`} />
                {product.special ? 'إلغاء خاص' : 'خاص'}
              </Button>

              <Button onClick={handleEdit} variant="outline" className="flex items-center gap-2">
                <Edit size={18} />
                تعديل
              </Button>

              <Button 
                onClick={() => setShowDeleteModal(true)} 
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 size={18} />
                حذف
              </Button>
            </div>
          </div>

          {/* Product Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Right Column - Images */}
            <Card>
              <CardContent className="p-4">
                {/* Main Image */}
                {product.images && product.images.length > 0 ? (
                  <div className="relative">
                    <img
                      src={getOptimizedImageUrl(product.images[0], { width: 800, height: 800, quality: 'auto', fetch_format: 'auto' })}
                      alt={product.name}
                      className="w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setLightbox({ open: true, images: product.images, index: 0 })}
                      onError={(e) => {
                        if (!e.target.src.includes('data:image/svg+xml')) {
                          const originalUrl = product.images[0];
                          if (originalUrl && originalUrl !== e.target.src) {
                            e.target.src = originalUrl;
                          } else {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgdmlld0JveD0iMCAwIDE2MCAxNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik04MCA2MEM4OC4yODQzIDYwIDk1IDY2LjcxNTcgOTUgNzVDOTUgODMuMjg0MyA4OC4yODQzIDkwIDgwIDkwQzcxLjcxNTcgOTAgNjUgODMuMjg0MyA2NSA3NUM2NSA2Ni43MTU3IDcxLjcxNTcgNjAgODAgNjBaIiBmaWxsPSIjQ0NDQ0NDIi8+CjxwYXRoIGQ9Ik0xMDAgMTEwSDYwVjEzMEgxMDBWMTEwWiIgZmlsbD0iI0NDQ0NDQyIvPgo8L3N2Zz4K';
                          }
                        }
                      }}
                    />
                    {product.pinned && (
                      <Badge className="absolute top-3 left-3 bg-yellow-500 text-white">
                        <Pin className="h-3 w-3 mr-1 fill-current" />
                        مثبت
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-96 bg-slate-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Package className="h-16 w-16 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-500">لا توجد صورة</p>
                    </div>
                  </div>
                )}
                
                {/* Thumbnail Images */}
                {product.images && product.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {product.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={getOptimizedImageUrl(img, { width: 200, height: 200, crop: 'fill', quality: 'auto' })}
                        alt={`صورة ${idx + 1}`}
                        className="w-full h-20 object-cover rounded-md cursor-pointer hover:ring-2 ring-primary transition-all"
                        onClick={() => setLightbox({ open: true, images: product.images, index: idx })}
                        onError={(e) => {
                          if (img && img !== e.target.src) {
                            e.target.src = img;
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Left Column - Details */}
            <div className="space-y-6">
              {/* Product Name and Badges */}
              <Card>
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h1 className="text-3xl font-bold text-slate-900">
                        {product.name}
                      </h1>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSpecial();
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
                    <div className="flex flex-wrap justify-center gap-2">
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        {product.material}
                      </Badge>
                      <Badge variant="outline">{product.productType}</Badge>
                      <Badge variant="outline">{(product.karat || product.carat)} عيار</Badge>
                      <Badge variant="outline">{product.weight} غرام</Badge>
                      {product.pinned && (
                        <Badge className="bg-yellow-500 text-white border-yellow-600">
                          مثبت
                        </Badge>
                      )}
                      {product.special && (
                        <Badge className="bg-purple-600 text-white border-purple-700">
                          منتج خاص
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Product Info Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">العيار</div>
                      <div className="text-lg font-semibold text-slate-900">{product.karat || product.carat}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">الوزن</div>
                      <div className="text-lg font-semibold text-slate-900">{product.weight} غرام</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">أجار الغرام</div>
                      <div className="text-lg font-semibold text-slate-900">{product.gramWage || 'غير محدد'}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">أجار الصنعة USD</div>
                      <div className="text-lg font-semibold text-slate-900">{product.craftingFeeUSD || 0} USD</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Prices */}
              <Card>
                <CardHeader>
                  <CardTitle>الأسعار</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Gram Prices */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold text-slate-700">أسعار الغرام</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {product.gramPrice && product.gramPrice.usd !== undefined && (
                        <Card className="bg-blue-50 border-blue-200">
                          <CardContent className="p-4">
                            <div className="text-xs text-slate-600 mb-1">سعر الغرام</div>
                            <div className="text-xl font-bold text-blue-700">{product.gramPrice.usd} USD</div>
                          </CardContent>
                        </Card>
                      )}
                      {product.gramPrice && product.gramPrice.syp !== undefined && (
                        <Card className="bg-green-50 border-green-200">
                          <CardContent className="p-4">
                            <div className="text-xs text-slate-600 mb-1">سعر الغرام</div>
                            <div className="text-xl font-bold text-green-700">{Number(product.gramPrice.syp).toLocaleString()} SYP</div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>

                  {/* Total Prices */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold text-slate-700">الأسعار الكلية</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {product.totalPrice && product.totalPrice.usd !== undefined && (
                        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300">
                          <CardContent className="p-4">
                            <div className="text-xs text-slate-600 mb-1">السعر الكلي</div>
                            <div className="text-2xl font-bold text-blue-700">${product.totalPrice.usd.toFixed(2)}</div>
                          </CardContent>
                        </Card>
                      )}
                      {product.totalPrice && product.totalPrice.syp !== undefined && (
                        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-300">
                          <CardContent className="p-4">
                            <div className="text-xs text-slate-600 mb-1">السعر الكلي</div>
                            <div className="text-2xl font-bold text-green-700">{Number(product.totalPrice.syp.toFixed(2)).toLocaleString()} ل.س</div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              {product.description && product.description.trim() !== '' && (
                <Card>
                  <CardHeader>
                    <CardTitle>الوصف</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-700 leading-relaxed">{product.description.trim()}</p>
                  </CardContent>
                </Card>
              )}

              {/* Additional Info */}
              {product.stones && product.stones.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>الأحجار</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-4">
                      إجمالي عدد الأحجار: <span className="font-semibold">{product.stones.length} حجر</span>
                    </p>
                    <div className="space-y-3">
                      {product.stones.map((stone, idx) => (
                        <Card key={idx} className="bg-slate-50">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div><strong>النوع:</strong> {stone.type}</div>
                              <div><strong>اللون:</strong> {stone.color}</div>
                              <div><strong>العدد:</strong> {stone.count}</div>
                              <div><strong>الوزن الكلي:</strong> {stone.totalWeight} قيراط</div>
                              <div><strong>سعر القيراط USD:</strong> {stone.caratPrice?.usd || 0} USD</div>
                              <div><strong>سعر القيراط SYP:</strong> {stone.caratPrice?.syp || 0} SYP</div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {product.ringSizes && product.ringSizes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>قياسات المحبس</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-2">
                      عدد القياسات المتاحة: <span className="font-semibold">{product.ringSizes.length} قياس</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.ringSizes.map((size, idx) => (
                        <Badge key={idx} variant="outline" className="text-sm py-1 px-3">
                          {size}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {product.setAccessories && product.setAccessories.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>ملحقات الطقم</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-2">
                      عدد الملحقات: <span className="font-semibold">{product.setAccessories.length} قطعة</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.setAccessories.map((accessory, idx) => (
                        <Badge key={idx} variant="outline" className="text-sm py-1 px-3">
                          {accessory}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Meta Information */}
              <Card>
                <CardHeader>
                  <CardTitle>معلومات إضافية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <div className="text-sm text-slate-500">تاريخ الإضافة</div>
                    <div className="text-sm font-medium text-slate-700">
                      {product.createdAt && new Date(product.createdAt).toLocaleString('ar-EG')}
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <div className="text-sm text-slate-500">آخر تحديث</div>
                    <div className="text-sm font-medium text-slate-700">
                      {product.updatedAt && new Date(product.updatedAt).toLocaleString('ar-EG')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comments Button */}
              <Card>
                <CardContent className="p-6">
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => {
                      setShowCommentsModal(true);
                      setCommentsLimit(20);
                      setComments([]); // Reset comments when opening modal
                    }}
                  >
                    <MessageCircle className="h-5 w-5" />
                    عرض التعليقات
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
      </div>

      {/* Comments Modal */}
      <Dialog open={showCommentsModal} onOpenChange={setShowCommentsModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              تعليقات المنتج
            </DialogTitle>
            <DialogDescription>
              عرض وإدارة جميع التعليقات على هذا المنتج
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 min-h-[300px] max-h-[500px]">
            {commentsLoading && comments.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="mr-2 text-slate-600">جاري تحميل التعليقات...</span>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <p className="text-lg">لا توجد تعليقات على هذا المنتج</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <Card key={comment._id || comment.id} className="bg-slate-50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-slate-900">
                              {comment.user?.username || 'مستخدم'}
                            </span>
                            <span className="text-xs text-slate-500">
                              {comment.createdAt && new Date(comment.createdAt).toLocaleString('ar-EG')}
                            </span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">{comment.content}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                          onClick={() => handleDeleteCommentClick(comment._id || comment.id)}
                          disabled={deletingCommentId === (comment._id || comment.id)}
                        >
                          {deletingCommentId === (comment._id || comment.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Load More Button */}
                {hasMoreComments && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={loadMoreComments}
                      disabled={commentsLoading}
                      className="w-full"
                    >
                      {commentsLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          جاري التحميل...
                        </>
                      ) : (
                        'تحميل المزيد (20)'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCommentsModal(false)}
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Comment Confirmation Dialog */}
      <Dialog open={showDeleteCommentModal} onOpenChange={setShowDeleteCommentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">تأكيد حذف التعليق</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذا التعليق؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteCommentModal(false);
                setCommentToDelete(null);
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteComment}
              disabled={deletingCommentId !== null}
            >
              {deletingCommentId ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  جاري الحذف...
                </>
              ) : (
                'حذف'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Product Confirmation Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف المنتج <span className="font-bold text-slate-900">{product.name}</span>؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox for product images */}
      {lightbox.open && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox({ ...lightbox, open: false })}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 h-10 w-10 z-10"
            onClick={() => setLightbox({ ...lightbox, open: false })}
            aria-label="إغلاق"
          >
            <X size={24} />
          </Button>
          
          <div 
            className="relative max-w-7xl w-full max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getOptimizedImageUrl(lightbox.images[lightbox.index], { width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' })}
              alt={`صورة ${lightbox.index + 1} من ${lightbox.images.length}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            
            {lightbox.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-14 w-14 bg-black/70 hover:bg-black/90 rounded-full shadow-lg backdrop-blur-sm z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox(l => ({ ...l, index: (l.index - 1 + l.images.length) % l.images.length }));
                  }}
                  aria-label="الصورة السابقة"
                >
                  <ChevronRight size={32} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-14 w-14 bg-black/70 hover:bg-black/90 rounded-full shadow-lg backdrop-blur-sm z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox(l => ({ ...l, index: (l.index + 1) % l.images.length }));
                  }}
                  aria-label="الصورة التالية"
                >
                  <ChevronLeft size={32} />
                </Button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
                  {lightbox.index + 1} / {lightbox.images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;

