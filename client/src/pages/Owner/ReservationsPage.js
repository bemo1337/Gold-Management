import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Calendar,
  User,
  // MapPin, // Unused
  DollarSign,
  Bookmark,
  // RefreshCw, // Unused
  Phone,
  Mail,
  // MessageSquare, // Unused
  Trash2,
  Loader2,
  Gem,
  Scale
} from 'lucide-react';
import { toast } from '../../utils/toast';
import { useOwnerReservations, useApproveReservation, useRejectReservation, useDeleteReservation } from '../../hooks/useReservations';

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Alert, AlertDescription } from '../../components/ui/alert';
// import { Skeleton } from '../../components/ui/skeleton'; // Unused


const ReservationsPage = () => {
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // React Query hooks with caching
  const { data: reservationsData, isLoading: loading, error } = useOwnerReservations({ 
    page: currentPage, 
    limit: 10 
  });

  // Extract data from React Query response
  const reservations = reservationsData?.reservations || [];
  const totalPages = reservationsData?.totalPages || 1;
  const totalReservations = reservationsData?.total || 0;

  // Mutations
  const approveReservationMutation = useApproveReservation();
  const rejectReservationMutation = useRejectReservation();
  const deleteReservationMutation = useDeleteReservation();

  // Handle errors
  useEffect(() => {
    if (error) {
      if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        toast.error('غير مصرح لك بعرض الحجوزات');
      } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        toast.error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        toast.error(`خطأ في جلب الحجوزات: ${error.message || 'حدث خطأ غير متوقع'}`);
      }
    }
  }, [error]);

  const handleViewDetails = (reservation) => {
    setSelectedReservation(reservation);
    setShowDetailsModal(true);
  };

  const handleApproveReservation = async (reservationId) => {
    try {
      await approveReservationMutation.mutateAsync(reservationId);
      toast.success('تم الموافقة على الحجز بنجاح');
      setShowDetailsModal(false);
      // React Query will automatically refetch and update cache
    } catch (error) {
      toast.error(error.message || 'حدث خطأ أثناء الموافقة على الحجز');
    }
  };

  const handleRejectReservation = async (reservationId) => {
    try {
      await rejectReservationMutation.mutateAsync(reservationId);
      toast.success('تم رفض الحجز');
      setShowDetailsModal(false);
      // React Query will automatically refetch and update cache
    } catch (error) {
      toast.error(error.message || 'حدث خطأ أثناء رفض الحجز');
    }
  };

  const handleDeleteClick = (reservation) => {
    setReservationToDelete(reservation);
    setShowDeleteDialog(true);
  };

  const handleDeleteReservation = async () => {
    if (!reservationToDelete) return;

    try {
      await deleteReservationMutation.mutateAsync(reservationToDelete._id);
      toast.success('تم حذف الحجز بنجاح');
      setShowDetailsModal(false);
      setShowDeleteDialog(false);
      setReservationToDelete(null);
      // React Query will automatically refetch and update cache
    } catch (error) {
      toast.error(error.message || 'حدث خطأ أثناء حذف الحجز');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="status-icon pending" />;
      case 'approved':
        return <CheckCircle className="status-icon approved" />;
      case 'rejected':
        return <XCircle className="status-icon rejected" />;
      case 'expired':
        return <AlertCircle className="status-icon expired" />;
      default:
        return <Clock className="status-icon pending" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'في الانتظار';
      case 'approved':
        return 'موافق عليه';
      case 'rejected':
        return 'مرفوض';
      case 'expired':
        return 'منتهي الصلاحية';
      default:
        return 'غير محدد';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      case 'expired':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-slate-600">جاري تحميل الحجوزات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
      <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Bookmark className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-slate-900">إدارة الحجوزات</h1>
              </div>
            </div>
          </div>


          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-amber-100">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {reservations.filter(r => r.status === 'pending').length}
                    </p>
                    <p className="text-sm text-slate-600">في الانتظار</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {reservations.filter(r => r.status === 'approved').length}
                    </p>
                    <p className="text-sm text-slate-600">موافق عليه</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-red-100">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {reservations.filter(r => r.status === 'rejected').length}
                    </p>
                    <p className="text-sm text-slate-600">مرفوض</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-100">
                    <Bookmark className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{totalReservations}</p>
                    <p className="text-sm text-slate-600">إجمالي الحجوزات</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reservations List */}
          {reservations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bookmark className="h-16 w-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">لا توجد حجوزات</h3>
                <p className="text-slate-600">لم يتم العثور على أي حجوزات</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reservations.map((reservation) => (
                <Card key={reservation._id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">
                          {reservation.product?.name || 'منتج غير محدد'}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-slate-600">
                          <User className="h-4 w-4" />
                          <span>{reservation.customer?.username || 'عميل غير محدد'}</span>
                        </div>
                      </div>
                      <Badge 
                        style={{ backgroundColor: getStatusColor(reservation.status) }}
                        className="text-white flex items-center gap-2"
                      >
                        {getStatusIcon(reservation.status)}
                        {getStatusText(reservation.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="h-4 w-4" />
                        <span>تاريخ الحجز: {formatDate(reservation.createdAt)}</span>
                      </div>
                      
                      {reservation.product?.material && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Bookmark className="h-4 w-4" />
                          <span>المادة: {reservation.product.material}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-4 border-t border-slate-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(reservation)}
                      >
                        <Eye className="h-4 w-4 ml-2" />
                        عرض التفاصيل
                      </Button>
                      
                      {reservation.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApproveReservation(reservation._id)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4 ml-2" />
                            موافقة
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectReservation(reservation._id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 ml-2" />
                            رفض
                          </Button>
                        </>
                      )}
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(reservation)}
                      >
                        <Trash2 className="h-4 w-4 ml-2" />
                        حذف
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button 
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                السابق
              </Button>
              
              <span className="text-sm text-slate-600">
                صفحة {currentPage} من {totalPages}
              </span>
              
              <Button 
                variant="outline"
                onClick={() => {
                  setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === totalPages}
              >
                التالي
              </Button>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          <Dialog open={showDeleteDialog} onOpenChange={(open) => !open && !deleteReservationMutation.isPending && setShowDeleteDialog(false)}>
            <DialogContent className="max-w-2xl" dir="rtl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl text-red-600">
                  <AlertCircle className="h-6 w-6" />
                  تأكيد حذف الحجز
                </DialogTitle>
                <DialogDescription>
                  هل أنت متأكد من حذف هذا الحجز؟ لا يمكن التراجع عن هذا الإجراء.
                </DialogDescription>
              </DialogHeader>

              {reservationToDelete && (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      سيتم حذف هذا الحجز نهائياً ولا يمكن استرجاعه.
                    </AlertDescription>
                  </Alert>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">تفاصيل الحجز المراد حذفه</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Product Info */}
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                          <Bookmark className="h-4 w-4" />
                          معلومات المنتج
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-slate-600">اسم المنتج:</span>
                            <p className="font-medium">{reservationToDelete.product?.name || 'غير محدد'}</p>
                          </div>
                          {reservationToDelete.product?.material && (
                            <div>
                              <span className="text-slate-600">المادة:</span>
                              <p className="font-medium">{reservationToDelete.product.material}</p>
                            </div>
                          )}
                          {(reservationToDelete.product?.totalPrice?.usd || reservationToDelete.product?.totalPrice?.syp) && (
                            <div className="col-span-2">
                              <span className="text-slate-600">السعر:</span>
                              <p className="font-medium flex gap-2">
                                {reservationToDelete.product.totalPrice.usd > 0 && (
                                  <span>${reservationToDelete.product.totalPrice.usd.toLocaleString()} USD</span>
                                )}
                                {reservationToDelete.product.totalPrice.syp > 0 && (
                                  <span>{reservationToDelete.product.totalPrice.syp.toLocaleString()} ل.س</span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Customer Info */}
                      {reservationToDelete.customer && (
                        <div className="pt-3 border-t border-slate-200">
                          <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            معلومات العميل
                          </h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-slate-600">اسم المستخدم:</span>
                              <p className="font-medium">{reservationToDelete.customer.username || 'غير محدد'}</p>
                            </div>
                            {reservationToDelete.customer.email && (
                              <div>
                                <span className="text-slate-600">البريد الإلكتروني:</span>
                                <p className="font-medium">{reservationToDelete.customer.email}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Reservation Info */}
                      <div className="pt-3 border-t border-slate-200">
                        <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          معلومات الحجز
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-slate-600">تاريخ الحجز:</span>
                            <p className="font-medium">{formatDate(reservationToDelete.createdAt)}</p>
                          </div>
                          <div>
                            <span className="text-slate-600">الحالة:</span>
                            <Badge 
                              style={{ backgroundColor: getStatusColor(reservationToDelete.status) }}
                              className="text-white"
                            >
                              {getStatusText(reservationToDelete.status)}
                            </Badge>
                          </div>
                          {reservationToDelete.durationHours && (
                            <div>
                              <span className="text-slate-600">مدة الحجز:</span>
                              <p className="font-medium">{reservationToDelete.durationHours} ساعة</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!deleteReservationMutation.isPending) {
                      setShowDeleteDialog(false);
                      setReservationToDelete(null);
                    }
                  }}
                  disabled={deleteReservationMutation.isPending}
                >
                  إلغاء
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteReservation}
                  disabled={deleteReservationMutation.isPending}
                >
                  {deleteReservationMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      جاري الحذف...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 ml-2" />
                      حذف الحجز
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reservation Details Modal */}
          <Dialog open={showDetailsModal} onOpenChange={(open) => !open && setShowDetailsModal(false)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl">
                  <Bookmark className="h-6 w-6 text-primary" />
                  تفاصيل الحجز
                </DialogTitle>
                <DialogDescription>
                  معلومات كاملة عن الحجز
                </DialogDescription>
              </DialogHeader>

              {selectedReservation && (
                <div className="space-y-6">
                  {/* Product Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Bookmark className="h-5 w-5 text-primary" />
                        معلومات المنتج
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <Bookmark className="h-5 w-5 text-slate-400" />
                          <div className="flex-1">
                            <p className="text-sm text-slate-600">اسم المنتج</p>
                            <p className="font-semibold">{selectedReservation.product?.name || 'غير محدد'}</p>
                          </div>
                        </div>
                        {selectedReservation.product?.material && (
                          <div className="flex items-center gap-3">
                            <Gem className="h-5 w-5 text-slate-400" />
                            <div className="flex-1">
                              <p className="text-sm text-slate-600">المادة</p>
                              <p className="font-semibold">{selectedReservation.product.material}</p>
                            </div>
                          </div>
                        )}
                        {selectedReservation.product?.karat && (
                          <div className="flex items-center gap-3">
                            <Scale className="h-5 w-5 text-slate-400" />
                            <div className="flex-1">
                              <p className="text-sm text-slate-600">العيار</p>
                              <p className="font-semibold">{selectedReservation.product.karat}</p>
                            </div>
                          </div>
                        )}
                        {selectedReservation.product?.productType && (
                          <div className="flex items-center gap-3">
                            <Bookmark className="h-5 w-5 text-slate-400" />
                            <div className="flex-1">
                              <p className="text-sm text-slate-600">النوع</p>
                              <p className="font-semibold">{selectedReservation.product.productType}</p>
                            </div>
                          </div>
                        )}
                        {(selectedReservation.product?.totalPrice?.usd || selectedReservation.product?.totalPrice?.syp) && (
                          <div className="flex items-center gap-3 md:col-span-2">
                            <DollarSign className="h-5 w-5 text-slate-400" />
                            <div className="flex-1">
                              <p className="text-sm text-slate-600">السعر</p>
                              <div className="flex gap-4 mt-1">
                                {selectedReservation.product.totalPrice.usd > 0 && (
                                  <p className="font-semibold text-blue-700">
                                    ${selectedReservation.product.totalPrice.usd.toLocaleString()} USD
                                  </p>
                                )}
                                {selectedReservation.product.totalPrice.syp > 0 && (
                                  <p className="font-semibold text-green-700">
                                    {selectedReservation.product.totalPrice.syp.toLocaleString()} ل.س
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Customer Information */}
                  {selectedReservation.customer && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="h-5 w-5 text-primary" />
                          معلومات العميل
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-slate-400" />
                            <div className="flex-1">
                              <p className="text-sm text-slate-600">اسم المستخدم</p>
                              <p className="font-semibold">{selectedReservation.customer.username || 'غير محدد'}</p>
                            </div>
                          </div>
                          {selectedReservation.customer.email && (
                            <div className="flex items-center gap-3">
                              <Mail className="h-5 w-5 text-slate-400" />
                              <div className="flex-1">
                                <p className="text-sm text-slate-600">البريد الإلكتروني</p>
                                <p className="font-semibold">{selectedReservation.customer.email}</p>
                              </div>
                            </div>
                          )}
                          {selectedReservation.phone && (
                            <div className="flex items-center gap-3">
                              <Phone className="h-5 w-5 text-slate-400" />
                              <div className="flex-1">
                                <p className="text-sm text-slate-600">رقم الهاتف للتواصل</p>
                                <p className="font-semibold">{selectedReservation.phone}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Reservation Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        معلومات الحجز
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-slate-400" />
                          <div className="flex-1">
                            <p className="text-sm text-slate-600">تاريخ الحجز</p>
                            <p className="font-semibold">{formatDate(selectedReservation.createdAt)}</p>
                          </div>
                        </div>
                        {selectedReservation.durationHours && (
                          <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-slate-400" />
                            <div className="flex-1">
                              <p className="text-sm text-slate-600">مدة الحجز</p>
                              <p className="font-semibold">{selectedReservation.durationHours} ساعة</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-slate-400" />
                          <div className="flex-1">
                            <p className="text-sm text-slate-600">الحالة</p>
                            <Badge 
                              style={{ backgroundColor: getStatusColor(selectedReservation.status) }}
                              className="text-white"
                            >
                              {getStatusText(selectedReservation.status)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <DialogFooter>
                {selectedReservation?.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleApproveReservation(selectedReservation._id);
                        setShowDetailsModal(false);
                      }}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle className="h-4 w-4 ml-2" />
                      موافقة
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleRejectReservation(selectedReservation._id);
                        setShowDetailsModal(false);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 ml-2" />
                      رفض
                    </Button>
                  </>
                )}
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteClick(selectedReservation)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                >
                  <Trash2 className="h-4 w-4 ml-2" />
                  حذف
                </Button>
                <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                  إغلاق
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default ReservationsPage;
