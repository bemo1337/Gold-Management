import React, { useState, useEffect } from 'react';
import { getOptimizedImageUrl } from '../../utils/cloudinary';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import {
  Eye,
  Users,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Activity,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { authenticatedFetch } from '../../utils/auth';
import { toast } from '../../utils/toast';

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';

const MarketInsights = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedFetch('/api/statistics/dashboard');

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'خطأ في تحميل البيانات');
        toast.error(errorData.message || 'خطأ في تحميل البيانات');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching dashboard data:', error);
      }
      setError('خطأ في الاتصال بالخادم');
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    toast.info('ميزة التصدير قيد التطوير');
  };

  const formatNumber = (num) => {
    return num ? num.toLocaleString('ar-SA') : '0';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-slate-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
        <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
        <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  <h1 className="text-2xl font-bold text-slate-900">تحليل السوق</h1>
                </div>
              </div>
            </div>

            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">خطأ في تحميل البيانات</h3>
                <p className="text-slate-600 mb-4">{error}</p>
                <Button onClick={fetchDashboardData}>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
      <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-slate-900">تحليل السوق</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExportData}>
                <Download className="h-4 w-4 ml-2" />
                تصدير البيانات
              </Button>
              <Button variant="outline" onClick={fetchDashboardData}>
                <RefreshCw className="h-4 w-4 ml-2" />
                تحديث
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">إجمالي الزيارات</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {formatNumber(dashboardData?.summary?.totalVisits)}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                      {getTrendIcon('up')}
                      <span>+12%</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">مشاهدات المنتجات</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {formatNumber(dashboardData?.summary?.totalProductViews)}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                      {getTrendIcon('up')}
                      <span>+8%</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100">
                    <Eye className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">زوار فريدون</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {formatNumber(dashboardData?.summary?.totalUniqueVisitors)}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-slate-600 text-sm">
                      {getTrendIcon('stable')}
                      <span>0%</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-full bg-green-100">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">إجمالي التفاعلات</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {formatNumber(dashboardData?.summary?.totalInteractions)}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                      {getTrendIcon('up')}
                      <span>+15%</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-full bg-orange-100">
                    <Activity className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peak Hours Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">أوقات الذروة للزيارات</CardTitle>
                <p className="text-sm text-slate-600">توزيع الزيارات على ساعات اليوم</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData?.peakHours || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value) => [formatNumber(value), 'زيارات']}
                      labelStyle={{ color: '#333' }}
                    />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Daily Visits Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">الزيارات اليومية</CardTitle>
                <p className="text-sm text-slate-600">تطور عدد الزيارات خلال الفترة المحددة</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboardData?.dailyVisits || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value) => [formatNumber(value), 'زيارات']}
                      labelStyle={{ color: '#333' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="totalVisits" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Interactions Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">معدل التفاعل</CardTitle>
              <p className="text-sm text-slate-600">تطور اللايكات والتعليقات خلال الفترة المحددة</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData?.interactions || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value, name) => [
                      formatNumber(value), 
                      name === 'likes' ? 'لايكات' : name === 'comments' ? 'تعليقات' : 'إجمالي'
                    ]}
                    labelStyle={{ color: '#333' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="likes" 
                    stroke="#ff7300" 
                    strokeWidth={2}
                    dot={{ fill: '#ff7300', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="comments" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Products Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">المنتجات الأكثر مشاهدة</CardTitle>
              <p className="text-sm text-slate-600">أكثر 10 منتجات تمت مشاهدتها خلال الفترة المحددة</p>
            </CardHeader>
            <CardContent>
              {dashboardData?.topProducts && dashboardData.topProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {dashboardData.topProducts.slice(0, 10).map((product, index) => (
                    <Card key={product.productId} className="hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-primary text-primary-foreground">#{index + 1}</Badge>
                        </div>
                        <div className="aspect-square w-full mb-3 bg-slate-100 rounded-lg overflow-hidden">
                          {product.productImage ? (
                            <img 
                              src={getOptimizedImageUrl(product.productImage, { width: 300, height: 300, crop: 'fill', quality: 'auto', fetch_format: 'auto' })} 
                              alt={product.productName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                if (product.productImage && product.productImage !== e.target.src) {
                                  e.target.src = product.productImage;
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                              لا توجد صورة
                            </div>
                          )}
                        </div>
                        <h4 className="font-semibold text-sm mb-1 line-clamp-2">{product.productName}</h4>
                        <p className="text-xs text-slate-500 mb-2">{product.productCategory}</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1 text-slate-600">
                            <Eye className="h-3 w-3" />
                            <span>{formatNumber(product.viewCount)} مشاهدة</span>
                          </div>
                          <div className="text-slate-600">
                            {formatNumber(product.uniqueViewers)} زائر فريد
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Eye className="h-16 w-16 text-slate-300 mb-4" />
                  <p className="text-slate-600">لا توجد بيانات للمنتجات الأكثر مشاهدة</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MarketInsights;
