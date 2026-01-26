import React, { useState } from 'react';
import { 
  Activity, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Server,
  Zap,
  Clock,
  TrendingUp,
  Info,
  Users,
  UserCheck,
  UserPlus,
  Eye
} from 'lucide-react';
import { useMonitoringStats, useVisitStatistics } from '../../hooks/useOwner';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';

const MonitoringDashboard = () => {
  const { data: stats, isLoading, error, refetch } = useMonitoringStats();
  const { data: visitStats, isLoading: visitStatsLoading } = useVisitStatistics();
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const handleRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  // Helper function to get memory status
  const getMemoryStatus = (rssMB) => {
    if (rssMB >= 450) {
      return { status: 'critical', color: 'red', text: 'حرج', icon: AlertTriangle };
    } else if (rssMB >= 400) {
      return { status: 'warning', color: 'yellow', text: 'تحذير', icon: AlertTriangle };
    }
    return { status: 'good', color: 'green', text: 'طبيعي', icon: CheckCircle };
  };

  // Helper function to get connection pool status
  const getConnectionStatus = (poolStats) => {
    if (!poolStats || poolStats.readyState !== 1) {
      return { status: 'error', color: 'red', text: 'غير متصل', icon: AlertTriangle };
    }
    const usagePercent = poolStats.poolSize > 0 
      ? Math.round((poolStats.activeConnections / poolStats.poolSize) * 100)
      : 0;
    
    if (usagePercent >= 80) {
      return { status: 'warning', color: 'yellow', text: 'قريب من الحد', icon: AlertTriangle };
    }
    return { status: 'good', color: 'green', text: 'طبيعي', icon: CheckCircle };
  };

  // Helper function to format memory percentage
  const getMemoryPercentage = (rssMB) => {
    const percentage = Math.round((rssMB / 512) * 100);
    return Math.min(percentage, 100); // Cap at 100%
  };

  // Loading state
  if (isLoading && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
        <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
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
                <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">فشل في تحميل البيانات</h3>
                <p className="text-slate-600 mb-4">حدث خطأ أثناء تحميل إحصائيات المراقبة</p>
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

  const memory = stats?.memory || {};
  const connectionPool = stats?.connectionPool || {};
  const slowQueries = stats?.slowQueries || {};
  const userStats = stats?.userStatistics || {};
  const rssMB = memory.rss || 0;
  const memoryStatus = getMemoryStatus(rssMB);
  const connectionStatus = getConnectionStatus(connectionPool);
  const memoryPercentage = getMemoryPercentage(rssMB);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
      <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-100">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">لوحة مراقبة النظام</h1>
                <p className="text-sm text-slate-600">مراقبة استخدام الموارد والأداء</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                آخر تحديث: {lastRefresh.toLocaleTimeString('ar-SA')}
              </span>
              <Button onClick={handleRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 ml-2" />
                تحديث
              </Button>
            </div>
          </div>

          {/* Status Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Memory Status */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="h-5 w-5 text-blue-600" />
                    استخدام الذاكرة
                  </CardTitle>
                  <Badge 
                    className={`${
                      memoryStatus.color === 'red' ? 'bg-red-100 text-red-800 border-red-300' :
                      memoryStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                      'bg-green-100 text-green-800 border-green-300'
                    }`}
                  >
                    {memoryStatus.text}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">الذاكرة المستخدمة</span>
                      <span className="text-lg font-bold text-slate-900">{rssMB} ميجابايت</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          memoryStatus.color === 'red' ? 'bg-red-500' :
                          memoryStatus.color === 'yellow' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${memoryPercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-500">0 ميجابايت</span>
                      <span className="text-xs text-slate-500">{memoryPercentage}% من الحد الأقصى (512 ميجابايت)</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                    <div>
                      <p className="text-xs text-slate-600 mb-1">الذاكرة الفعلية</p>
                      <p className="text-sm font-semibold text-slate-900">{memory.heapUsed || 0} م.ب</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">الذاكرة المخصصة</p>
                      <p className="text-sm font-semibold text-slate-900">{memory.heapTotal || 0} م.ب</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Database Connection Status */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="h-5 w-5 text-green-600" />
                    اتصالات قاعدة البيانات
                  </CardTitle>
                  <Badge 
                    className={`${
                      connectionStatus.color === 'red' ? 'bg-red-100 text-red-800 border-red-300' :
                      connectionStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                      'bg-green-100 text-green-800 border-green-300'
                    }`}
                  >
                    {connectionStatus.text}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">حالة الاتصال</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {connectionPool.readyStateText === 'connected' ? 'متصل' : 'غير متصل'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">الحد الأقصى للاتصالات</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {connectionPool.poolSize || 'غير متاح'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">الاتصالات النشطة</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {typeof connectionPool.activeConnections === 'number' ? connectionPool.activeConnections : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">الاتصالات المتاحة</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {typeof connectionPool.idleConnections === 'number' ? connectionPool.idleConnections : 'N/A'}
                    </span>
                  </div>
                  {typeof connectionPool.poolSize === 'number' && connectionPool.poolSize > 0 && typeof connectionPool.activeConnections === 'number' && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-600">نسبة الاستخدام</span>
                        <span className="text-xs font-semibold text-slate-900">
                          {Math.round((connectionPool.activeConnections / connectionPool.poolSize) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ 
                            width: `${Math.min((connectionPool.activeConnections / connectionPool.poolSize) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Slow Queries Status */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    استعلامات بطيئة
                  </CardTitle>
                  {slowQueries.criticalCount > 0 ? (
                    <Badge className="bg-red-100 text-red-800 border-red-300">
                      {slowQueries.criticalCount} حرجة
                    </Badge>
                  ) : slowQueries.total > 0 ? (
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                      {slowQueries.total} بطيئة
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      طبيعي
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">إجمالي الاستعلامات البطيئة</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {slowQueries.total || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">متوسط الوقت</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {slowQueries.averageDuration || 0} مللي ثانية
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">أطول استعلام</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {slowQueries.maxDuration || 0} مللي ثانية
                    </span>
                  </div>
                  {slowQueries.criticalCount > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs font-semibold">
                          {slowQueries.criticalCount} استعلام حرج يحتاج إلى مراجعة
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* User Statistics */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-600" />
                    إحصائيات المستخدمين
                  </CardTitle>
                  <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">
                    محدث
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">إجمالي المستخدمين</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {userStats.totalUsers || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">العملاء</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {userStats.byRole?.customers || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">المتحققون</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {userStats.byVerification?.verified || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">التسجيلات (7 أيام)</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {userStats.recentRegistrations || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Visit Statistics - Full Width Card Below Status Overview */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5 text-teal-600" />
                  إحصائيات الزيارات
                </CardTitle>
                <Badge className="bg-teal-100 text-teal-800 border-teal-300">
                  محدث
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {visitStatsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Today's Statistics */}
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-900">زيارات اليوم</span>
                      <span className="text-lg font-bold text-blue-600">
                        {visitStats?.today?.totalVisits || 0}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      إجمالي عدد الزيارات اليوم (يشمل الزيارات المتكررة)
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      زوار فريدون: {visitStats?.today?.uniqueVisitors || 0}
                    </p>
                  </div>

                  {/* This Month Statistics */}
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-900">هذا الشهر - زوار فريدون</span>
                      <span className="text-lg font-bold text-green-600">
                        {visitStats?.thisMonth?.uniqueVisitors || 0}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      عدد الزوار الفريدين (إذا زار نفس الزائر في أيام مختلفة، يُحسب في كل يوم)
                    </p>
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">إجمالي الزيارات (يشمل التكرار):</span>
                        <span className="text-sm font-bold text-slate-900">
                          {visitStats?.thisMonth?.totalVisits || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Last 30 Days */}
                  {visitStats?.last30Days && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-blue-900">آخر 30 يوم - زوار فريدون</span>
                        <span className="text-lg font-bold text-blue-600">
                          {visitStats.last30Days.uniqueVisitors || 0}
                        </span>
                      </div>
                      <p className="text-xs text-blue-700">
                        عدد الزوار الفريدين خلال آخر 30 يوم (كل زائر يُحسب مرة واحدة فقط حتى لو زار في أيام متعددة)
                      </p>
                      <p className="text-xs text-blue-600 mt-2 font-semibold">
                        الفرق: هذا الشهر يحسب نفس الزائر في كل يوم، آخر 30 يوم يحسبه مرة واحدة فقط
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Memory Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  تفاصيل الذاكرة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">الذاكرة المستخدمة (RSS)</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {memory.rss || 0} ميجابايت
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">الذاكرة الفعلية (Heap Used)</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {memory.heapUsed || 0} ميجابايت
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">الذاكرة المخصصة (Heap Total)</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {memory.heapTotal || 0} ميجابايت
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">الذاكرة الخارجية</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {memory.external || 0} ميجابايت
                    </span>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 text-slate-600">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs">
                        الحد الأقصى المسموح: 512 ميجابايت
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  صحة النظام
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {memoryStatus.icon === CheckCircle ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      )}
                      <span className="text-sm text-slate-600">حالة الذاكرة</span>
                    </div>
                    <Badge 
                      className={`${
                        memoryStatus.color === 'red' ? 'bg-red-100 text-red-800' :
                        memoryStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}
                    >
                      {memoryStatus.text}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {connectionStatus.icon === CheckCircle ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="text-sm text-slate-600">حالة قاعدة البيانات</span>
                    </div>
                    <Badge 
                      className={`${
                        connectionStatus.color === 'red' ? 'bg-red-100 text-red-800' :
                        connectionStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}
                    >
                      {connectionStatus.text}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">آخر تحديث</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {stats?.timestamp ? (() => {
                        const date = new Date(stats.timestamp);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        const seconds = String(date.getSeconds()).padStart(2, '0');
                        const hours24 = date.getHours();
                        const ampm = hours24 >= 12 ? 'م' : 'ص';
                        const hours12 = hours24 % 12 || 12;
                        return `${day}/${month}/${year} ${String(hours12).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
                      })() : 'غير متاح'}
                    </span>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Info className="h-4 w-4" />
                      <span className="text-xs">
                        يتم تحديث البيانات تلقائياً كل 30 ثانية
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Slow Queries Details (if any) */}
          {slowQueries.total > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  تفاصيل الاستعلامات البطيئة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 mb-4">
                    تم اكتشاف {slowQueries.total} استعلام بطيء. الاستعلامات البطيئة تزيد من تكلفة قاعدة البيانات.
                  </p>
                  {slowQueries.recentQueries && slowQueries.recentQueries.length > 0 && (
                    <div className="space-y-2">
                      {slowQueries.recentQueries.slice(0, 5).map((query, index) => (
                        <div key={index} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-900">
                              {query.collection || 'غير محدد'}
                            </span>
                            <Badge 
                              className={
                                query.durationMs >= 500 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {query.durationMs} مللي ثانية
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600">
                            العملية: {query.operation || 'غير محدد'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Statistics Details */}
          {userStats.totalUsers > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  تفاصيل المستخدمين
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs text-slate-600">إجمالي المستخدمين</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{userStats.totalUsers || 0}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-slate-600">العملاء</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{userStats.byRole?.customers || 0}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-slate-600">المتحققون</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{userStats.byVerification?.verified || 0}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <UserPlus className="h-4 w-4 text-purple-600" />
                      <span className="text-xs text-slate-600">جدد (7 أيام)</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{userStats.recentRegistrations || 0}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">طريقة التسجيل</p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">Google</span>
                        <span className="text-sm font-semibold text-slate-900">{userStats.byAuthMethod?.google || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">البريد الإلكتروني</span>
                        <span className="text-sm font-semibold text-slate-900">
                          {(userStats.totalUsers || 0) - (userStats.byAuthMethod?.google || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">حالة التحقق</p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">متحقق</span>
                        <span className="text-sm font-semibold text-slate-900">{userStats.byVerification?.verified || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">غير متحقق</span>
                        <span className="text-sm font-semibold text-slate-900">
                          {(userStats.totalUsers || 0) - (userStats.byVerification?.verified || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Information Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">معلومات مهمة</h3>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>الذاكرة: إذا تجاوزت 400 ميجابايت، قد تحتاج إلى تحسينات</li>
                    <li>الاتصالات: الحد الأقصى 40 اتصال متزامن (كافي لـ 50 مستخدم متزامن)</li>
                    <li>الاستعلامات البطيئة: أي استعلام أطول من 100 مللي ثانية يتم تسجيله</li>
                    <li>إحصائيات المستخدمين: يتم تحديثها كل 5 دقائق (مخزنة مؤقتاً)</li>
                    <li>إحصائيات الزيارات: يتم تحديثها كل 5 دقائق (مخزنة مؤقتاً)</li>
                    <li>يتم تحديث البيانات تلقائياً كل 30 ثانية</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;

