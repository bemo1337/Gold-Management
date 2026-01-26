import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageCircle, 
  TrendingUp, 
  Star, 
  BarChart3, 
  Package
} from 'lucide-react';
import { useOwnerStatistics } from '../../hooks/useOwner';

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';

const StatisticsPanel = () => {
  // eslint-disable-next-line no-unused-vars
  const [detailedStats, setDetailedStats] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // React Query hook with caching
  const { data: statistics, isLoading: loading, refetch: fetchStatistics } = useOwnerStatistics();


  const getMaterialColor = (material) => {
    switch (material) {
      case 'ذهب':
      case 'gold':
        return '#FCD34D';
      case 'فضة':
      case 'silver':
        return '#9CA3AF';
      case 'ألماس':
      case 'diamond':
        return '#A855F7';
      default:
        return '#6B7280';
    }
  };

  const getMaterialBadgeClass = (material) => {
    switch (material) {
      case 'ذهب':
      case 'gold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'فضة':
      case 'silver':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'ألماس':
      case 'diamond':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getMaterialIcon = (material) => {
    switch (material) {
      case 'ذهب':
      case 'gold':
        return '🟡';
      case 'فضة':
      case 'silver':
        return '⚪';
      case 'ألماس':
      case 'diamond':
        return '💎';
      default:
        return '📦';
    }
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
        <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  <h1 className="text-2xl font-bold text-slate-900">إحصائيات المنتجات</h1>
                </div>
              </div>
            </div>

            {/* Error State */}
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-16 w-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">فشل في تحميل الإحصائيات</h3>
                <p className="text-slate-600 mb-4">حدث خطأ أثناء تحميل البيانات</p>
                <Button onClick={fetchStatistics}>
                  <BarChart3 className="h-4 w-4 ml-2" />
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
                <h1 className="text-2xl font-bold text-slate-900">إحصائيات المنتجات</h1>
              </div>
            </div>
          </div>

          {/* Overall Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm text-slate-600 mb-1 truncate">إجمالي المنتجات</p>
                    <p className="text-xl md:text-3xl font-bold text-slate-900">
                      {statistics.overallStats?.totalProducts || 0}
                    </p>
                  </div>
                  <div className="p-2 md:p-3 rounded-full bg-blue-100 flex-shrink-0">
                    <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm text-slate-600 mb-1 truncate">إجمالي الإعجابات</p>
                    <p className="text-xl md:text-3xl font-bold text-slate-900">
                      {statistics.overallStats?.totalLikes || 0}
                    </p>
                  </div>
                  <div className="p-2 md:p-3 rounded-full bg-red-100 flex-shrink-0">
                    <Heart className="h-5 w-5 md:h-6 md:w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm text-slate-600 mb-1 truncate">إجمالي التعليقات</p>
                    <p className="text-xl md:text-3xl font-bold text-slate-900">
                      {statistics.overallStats?.totalComments || 0}
                    </p>
                  </div>
                  <div className="p-2 md:p-3 rounded-full bg-green-100 flex-shrink-0">
                    <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm text-slate-600 mb-1 truncate">المنتجات المثبتة</p>
                    <p className="text-xl md:text-3xl font-bold text-slate-900">
                      {statistics.overallStats?.pinnedProducts || 0}
                    </p>
                  </div>
                  <div className="p-2 md:p-3 rounded-full bg-yellow-100 flex-shrink-0">
                    <Star className="h-5 w-5 md:h-6 md:w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                النشاط الأخير (7 أيام)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4">
                <div className="text-center p-3 md:p-4 bg-blue-50 rounded-lg">
                  <p className="text-xl md:text-2xl font-bold text-blue-700">
                    {statistics.overallStats?.recentProducts || 0}
                  </p>
                  <p className="text-xs md:text-sm text-slate-600 mt-1 truncate">منتجات جديدة</p>
                </div>
                <div className="text-center p-3 md:p-4 bg-red-50 rounded-lg">
                  <p className="text-xl md:text-2xl font-bold text-red-700">
                    {statistics.overallStats?.recentLikes || 0}
                  </p>
                  <p className="text-xs md:text-sm text-slate-600 mt-1 truncate">إعجابات جديدة</p>
                </div>
                <div className="text-center p-3 md:p-4 bg-green-50 rounded-lg">
                  <p className="text-xl md:text-2xl font-bold text-green-700">
                    {statistics.overallStats?.recentComments || 0}
                  </p>
                  <p className="text-xs md:text-sm text-slate-600 mt-1 truncate">تعليقات جديدة</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Material Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                إحصائيات المواد
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statistics.materialStats && Object.keys(statistics.materialStats).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(statistics.materialStats).map(([material, stats]) => (
                    <Card key={material} className="border-2" style={{ borderColor: getMaterialColor(material) }}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <span className="text-2xl">{getMaterialIcon(material)}</span>
                            {material}
                          </CardTitle>
                          <Badge className={getMaterialBadgeClass(material)}>
                            {stats.count} منتج
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                            <span className="text-sm text-slate-600">الإعجابات</span>
                            <span className="font-semibold text-red-600 flex items-center gap-1">
                              <Heart className="h-4 w-4" />
                              {stats.likes}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                            <span className="text-sm text-slate-600">التعليقات</span>
                            <span className="font-semibold text-green-600 flex items-center gap-1">
                              <MessageCircle className="h-4 w-4" />
                              {stats.comments}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Package className="h-16 w-16 text-slate-300 mb-4" />
                  <p className="text-slate-600">لا توجد إحصائيات للمواد بعد</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product Details Dialog */}
      <Dialog open={showDetails} onOpenChange={(open) => !open && setShowDetails(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <BarChart3 className="h-6 w-6 text-primary" />
              تفاصيل المنتج
            </DialogTitle>
            <DialogDescription>
              إحصائيات مفصلة عن المنتج
            </DialogDescription>
          </DialogHeader>

          {detailedStats && (
            <div className="space-y-6">
              {/* Product Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{detailedStats.product.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">المادة</p>
                      <p className="font-semibold">{detailedStats.product.material}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">السعر</p>
                      <p className="font-semibold">
                        ${detailedStats.product.totalPrice?.usd || 0} / {detailedStats.product.totalPrice?.syp || 0} ل.س
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-red-200">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-red-600" />
                      <CardTitle className="text-lg">الإعجابات</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-red-600">{detailedStats.stats.totalLikes}</p>
                    <p className="text-sm text-slate-600 mt-2">آخر 30 يوم: {detailedStats.stats.recentLikes}</p>
                  </CardContent>
                </Card>

                <Card className="border-green-200">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-lg">التعليقات</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">{detailedStats.stats.totalComments}</p>
                    <p className="text-sm text-slate-600 mt-2">آخر 30 يوم: {detailedStats.stats.recentComments}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Comments List */}
              {detailedStats.comments && detailedStats.comments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">آخر التعليقات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {detailedStats.comments.map((comment) => (
                        <Card key={comment._id} className="bg-slate-50">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-slate-900">
                                {comment.user?.username || 'مستخدم'}
                              </span>
                              <span className="text-xs text-slate-500">
                                {new Date(comment.createdAt).toLocaleDateString('ar-SA')}
                              </span>
                            </div>
                            <p className="text-slate-700">{comment.content}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StatisticsPanel;
