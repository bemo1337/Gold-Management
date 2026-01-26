import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Save, RefreshCw, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useMaterialPrices, useUpdateMaterialPrice } from '../../hooks/useOwner';

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';


const MaterialPriceManager = () => {
  const [isManualMode, setIsManualMode] = useState(false); // وضع التعديل (تلقائي/يدوي)
  
  // الأسعار الأساسية (للوضع التلقائي)
  const [karat21PriceUSD, setKarat21PriceUSD] = useState(0);
  const [karat21PriceSYP, setKarat21PriceSYP] = useState(0);
  
  // الأسعار اليدوية (للوضع اليدوي)
  const [karat18ManualUSD, setKarat18ManualUSD] = useState(0);
  const [karat18ManualSYP, setKarat18ManualSYP] = useState(0);
  const [karat21ManualUSD, setKarat21ManualUSD] = useState(0);
  const [karat21ManualSYP, setKarat21ManualSYP] = useState(0);
  const [karat24ManualUSD, setKarat24ManualUSD] = useState(0);
  const [karat24ManualSYP, setKarat24ManualSYP] = useState(0);
  
  const [inputUSD, setInputUSD] = useState('');
  const [inputSYP, setInputSYP] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // React Query hooks with caching
  const { data: materialPricesData, isLoading: loading, refetch: refetchPrices } = useMaterialPrices();
  const updateMaterialPriceMutation = useUpdateMaterialPrice();

  // حساب أسعار العيارات (تلقائياً أو يدوياً)
  let karat18PriceUSD, karat21FinalUSD, karat24PriceUSD;
  let karat18PriceSYP, karat21FinalSYP, karat24PriceSYP;

  if (isManualMode) {
    // الوضع اليدوي - استخدام القيم اليدوية
    karat18PriceUSD = karat18ManualUSD;
    karat21FinalUSD = karat21ManualUSD;
    karat24PriceUSD = karat24ManualUSD;
    karat18PriceSYP = karat18ManualSYP;
    karat21FinalSYP = karat21ManualSYP;
    karat24PriceSYP = karat24ManualSYP;
  } else {
    // الوضع التلقائي - الحساب من عيار 21 بدون هامش
    karat18PriceUSD = (karat21PriceUSD * 18) / 21;
    karat24PriceUSD = (karat21PriceUSD * 24) / 21;
    karat21FinalUSD = karat21PriceUSD;
    
    karat18PriceSYP = (karat21PriceSYP * 18) / 21;
    karat24PriceSYP = (karat21PriceSYP * 24) / 21;
    karat21FinalSYP = karat21PriceSYP;
  }

  // دالة لتنسيق الأرقام بالفاصلة العشرية (للدولار)
  const formatNumberWithCommas = (number) => {
    return number.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // دالة لتنسيق أرقام الليرة السورية بالفواصل
  const formatSYP = (number) => {
    return number.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // دالة لتنسيق الأرقام بالفواصل (للليرة السورية)
  const formatWithCommas = (value) => {
    // إزالة كل شيء ما عدا الأرقام والنقطة
    const numStr = value.replace(/[^\d.]/g, '');
    
    // فصل الجزء الصحيح عن العشري
    const parts = numStr.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    // إضافة الفواصل للجزء الصحيح
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // إرجاع الرقم مع الجزء العشري إن وجد
    return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  };

  // دالة لإزالة الفواصل من الرقم
  const removeCommas = (value) => {
    return value.replace(/,/g, '');
  };

  // Process material prices data when it loads
  useEffect(() => {
    if (materialPricesData) {
      // البيانات تأتي كـ array من MaterialPrice objects
      // نبحث عن الذهب
      const goldData = Array.isArray(materialPricesData) 
        ? materialPricesData.find(item => item.material === 'ذهب') 
        : null;
      
      if (goldData && goldData.goldKaratPrices) {
        // تحديد الوضع (تلقائي أو يدوي)
        setIsManualMode(goldData.isManualPricing || false);
        
        // تحميل سعر عيار 21 بالدولار (للوضع التلقائي)
        if (goldData.pricePerGram) {
          const usdPrice = goldData.pricePerGram.usd || 0;
          setKarat21PriceUSD(usdPrice);
          setInputUSD(usdPrice.toString());
          
          // تحميل سعر عيار 21 بالليرة
          const sypPrice = goldData.pricePerGram.syp || 0;
          setKarat21PriceSYP(sypPrice);
          // تنسيق القيمة بالفواصل
          const formatted = sypPrice.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          });
          setInputSYP(formatted);
        }
        
        // تحميل الأسعار اليدوية (إذا كانت موجودة)
        if (goldData.goldKaratPrices['18']) {
          setKarat18ManualUSD(goldData.goldKaratPrices['18'].usd || 0);
          setKarat18ManualSYP(goldData.goldKaratPrices['18'].syp || 0);
        }
        if (goldData.goldKaratPrices['21']) {
          setKarat21ManualUSD(goldData.goldKaratPrices['21'].usd || 0);
          setKarat21ManualSYP(goldData.goldKaratPrices['21'].syp || 0);
        }
        if (goldData.goldKaratPrices['24']) {
          setKarat24ManualUSD(goldData.goldKaratPrices['24'].usd || 0);
          setKarat24ManualSYP(goldData.goldKaratPrices['24'].syp || 0);
        }
      }
    }
  }, [materialPricesData]);

  const savePrices = async () => {
    setSaving(true);
    
    try {
      let priceData;
      
      if (isManualMode) {
        // الوضع اليدوي - إرسال الأسعار اليدوية مباشرة
        priceData = {
          material: 'ذهب',
          isManual: true,
          manualPrices: {
            '18': { usd: karat18ManualUSD, syp: karat18ManualSYP },
            '21': { usd: karat21ManualUSD, syp: karat21ManualSYP },
            '24': { usd: karat24ManualUSD, syp: karat24ManualSYP }
          }
        };
      } else {
        // الوضع التلقائي - إرسال سعر عيار 21
        priceData = {
          material: 'ذهب',
          karat: '21',
          isManual: false,
          pricePerGram: {
            usd: karat21PriceUSD,
            syp: karat21PriceSYP
          }
        };
      }

      // حفظ الأسعار
      await updateMaterialPriceMutation.mutateAsync(priceData);
      showMessage('تم حفظ الأسعار بنجاح، جاري تحديث جميع المنتجات...', 'success');
      
      // تحديث أسعار جميع منتجات الذهب
      const { authenticatedFetch } = await import('../../utils/auth');
      const updateResponse = await authenticatedFetch('/api/material-prices/update-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ material: 'ذهب' })
      });
      
      if (updateResponse.ok) {
        const updateResult = await updateResponse.json();
        
        if (updateResult.updatedCount === 0) {
          showMessage('تم حفظ الأسعار، لكن لا توجد منتجات ذهب لتحديثها', 'success');
        } else {
          const totalMsg = updateResult.totalProducts ? ` من ${updateResult.totalProducts}` : '';
          const skippedMsg = updateResult.skippedCount > 0 ? ` (تم تخطي ${updateResult.skippedCount})` : '';
          showMessage(`تم تحديث جميع المنتجات بنجاح! ${updateResult.updatedCount}${totalMsg} منتج${skippedMsg}`, 'success');
        }
      } else {
        const errorData = await updateResponse.json();
        if (process.env.NODE_ENV === 'development') {
          console.error('Update error:', errorData);
        }
        showMessage(errorData.message || 'تم حفظ الأسعار لكن فشل تحديث المنتجات', 'error');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error saving material prices:', error);
      }
      showMessage('خطأ في الاتصال بالخادم: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000); // زيادة الوقت إلى 5 ثواني للرسائل المفصلة
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
      <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-slate-900">إدارة أسعار المواد</h1>
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          {message && (
            <Alert variant={messageType === 'error' ? 'destructive' : 'default'} className={messageType === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}>
              <div className="flex items-center gap-2">
                {messageType === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{message}</AlertDescription>
              </div>
            </Alert>
          )}

          {/* Main Price Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-yellow-600" />
                    سعر الذهب
                  </CardTitle>
                  <CardDescription className="mt-1">
                    إدارة أسعار الذهب بالدولار والليرة السورية
                  </CardDescription>
                </div>
                <Tabs value={isManualMode ? 'manual' : 'auto'} onValueChange={(val) => setIsManualMode(val === 'manual')}>
                  <TabsList>
                    <TabsTrigger value="auto" className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      تلقائي
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      يدوي
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
          
              {/* الوضع التلقائي */}
              {!isManualMode && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="karat21-usd" className="text-sm font-semibold">
                        سعر عيار 21 الأساسي (USD)
                      </Label>
                      <Input
                        id="karat21-usd"
                        type="text"
                        value={inputUSD}
                        onChange={(e) => {
                          const value = e.target.value;
                          setInputUSD(value);
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue)) {
                            setKarat21PriceUSD(numValue);
                          } else if (value === '' || value === '-') {
                            setKarat21PriceUSD(0);
                          }
                        }}
                        onBlur={(e) => {
                          const numValue = parseFloat(e.target.value) || 0;
                          setKarat21PriceUSD(numValue);
                          setInputUSD(numValue.toString());
                        }}
                        placeholder="أدخل سعر عيار 21 بالدولار"
                        inputMode="decimal"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="karat21-syp" className="text-sm font-semibold">
                        سعر عيار 21 الأساسي (SYP)
                      </Label>
                      <Input
                        id="karat21-syp"
                        type="text"
                        value={inputSYP}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^[\d,.-]*$/.test(value)) {
                            const cleanValue = removeCommas(value);
                            const formattedValue = formatWithCommas(value);
                            setInputSYP(formattedValue);
                            const numValue = parseFloat(cleanValue);
                            if (!isNaN(numValue)) {
                              setKarat21PriceSYP(numValue);
                            } else if (cleanValue === '' || cleanValue === '-') {
                              setKarat21PriceSYP(0);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const cleanValue = removeCommas(e.target.value);
                          const numValue = parseFloat(cleanValue) || 0;
                          setKarat21PriceSYP(numValue);
                          const formatted = numValue.toLocaleString('en-US', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                          });
                          setInputSYP(formatted);
                        }}
                        placeholder="أدخل سعر عيار 21 بالليرة"
                        inputMode="decimal"
                      />
                    </div>
                  </div>
                </div>
              )}
            
              {/* الوضع اليدوي */}
              {isManualMode && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-4">إدخال الأسعار يدوياً لكل عيار</h4>
                  </div>
                  
                  {/* عيار 18 */}
                  <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">عيار 18</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>السعر (USD)</Label>
                          <Input
                            type="text"
                            value={karat18ManualUSD || ''}
                            onChange={(e) => setKarat18ManualUSD(parseFloat(e.target.value) || 0)}
                            placeholder="أدخل سعر عيار 18"
                            inputMode="decimal"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>السعر (SYP)</Label>
                          <Input
                            type="text"
                            value={karat18ManualSYP || ''}
                            onChange={(e) => setKarat18ManualSYP(parseFloat(removeCommas(e.target.value)) || 0)}
                            placeholder="أدخل سعر عيار 18"
                            inputMode="decimal"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* عيار 21 */}
                  <Card className="border-yellow-300 bg-yellow-50/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge className="bg-yellow-600">21</Badge>
                        عيار 21
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>السعر (USD)</Label>
                          <Input
                            type="text"
                            value={karat21ManualUSD || ''}
                            onChange={(e) => setKarat21ManualUSD(parseFloat(e.target.value) || 0)}
                            placeholder="أدخل سعر عيار 21"
                            inputMode="decimal"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>السعر (SYP)</Label>
                          <Input
                            type="text"
                            value={karat21ManualSYP || ''}
                            onChange={(e) => setKarat21ManualSYP(parseFloat(removeCommas(e.target.value)) || 0)}
                            placeholder="أدخل سعر عيار 21"
                            inputMode="decimal"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* عيار 24 */}
                  <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">عيار 24</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>السعر (USD)</Label>
                          <Input
                            type="text"
                            value={karat24ManualUSD || ''}
                            onChange={(e) => setKarat24ManualUSD(parseFloat(e.target.value) || 0)}
                            placeholder="أدخل سعر عيار 24"
                            inputMode="decimal"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>السعر (SYP)</Label>
                          <Input
                            type="text"
                            value={karat24ManualSYP || ''}
                            onChange={(e) => setKarat24ManualSYP(parseFloat(removeCommas(e.target.value)) || 0)}
                            placeholder="أدخل سعر عيار 24"
                            inputMode="decimal"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            
              {/* عرض الأسعار النهائية */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-slate-900">
                  {isManualMode ? 'الأسعار المدخلة يدوياً' : 'الأسعار المحسوبة تلقائياً'}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* عيار 18 */}
                  <Card className="border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-slate-600 text-white text-base px-3 py-1">18</Badge>
                        <span className="font-semibold text-slate-700">عيار 18</span>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-slate-600">USD</div>
                        <div className="text-xl font-bold text-blue-700">{formatNumberWithCommas(karat18PriceUSD)} USD</div>
                        <div className="text-sm text-slate-600 mt-3">SYP</div>
                        <div className="text-xl font-bold text-green-700">{formatSYP(karat18PriceSYP)} SYP</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* عيار 21 */}
                  <Card className="border-yellow-300 bg-gradient-to-br from-yellow-50 to-yellow-100">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-yellow-600 text-white text-base px-3 py-1">21</Badge>
                        <span className="font-semibold text-slate-700">عيار 21</span>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-slate-600">USD</div>
                        <div className="text-xl font-bold text-blue-700">{formatNumberWithCommas(karat21FinalUSD)} USD</div>
                        <div className="text-sm text-slate-600 mt-3">SYP</div>
                        <div className="text-xl font-bold text-green-700">{formatSYP(karat21FinalSYP)} SYP</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* عيار 24 */}
                  <Card className="border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-slate-600 text-white text-base px-3 py-1">24</Badge>
                        <span className="font-semibold text-slate-700">عيار 24</span>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-slate-600">USD</div>
                        <div className="text-xl font-bold text-blue-700">{formatNumberWithCommas(karat24PriceUSD)} USD</div>
                        <div className="text-sm text-slate-600 mt-3">SYP</div>
                        <div className="text-xl font-bold text-green-700">{formatSYP(karat24PriceSYP)} SYP</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* معلومات إضافية */}
              <Alert className={isManualMode ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {isManualMode ? (
                    <>
                      <strong>الوضع اليدوي:</strong> يمكنك إدخال أسعار مختلفة لكل عيار بشكل مستقل. الأسعار التي تدخلها سيتم تطبيقها مباشرة على جميع المنتجات.
                    </>
                  ) : (
                    <>
                      <strong>انتبه:</strong> هنالك فرق بين الحساب التلقائي وسعر النقابة. السعر التلقائي مبني على العملية الرياضية لاستخراج أسعار باقي العيارات.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button 
              variant="outline"
              size="lg"
              onClick={() => refetchPrices()}
              disabled={loading}
              className="flex items-center gap-2 min-w-[180px]"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            
            <Button 
              size="lg"
              onClick={savePrices}
              disabled={saving}
              className="flex items-center gap-2 min-w-[180px] bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  حفظ الأسعار
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialPriceManager;
