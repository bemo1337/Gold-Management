import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  MessageCircle, 
  MapPin, 
  Clock, 
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Send,
  User,
  Calendar,
  // Loader2, // Unused
  Users as UsersIcon,
  Trash2,
  Phone,
  ChevronsUpDown
} from 'lucide-react';
import { toast } from '../../utils/toast';
import { useOwnerWishlist, useDeleteWishlistRequest, useRespondToWishlist } from '../../hooks/useOwner';

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Skeleton } from '../../components/ui/skeleton';

const WishListManager = () => {
  // const navigate = useNavigate(); // Unused
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewMode, setViewMode] = useState(null); // 'details' or 'response'
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('');
  const [responseForm, setResponseForm] = useState({
    message: '',
    priceEstimate: {
      amount: '',
      currency: 'SYP',
      note: ''
    },
    canCustomize: false,
    estimatedTime: '',
    contactInfo: {
      phone: '',
      email: '',
      whatsapp: ''
    }
  });

  // React Query hooks with caching
  const { data: wishlistData, isLoading: loading, error } = useOwnerWishlist({ 
    page: currentPage, 
    limit: 20, 
    sortBy, 
    status: statusFilter || undefined 
  });

  // Extract data from React Query response
  const wishListRequests = wishlistData?.wishListRequests || [];
  const totalPages = wishlistData?.totalPages || 1;

  // Mutations
  const deleteWishlistMutation = useDeleteWishlistRequest();
  const respondToWishlistMutation = useRespondToWishlist();

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(error.message || 'حدث خطأ أثناء تحميل طلبات العملاء');
    }
  }, [error]);

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setViewMode('details');
  };

  const handleRespondToRequest = (request) => {
    setSelectedRequest(request);
    setViewMode('response');
  };

  const handleBackToList = () => {
    setSelectedRequest(null);
    setViewMode(null);
  };

  const handleDeleteRequest = (request) => {
    setRequestToDelete(request);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteRequest = async () => {
    if (!requestToDelete) return;

    try {
      await deleteWishlistMutation.mutateAsync(requestToDelete._id);
      toast.success('تم حذف الطلب بنجاح');
      setShowDeleteConfirm(false);
      setRequestToDelete(null);
      // React Query will automatically refetch and update cache
    } catch (error) {
      toast.error(error.message || 'حدث خطأ أثناء حذف الطلب');
    }
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    
    if (!responseForm.message.trim()) {
      toast.error('الرسالة مطلوبة');
      return;
    }

    try {
      await respondToWishlistMutation.mutateAsync({ 
        id: selectedRequest._id, 
        responseData: responseForm 
      });
      toast.success('تم إرسال الرد بنجاح!');
      setResponseForm({
          message: '',
          priceEstimate: {
            amount: '',
            currency: 'SYP',
            note: ''
          },
          canCustomize: false,
          estimatedTime: '',
          contactInfo: {
            phone: '',
            email: '',
            whatsapp: ''
          }
        });
        handleBackToList();
        // React Query will automatically refetch and update cache
    } catch (error) {
      toast.error(error.message || 'حدث خطأ أثناء إرسال الرد');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4" />;
      case 'responded':
        return <MessageCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status) => {
    const statuses = {
      'pending': 'بانتظار الرد',
      'in_progress': 'جاري الرد',
      'responded': 'تم الرد',
      'completed': 'مكتمل',
      'cancelled': 'ملغي'
    };
    return statuses[status] || status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'in_progress':
        return '#3B82F6';
      case 'responded':
        return '#10B981';
      case 'completed':
        return '#10B981';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  // eslint-disable-next-line no-unused-vars
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return '#DC2626';
      case 'high':
        return '#F97316';
      case 'medium':
        return '#FCD34D';
      case 'low':
        return '#22C55E';
      default:
        return '#6B7280';
    }
  };

  // eslint-disable-next-line no-unused-vars
  const getPriorityText = (priority) => {
    const priorities = {
      'urgent': 'عاجلة',
      'high': 'عالية',
      'medium': 'متوسطة',
      'low': 'منخفضة'
    };
    return priorities[priority] || priority;
  };

  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
        <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-40 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
      <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-3">
              <UsersIcon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">إدارة طلبات العملاء</h1>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                <Label htmlFor="statusFilter" className="text-xs md:text-sm text-slate-600 whitespace-nowrap">حالة الطلب:</Label>
                <Select value={statusFilter || "all"} onValueChange={(value) => {
                  setStatusFilter(value === "all" ? '' : value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger id="statusFilter" className="w-full sm:w-48">
                    <SelectValue placeholder="جميع الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="pending">بانتظار الرد</SelectItem>
                    <SelectItem value="in_progress">جاري الرد</SelectItem>
                    <SelectItem value="responded">تم الرد</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                    <SelectItem value="archived">مؤرشف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                <div className="hidden sm:flex items-center gap-2">
                  <ChevronsUpDown className="h-4 w-4 text-slate-600" />
                  <Label htmlFor="sortBy" className="text-xs md:text-sm text-slate-600 whitespace-nowrap">ترتيب حسب:</Label>
                </div>
                <Select value={sortBy} onValueChange={(value) => {
                  setSortBy(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger id="sortBy" className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">الأحدث أولاً</SelectItem>
                    <SelectItem value="oldest">الأقدم أولاً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
            <Card>
              <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="p-2 md:p-3 rounded-full bg-blue-100 flex-shrink-0">
                    <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xl md:text-2xl font-bold text-slate-900">{wishListRequests.length}</p>
                    <p className="text-xs md:text-sm text-slate-600 truncate">إجمالي الطلبات</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="p-2 md:p-3 rounded-full bg-amber-100 flex-shrink-0">
                    <Clock className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xl md:text-2xl font-bold text-slate-900">
                      {wishListRequests.filter(r => r.status === 'pending').length}
                    </p>
                    <p className="text-xs md:text-sm text-slate-600 truncate">بانتظار الرد</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Requests List */}
          {wishListRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageCircle className="h-16 w-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">لا توجد طلبات</h3>
                <p className="text-slate-600">لا توجد طلبات حالياً</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {wishListRequests.map((request) => (
                <Card key={request._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="p-4 md:p-6">
                    <div className="flex items-start justify-between gap-2 md:gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base md:text-lg mb-2 line-clamp-2">{request.title}</CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            style={{ backgroundColor: getStatusColor(request.status) }}
                            className="text-white flex items-center gap-1 text-xs"
                          >
                            {getStatusIcon(request.status)}
                            <span className="whitespace-nowrap">{getStatusText(request.status)}</span>
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0">
                    <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600">
                      <Calendar className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                      <span className="truncate">{formatDate(request.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600">
                      <User className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                      <span className="truncate">{request.customer?.username || 'عميل غير مسجل'}</span>
                    </div>

                    <p className="text-xs md:text-sm text-slate-700 line-clamp-3">
                      {request.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-600">النوع:</span>
                        <p className="font-medium">{request.specifications.productType}</p>
                      </div>
                      <div>
                        <span className="text-slate-600">المادة:</span>
                        <p className="font-medium">{request.specifications.material}</p>
                      </div>
                      {request.specifications.karat !== 'غير محدد' && (
                        <div className="col-span-2">
                          <span className="text-slate-600">العيار:</span>
                          <p className="font-medium">{request.specifications.karat}</p>
                        </div>
                      )}
                    </div>

                    {request.specifications.budget?.max > 0 && (
                      <div className="flex items-center gap-2 text-xs md:text-sm">
                        <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-green-600 flex-shrink-0" />
                        <span className="text-slate-700 truncate">
                          الميزانية: {request.specifications.budget.max} {request.specifications.budget.currency}
                        </span>
                      </div>
                    )}

                    {request.location?.city && (
                      <div className="flex items-center gap-2 text-xs md:text-sm">
                        <MapPin className="h-3 w-3 md:h-4 md:w-4 text-blue-600 flex-shrink-0" />
                        <span className="text-slate-700 truncate">{request.location.city}</span>
                      </div>
                    )}

                    {request.stats?.responsesCount > 0 && (
                      <div className="flex items-center gap-2 text-xs md:text-sm">
                        <MessageCircle className="h-3 w-3 md:h-4 md:w-4 text-purple-600 flex-shrink-0" />
                        <span className="text-slate-700">{request.stats.responsesCount} رد</span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3 md:pt-4 border-t border-slate-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewRequest(request)}
                        className="flex-1 text-xs md:text-sm"
                      >
                        <Eye className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
                        عرض
                      </Button>
                      
                      {request.status === 'pending' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleRespondToRequest(request)}
                          className="flex-1 text-xs md:text-sm"
                        >
                          <Send className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
                          رد
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRequest(request)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 md:px-4"
                      >
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="text-xs md:text-sm"
              >
                السابق
              </Button>
              
              <span className="text-xs md:text-sm text-slate-600 whitespace-nowrap">
                صفحة {currentPage} من {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="text-xs md:text-sm"
              >
                التالي
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={viewMode === 'details'} onOpenChange={(open) => !open && handleBackToList()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <MessageCircle className="h-6 w-6 text-primary" />
              تفاصيل الطلب
            </DialogTitle>
            <DialogDescription>
              معلومات كاملة عن طلب العميل
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">معلومات الطلب</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-600">العنوان</Label>
                      <p className="font-semibold mt-1">{selectedRequest.title}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">العميل</Label>
                      <p className="font-semibold mt-1">{selectedRequest.customer?.username || 'عميل غير مسجل'}</p>
                      {selectedRequest.customer?.email && (
                        <p className="text-sm text-slate-500 mt-1">{selectedRequest.customer.email}</p>
                      )}
                      {selectedRequest.phone && (
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="h-4 w-4 text-slate-500" />
                          <p className="text-sm text-slate-500">{selectedRequest.phone}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-slate-600">الوصف</Label>
                      <p className="font-semibold mt-1">{selectedRequest.description}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">تاريخ الطلب</Label>
                      <p className="font-semibold mt-1">{formatDate(selectedRequest.createdAt)}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">حالة الطلب</Label>
                      <Badge 
                        className="mt-1"
                        style={{ 
                          backgroundColor: getStatusColor(selectedRequest.status),
                          color: 'white'
                        }}
                      >
                        {getStatusIcon(selectedRequest.status)}
                        <span className="mr-1">{getStatusText(selectedRequest.status)}</span>
                      </Badge>
                    </div>
                    {selectedRequest.deadline && (
                      <div>
                        <Label className="text-slate-600">الموعد المطلوب</Label>
                        <p className="font-semibold mt-1">{formatDate(selectedRequest.deadline)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Specifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">مواصفات المنتج</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-600">المادة</Label>
                      <p className="font-semibold mt-1">{selectedRequest.specifications.material}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">نوع المنتج</Label>
                      <p className="font-semibold mt-1">{selectedRequest.specifications.productType}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">الوزن</Label>
                      <p className="font-semibold mt-1">
                        {selectedRequest.specifications.weight > 0 
                          ? `${selectedRequest.specifications.weight} غرام` 
                          : 'غير محدد'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-600">العيار</Label>
                      <p className="font-semibold mt-1">
                        {selectedRequest.specifications.karat && selectedRequest.specifications.karat !== 'غير محدد' 
                          ? selectedRequest.specifications.karat 
                          : 'غير محدد'}
                      </p>
                    </div>
                    {selectedRequest.specifications.size && (
                      <div>
                        <Label className="text-slate-600">الحجم</Label>
                        <p className="font-semibold mt-1">{selectedRequest.specifications.size}</p>
                      </div>
                    )}
                    {selectedRequest.specifications.color && (
                      <div>
                        <Label className="text-slate-600">اللون المفضل</Label>
                        <p className="font-semibold mt-1">{selectedRequest.specifications.color}</p>
                      </div>
                    )}
                    {selectedRequest.specifications.design && (
                      <div>
                        <Label className="text-slate-600">التصميم المفضل</Label>
                        <p className="font-semibold mt-1">{selectedRequest.specifications.design}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Budget and Location */}
              {(selectedRequest.specifications.budget?.max > 0 || selectedRequest.specifications.budget?.min > 0 || selectedRequest.location?.city || selectedRequest.location?.area) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">معلومات إضافية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(selectedRequest.specifications.budget?.min > 0 || selectedRequest.specifications.budget?.max > 0) && (
                        <div>
                          <Label className="text-slate-600">الميزانية</Label>
                          <p className="font-semibold mt-1">
                            {selectedRequest.specifications.budget.min > 0 && selectedRequest.specifications.budget.max > 0
                              ? `${selectedRequest.specifications.budget.min} - ${selectedRequest.specifications.budget.max}`
                              : selectedRequest.specifications.budget.max > 0
                              ? `حتى ${selectedRequest.specifications.budget.max}`
                              : `من ${selectedRequest.specifications.budget.min}`
                            } {selectedRequest.specifications.budget.currency}
                          </p>
                        </div>
                      )}
                      {selectedRequest.location?.city && (
                        <div>
                          <Label className="text-slate-600">المدينة</Label>
                          <p className="font-semibold mt-1">{selectedRequest.location.city}</p>
                        </div>
                      )}
                      {selectedRequest.location?.area && (
                        <div>
                          <Label className="text-slate-600">المنطقة</Label>
                          <p className="font-semibold mt-1">{selectedRequest.location.area}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {selectedRequest.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ملاحظات إضافية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedRequest.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Images */}
              {selectedRequest.images && selectedRequest.images.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">الصور المرفقة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedRequest.images.map((image, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                          <img 
                            src={image.url} 
                            alt={image.caption || `صورة ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {image.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
                              {image.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedRequest?.status === 'pending' && (
              <Button
                onClick={() => setViewMode('response')}
              >
                <Send className="h-4 w-4 ml-2" />
                الرد على الطلب
              </Button>
            )}
            <Button variant="outline" onClick={handleBackToList}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={viewMode === 'response'} onOpenChange={(open) => !open && handleBackToList()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Send className="h-6 w-6 text-primary" />
              الرد على طلب: {selectedRequest?.title}
            </DialogTitle>
            <DialogDescription>
              اكتب ردك على طلب العميل
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitResponse} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">الرسالة *</Label>
              <Textarea
                id="message"
                value={responseForm.message}
                onChange={(e) => setResponseForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="اكتب ردك على طلب العميل..."
                rows="4"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priceAmount">التقدير السعري</Label>
                <Input
                  type="number"
                  id="priceAmount"
                  value={responseForm.priceEstimate.amount}
                  onChange={(e) => setResponseForm(prev => ({ 
                    ...prev, 
                    priceEstimate: { ...prev.priceEstimate, amount: e.target.value }
                  }))}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">العملة</Label>
                <Select
                  value={responseForm.priceEstimate.currency}
                  onValueChange={(value) => setResponseForm(prev => ({ 
                    ...prev, 
                    priceEstimate: { ...prev.priceEstimate, currency: value }
                  }))}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SYP">ليرة سورية</SelectItem>
                    <SelectItem value="USD">دولار أمريكي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedTime">الوقت المتوقع</Label>
              <Input
                type="text"
                id="estimatedTime"
                value={responseForm.estimatedTime}
                onChange={(e) => setResponseForm(prev => ({ ...prev, estimatedTime: e.target.value }))}
                placeholder="مثال: أسبوع واحد"
              />
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="canCustomize"
                checked={responseForm.canCustomize}
                onCheckedChange={(checked) => setResponseForm(prev => ({ ...prev, canCustomize: checked }))}
              />
              <Label
                htmlFor="canCustomize"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                يمكنني تصنيع القطعة حسب الطلب
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleBackToList}
              >
                إلغاء
              </Button>
              <Button type="submit">
                <Send className="h-4 w-4 ml-2" />
                إرسال الرد
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              تأكيد الحذف
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذا الطلب؟ هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteConfirm(false);
              setRequestToDelete(null);
            }}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRequest}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WishListManager;
