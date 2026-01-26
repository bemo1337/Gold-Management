import React, { useState } from 'react';
import { 
  Users, 
  Lock, 
  Unlock, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Mail,
  User
} from 'lucide-react';
import { useLockedUsers, useUnlockUser } from '../../hooks/useOwner';
import { toast } from '../../utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';

const UserManagement = () => {
  const { data, isLoading, error, refetch } = useLockedUsers();
  const unlockUser = useUnlockUser();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [unlockingUserId, setUnlockingUserId] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [userToUnlock, setUserToUnlock] = useState(null);

  const handleRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  const handleUnlockClick = (userId, username) => {
    setUserToUnlock({ userId, username });
    setConfirmDialogOpen(true);
  };

  const handleUnlockConfirm = async () => {
    if (!userToUnlock) return;

    setUnlockingUserId(userToUnlock.userId);
    setConfirmDialogOpen(false);
    
    try {
      await unlockUser.mutateAsync(userToUnlock.userId);
      toast.success(`تم فك قفل حساب المستخدم "${userToUnlock.username}" بنجاح`);
      // Success - list will auto-refresh via query invalidation
    } catch (err) {
      toast.error(err.message || 'فشل فك قفل المستخدم');
    } finally {
      setUnlockingUserId(null);
      setUserToUnlock(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'غير محدد';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ar-SA', {
        timeZone: 'Asia/Riyadh',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return dateString;
    }
  };

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
        <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
        <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">فشل في تحميل البيانات</h3>
                <p className="text-slate-600 mb-4">{error.message || 'حدث خطأ أثناء تحميل قائمة المستخدمين المقفلين'}</p>
                <Button onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 ml-2" />
                  إعادة المحاولة
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const lockedUsers = data?.lockedUsers || [];
  const count = data?.count || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
      <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-100">
                <Lock className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">إدارة المستخدمين المقفلين</h1>
                <p className="text-sm text-slate-600">عرض وفك قفل حسابات المستخدمين المقفلين</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-lg px-3 py-1">
                {count} حساب مقفل
              </Badge>
              <span className="text-xs text-slate-500">
                آخر تحديث: {lastRefresh.toLocaleTimeString('ar-SA')}
              </span>
              <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
            </div>
          </div>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                الإحصائيات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Lock className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">الحسابات المقفلة</p>
                    <p className="text-2xl font-bold text-red-600">{count}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">في انتظار فك القفل</p>
                    <p className="text-2xl font-bold text-blue-600">{count}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">حالة النظام</p>
                    <p className="text-lg font-semibold text-green-600">نشط</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Locked Users List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-700" />
                قائمة المستخدمين المقفلين
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lockedUsers.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">لا توجد حسابات مقفلة</h3>
                  <p className="text-slate-600">جميع حسابات المستخدمين نشطة وغير مقفلة</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">المستخدم</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">البريد الإلكتروني</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">محاولات فاشلة</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">فك القفل في</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lockedUsers.map((user) => (
                        <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-slate-100 rounded-lg">
                                <User className="h-4 w-4 text-slate-600" />
                              </div>
                              <span className="font-medium text-slate-900">{user.username}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-600">{user.email}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="destructive" className="font-semibold">
                              {user.failedAttempts || 0}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-600 text-sm">{user.unlockTime || formatDate(user.lockedUntil)}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Button
                              onClick={() => handleUnlockClick(user._id, user.username)}
                              disabled={unlockingUserId === user._id || unlockUser.isPending}
                              variant="outline"
                              size="sm"
                              className="gap-2"
                            >
                              {unlockingUserId === user._id ? (
                                <>
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                  جاري...
                                </>
                              ) : (
                                <>
                                  <Unlock className="h-4 w-4" />
                                  فك القفل
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Success message after unlock */}
          {unlockUser.isSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                تم فك قفل المستخدم بنجاح
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-orange-600" />
              تأكيد فك قفل الحساب
            </DialogTitle>
            <DialogDescription className="text-slate-600 pt-2">
              هل أنت متأكد من فك قفل حساب المستخدم "{userToUnlock?.username}"؟
              <br />
              <span className="text-sm text-slate-500 mt-2 block">
                سيتمكن المستخدم من تسجيل الدخول فوراً بعد فك القفل.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0" dir="rtl">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false);
                setUserToUnlock(null);
              }}
              disabled={unlockingUserId !== null}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleUnlockConfirm}
              disabled={unlockingUserId !== null || !userToUnlock}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {unlockingUserId ? (
                <>
                  <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                  جاري فك القفل...
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 ml-2" />
                  تأكيد فك القفل
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;

