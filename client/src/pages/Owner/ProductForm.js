import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Upload, Trash2, Loader2 } from 'lucide-react';
import DiamondFields from './DiamondFields';
import ProductTypeFields from './ProductTypeFields';
import { getOptimizedImageUrl } from '../../utils/cloudinary';
import { authenticatedFetch } from '../../utils/auth';
import { toast } from '../../utils/toast';
import { getOwnerPath } from '../../config/adminConfig';

// shadcn components
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
// import { Alert, AlertDescription } from '../../components/ui/alert'; // Unused
import { Checkbox } from '../../components/ui/checkbox';

// Magic UI components
import { ShimmerButton } from '../../components/ui/shimmer-button';


const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(isEditMode);

  const [formData, setFormData] = useState({
    name: '',
    material: '', // was 'gold', now empty for placeholder
    productType: '', // was 'ring', now empty for placeholder
    description: '',
    carat: '', // was '18', now empty for placeholder
    weight: 0,
    craftingFee: 0,
    craftingFeeUSD: 0,
    pricePerGramUSD: 0,
    pricePerGramSYP: 0,
    totalPriceUSD: 0,
    totalPriceSYP: 0,
    images: [],
    isPinned: false,
    isSpecial: false,
    sizes: [],
    setComponents: [],
    diamonds: [],
  });

  const [diamondData, setDiamondData] = useState({
    stones: [],
    totalStoneWeight: 0,
    totalStonePrice: 0,
  });

  // تحديد المنتجات التي تستخدم "أجار القطعة" بدلاً من "أجار الغرام"
  const pieceBasedProducts = ['lira', 'half-lira', 'quarter-lira', 'ounce'];

  // التحقق من نوع المنتج
  const isPieceBasedProduct = pieceBasedProducts.includes(formData.productType);

  // دالة تنسيق الأرقام مع فواصل الآلاف
  const formatNumber = (number) => {
    if (number === null || number === undefined || number === '') return '';
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // دالة إزالة فواصل الآلاف من النص
  const parseFormattedNumber = (formattedString) => {
    if (!formattedString) return 0;
    return parseFloat(formattedString.replace(/,/g, '')) || 0;
  };

  // دالة تنسيق الأرقام مع فواصل الآلاف والفاصلة العشرية
  // eslint-disable-next-line no-unused-vars
  const formatDecimalWithCommas = (number) => {
    if (number === null || number === undefined || number === '') return '';
    const num = parseFloat(number);
    if (isNaN(num)) return '';
    
    // تقسيم الرقم إلى جزء صحيح وكسري
    const parts = num.toString().split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] || '';
    
    // إضافة فواصل الآلاف للجزء الصحيح
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // إعادة تجميع مع الفاصلة العشرية
    return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  };

  // دالة إزالة التنسيق من الأرقام مع فواصل الآلاف والفاصلة العشرية
  const parseFormattedDecimalWithCommas = (formattedString) => {
    if (!formattedString) return 0;
    return parseFloat(formattedString.replace(/,/g, '')) || 0;
  };

  // دالة للتحقق من صحة إدخال الأرقام مع الفواصل
  const isValidNumberInput = (value) => {
    // السماح بـ: أرقام، فواصل الآلاف، فاصلة عشرية واحدة، نقطة عشرية
    return value === '' || /^[\d,]*\.?\d*$/.test(value);
  };

  // Fetch product data if editing
  useEffect(() => {
    if (isEditMode && id) {
      const fetchProduct = async () => {
        setFetchingProduct(true);
        try {
          const res = await authenticatedFetch(`/api/products/${id}`);
          if (res.ok) {
            const product = await res.json();
            setFormData({
              name: product.name || '',
              material: Object.keys(materialMap).find(key => materialMap[key] === product.material) || product.material || 'gold',
              productType: Object.keys(productTypeMap).find(key => productTypeMap[key] === product.productType) || product.productType || 'ring',
              description: product.description || '',
              carat: product.karat || product.carat || '18',
              weight: product.weight || 0,
              craftingFee: product.gramWage || product.craftingFee || 0,
              craftingFeeUSD: product.craftingFeeUSD || 0,
              pricePerGramUSD: (product.gramPrice && product.gramPrice.usd) || product.pricePerGramUSD || 0,
              pricePerGramSYP: (product.gramPrice && product.gramPrice.syp) || product.pricePerGramSYP || 0,
              totalPriceUSD: (product.totalPrice && product.totalPrice.usd) || product.totalPriceUSD || 0,
              totalPriceSYP: (product.totalPrice && product.totalPrice.syp) || product.totalPriceSYP || 0,
              images: product.images || [],
              isPinned: product.pinned || product.isPinned || false,
              isSpecial: product.special || product.isSpecial || false,
              sizes: product.ringSizes || product.sizes || [],
              setComponents: (product.setAccessories || product.setComponents || []).map(comp => {
                // Map Arabic backend values to English frontend values
                const reverseComponentMap = {
                  'خاتم': 'ring',
                  'سوار': 'bracelet',
                  'أقراط': 'earring',
                  'قلادة': 'necklace'
                };
                return reverseComponentMap[comp] || comp;
              }),
              diamonds: product.stones || product.diamonds || [],
            });
            if (product.stones || product.diamonds) {
              const stones = product.stones || product.diamonds || [];
              setDiamondData({
                stones: stones,
                totalStoneWeight: stones.reduce((sum, stone) => sum + (stone.weight || stone.totalWeight || 0), 0),
                totalStonePrice: stones.reduce((sum, stone) => sum + ((stone.totalPrice && (stone.totalPrice.usd || stone.totalPrice)) || 0), 0),
              });
            }
          } else {
            toast.error('فشل تحميل المنتج');
            navigate(getOwnerPath('dashboard'));
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching product:', error);
          }
          toast.error('حدث خطأ أثناء تحميل المنتج');
          navigate(getOwnerPath('dashboard'));
        } finally {
          setFetchingProduct(false);
        }
      };
      fetchProduct();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditMode, navigate]);

  // Auto-calculation of total price based on product type
  useEffect(() => {
    const weight = parseFloat(formData.weight) || 0;
    const pricePerGramUSD = parseFloat(formData.pricePerGramUSD) || 0;
    const pricePerGramSYP = formData.pricePerGramSYP || 0;
    const craftingFeeUSD = parseFloat(formData.craftingFeeUSD) || 0;
    const craftingFeeSYP = formData.craftingFee || 0;
    // const carat = parseFloat(formData.carat) || 0; // Unused

    let totalPriceUSD, totalPriceSYP;

    if (isPieceBasedProduct) {
      // للمنتجات القائمة على القطعة: (الوزن × سعر الغرام) + أجار القطعة
      totalPriceUSD = (weight * pricePerGramUSD) + craftingFeeUSD;
      totalPriceSYP = (weight * pricePerGramSYP) + craftingFeeSYP;
    } else {
      // للمنتجات العادية: (سعر الغرام + أجار الصياغة) × الوزن
      totalPriceUSD = (pricePerGramUSD + craftingFeeUSD) * weight;
      totalPriceSYP = (pricePerGramSYP + craftingFeeSYP) * weight;
    }

    setFormData(prev => ({
      ...prev,
      totalPriceUSD: Math.round(totalPriceUSD * 100) / 100, // Round to 2 decimal places
      totalPriceSYP: Math.round(totalPriceSYP * 100) / 100
    }));
  }, [formData.weight, formData.pricePerGramUSD, formData.pricePerGramSYP, formData.craftingFeeUSD, formData.craftingFee, formData.carat, isPieceBasedProduct]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate: At least one image is required
      if (!formData.images || formData.images.length === 0) {
        toast.error('يجب إضافة صورة واحدة على الأقل للمنتج');
        setLoading(false);
        return;
      }

      // Map frontend fields to backend schema
      let ringSizes = [];
      let setAccessories = [];
      const mappedType = productTypeMap[formData.productType] || formData.productType;
      if (mappedType === 'محبس' || mappedType === 'خاتم') {
        ringSizes = formData.sizes || [];
      } else if (mappedType === 'طقم') {
        // Map English component values to Arabic backend values
        const componentMap = {
          'ring': 'خاتم',
          'bracelet': 'سوار',
          'earring': 'أقراط',
          'necklace': 'قلادة'
        };
        setAccessories = (formData.setComponents || []).map(comp => componentMap[comp] || comp);
        if (setAccessories.includes('خاتم') || formData.setComponents?.includes('ring')) {
          ringSizes = formData.sizes || [];
        }
      }
      const productData = {
        name: formData.name,
        material: materialMap[formData.material] || formData.material,
        stones: (formData.material === 'diamond' ? diamondData.stones : []).map(stone => ({
          type: stone.type,
          color: stone.color,
          count: stone.count,
          caratPrice: {
            usd: stone.caratPriceUSD || 0,
            syp: stone.caratPriceSYP || 0,
          },
          totalPrice: {
            usd: stone.totalPriceUSD || 0,
            syp: stone.totalPriceSYP || 0,
          },
          totalWeight: stone.weight || 0,
        })),
        productType: mappedType,
        ringSizes,
        setAccessories,
        description: formData.description,
        karat: formData.carat,
        weight: formData.weight,
        gramWage: formData.craftingFee,
        craftingFeeUSD: formData.craftingFeeUSD || 0,
        gramPrice: {
          usd: formData.pricePerGramUSD || 0,
          syp: formData.pricePerGramSYP || 0,
        },
        pricePerGramUSD: formData.pricePerGramUSD || 0,
        pricePerGramSYP: formData.pricePerGramSYP || 0,
        totalPrice: {
          usd: formData.totalPriceUSD || 0,
          syp: formData.totalPriceSYP || 0,
        },
        totalPriceUSD: formData.totalPriceUSD || 0,
        totalPriceSYP: formData.totalPriceSYP || 0,
        pinned: formData.isPinned,
        special: formData.isSpecial,
        images: formData.images || [],
        sizes: formData.sizes || [],
        setComponents: formData.setComponents || [],
        diamonds: formData.diamonds || [],
      };

      let res;
      // If there are images, use FormData
      if (formData.images && formData.images.some(img => img instanceof File)) {
        const form = new FormData();
        Object.keys(productData).forEach(key => {
          form.append(key, typeof productData[key] === 'object' ? JSON.stringify(productData[key]) : productData[key]);
        });
        formData.images.forEach(file => {
          if (file instanceof File) {
            form.append('images', file);
          }
        });

        res = await authenticatedFetch(
          isEditMode ? `/api/products/${id}` : '/api/products',
          {
            method: isEditMode ? 'PUT' : 'POST',
            body: form,
          }
        );
      } else {
        res = await authenticatedFetch(
          isEditMode ? `/api/products/${id}` : '/api/products',
          {
            method: isEditMode ? 'PUT' : 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData),
          }
        );
      }

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.message || (isEditMode ? 'فشل تحديث المنتج' : 'فشل حفظ المنتج'));
        return;
      }

      toast.success(isEditMode ? 'تم تحديث المنتج بنجاح' : 'تم إضافة المنتج بنجاح');
      navigate(getOwnerPath('dashboard'));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error saving product:', error);
      }
      toast.error('حدث خطأ أثناء حفظ المنتج');
    } finally {
      setLoading(false);
    }
  };

  // Image compression function for faster uploads
  const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    
    // Compress images for faster upload
    const compressedFiles = await Promise.all(
      files.map(async (file) => {
        if (file.size > 1024 * 1024) { // Only compress files > 1MB
          const compressed = await compressImage(file);
          return new File([compressed], file.name, { type: 'image/jpeg' });
        }
        return file;
      })
    );
    
    setFormData(prev => ({
      ...prev,
      images: [...(prev.images || []), ...compressedFiles]
    }));
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images && prev.images.filter((_, i) => i !== index)
    }));
  };

  const productTypes = [
    { value: 'ring', label: 'خاتم' },
    { value: 'sized-ring', label: 'محبس' },
    { value: 'name', label: 'اسم' },
    { value: 'earring', label: 'حلق' },
    { value: 'bracelet', label: 'اسوارة' },
    { value: 'necklace', label: 'طوق' },
    { value: 'set', label: 'طقم' },
    { value: 'anklet', label: 'خلخال' },
    { value: 'lira', label: 'ليرة' },
    { value: 'half-lira', label: 'نصف ليرة' },
    { value: 'quarter-lira', label: 'ربع ليرة' },
    { value: 'ounce', label: 'أونصة' },
  ];

  const materialMap = {
    gold: 'ذهب',
    silver: 'فضة',
    diamond: 'ألماس',
  };

  const productTypeMap = {
    ring: 'خاتم',
    'sized-ring': 'محبس',
    necklace: 'طوق',
    name: 'اسم',
    earring: 'حلق',
    bracelet: 'اسوارة',
    set: 'طقم',
    anklet: 'خلخال',
    lira: 'ليرة',
    'half-lira': 'نصف ليرة',
    'quarter-lira': 'ربع ليرة',
    ounce: 'أونصة',
  };

  if (fetchingProduct) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
        <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
          <Card className="max-w-4xl mx-auto">
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">جاري تحميل المنتج...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
      <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
        <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
              {isEditMode ? 'تعديل المنتج' : 'إضافة منتج جديد'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* المعلومات الأساسية */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="required">
                  اسم المنتج
                </Label>
                <Input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="required">
                  مادة المنتج
                </Label>
                <Select
                  required
                  value={formData.material}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, material: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر مادة المنتج" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">ذهب</SelectItem>
                    <SelectItem value="silver">فضة</SelectItem>
                    <SelectItem value="diamond">ألماس</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

        {/* Diamond Fields */}
        {formData.material === 'diamond' && (
          <DiamondFields
            data={diamondData}
            onChange={setDiamondData}
          />
        )}

            {/* Product Type */}
            <div className="space-y-2">
              <Label className="required">
                نوع المنتج
              </Label>
              <Select
                required
                value={formData.productType}
                onValueChange={(newType) => {
                  setFormData(prev => ({
                    ...prev,
                    productType: newType,
                    sizes: newType === 'sized-ring' ? prev.sizes : [], // clear sizes if not sized-ring
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع المنتج" />
                </SelectTrigger>
                <SelectContent>
                  {productTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

        {/* Product Type Specific Fields */}
        {formData.productType === 'set' ? (
          <ProductTypeFields
            productType={formData.productType}
            sizes={formData.sizes || []}
            setComponents={formData.setComponents || []}
            onSizesChange={(sizes) => setFormData(prev => ({ ...prev, sizes }))}
            onSetComponentsChange={(components) => setFormData(prev => ({ ...prev, setComponents: components }))}
          />
        ) : (
          // Show ringSizes field for certain product types
          (formData.productType === 'sized-ring' ||
            formData.productType === 'ring' ||
            (formData.productType === 'set' && formData.setComponents && formData.setComponents.includes('ring'))
          ) && (
            <div className="space-y-2">
              <Label>
                مقاسات الخاتم (افصل المقاسات بفاصلة)
              </Label>
              <Input
                type="text"
                value={formData.sizes ? formData.sizes.join(',') : ''}
                onChange={e => {
                  const sizes = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  setFormData(prev => ({ ...prev, sizes }));
                }}
                placeholder="مثال: 6, 7, 8, 9"
              />
            </div>
          )
        )}

            {/* Description */}
            <div className="space-y-2">
              <Label>
                وصف المنتج
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="أدخل وصف المنتج..."
              />
            </div>

            {/* Carat and Weight */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="required">
                  العيار
                </Label>
                <Select
                  required
                  value={formData.carat}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, carat: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العيار" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="18">18</SelectItem>
                    <SelectItem value="21">21</SelectItem>
                    <SelectItem value="22">22</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="925">925 (فضة)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="required">
                  الوزن (غرام)
                </Label>
                <Input
                  type="text"
                  required
                  value={formData.weight || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setFormData(prev => ({ ...prev, weight: value }));
                    }
                  }}
                  onBlur={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setFormData(prev => ({ ...prev, weight: value }));
                  }}
                  placeholder="0.00"
                  inputMode="decimal"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  {isPieceBasedProduct ? 'أجار القطعة (ليرة)' : 'أجار الصياغة (ليرة)'}
                </Label>
                <Input
                  type="text"
                  value={formatNumber(formData.craftingFee || 0)}
                  onChange={(e) => setFormData(prev => ({ ...prev, craftingFee: parseFormattedNumber(e.target.value) }))}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  {isPieceBasedProduct ? 'أجار القطعة (دولار)' : 'أجار الصياغة (دولار)'}
                </Label>
                <Input
                  type="text"
                  value={formData.craftingFeeUSD || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isValidNumberInput(value)) {
                      setFormData(prev => ({ ...prev, craftingFeeUSD: value }));
                    }
                  }}
                  onBlur={(e) => {
                    const value = parseFormattedDecimalWithCommas(e.target.value);
                    setFormData(prev => ({ ...prev, craftingFeeUSD: value }));
                  }}
                  onFocus={(e) => {
                    const value = e.target.value.replace(/,/g, '');
                    setFormData(prev => ({ ...prev, craftingFeeUSD: value }));
                  }}
                  placeholder="0.00"
                  inputMode="decimal"
                />
              </div>
            </div>

            {/* Pricing - Show for all products */}
            <Card className="bg-slate-50">
              <CardHeader>
                <CardTitle className="text-lg">الأسعار</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="required">سعر الغرام (دولار)</Label>
                    <Input
                      type="text"
                      required
                      value={formData.pricePerGramUSD || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (isValidNumberInput(value)) {
                          setFormData(prev => ({ ...prev, pricePerGramUSD: value }));
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseFormattedDecimalWithCommas(e.target.value);
                        setFormData(prev => ({ ...prev, pricePerGramUSD: value }));
                      }}
                      onFocus={(e) => {
                        const value = e.target.value.replace(/,/g, '');
                        setFormData(prev => ({ ...prev, pricePerGramUSD: value }));
                      }}
                      placeholder="0.00"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="required">سعر الغرام (ليرة)</Label>
                    <Input
                      type="text"
                      required
                      value={formatNumber(formData.pricePerGramSYP)}
                      onChange={(e) => setFormData(prev => ({ ...prev, pricePerGramSYP: parseFormattedNumber(e.target.value) }))}
                      placeholder="0"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <Label className="text-sm font-semibold text-slate-600">السعر الإجمالي (يُحسب تلقائياً)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">السعر الإجمالي (دولار)</Label>
                      <Input
                        type="text"
                        value={formData.totalPriceUSD || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (isValidNumberInput(value)) {
                            setFormData(prev => ({ ...prev, totalPriceUSD: value }));
                          }
                        }}
                        onBlur={(e) => {
                          const value = parseFormattedDecimalWithCommas(e.target.value);
                          setFormData(prev => ({ ...prev, totalPriceUSD: value }));
                        }}
                        onFocus={(e) => {
                          const value = e.target.value.replace(/,/g, '');
                          setFormData(prev => ({ ...prev, totalPriceUSD: value }));
                        }}
                        placeholder="0.00"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">السعر الإجمالي (ليرة)</Label>
                      <Input
                        type="text"
                        value={formatNumber(formData.totalPriceSYP)}
                        onChange={(e) => setFormData(prev => ({ ...prev, totalPriceSYP: parseFormattedNumber(e.target.value) }))}
                        readOnly
                        className="bg-slate-100"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  <Label className="required">صور المنتج</Label>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-slate-50 transition-colors">
                    <Upload className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                    <span className="text-slate-600 font-medium">انقر لاختيار الصور</span>
                    <p className="text-sm text-slate-500 mt-1">يمكنك اختيار عدة صور</p>
                  </div>
                </label>
                {formData.images && formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden border border-slate-200">
                          <img
                            src={
                              image instanceof File
                                ? URL.createObjectURL(image)
                                : getOptimizedImageUrl(image.url || image, { width: 200, height: 200, crop: 'fill' })
                            }
                            alt={`Product ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* خيار التثبيت */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <Checkbox
                    id="pin-product"
                    checked={formData.isPinned}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPinned: !!checked }))}
                  />
                  <Label htmlFor="pin-product" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                    تثبيت المنتج في أعلى الموقع
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Special Product Checkbox */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <Checkbox
                    id="special-product"
                    checked={formData.isSpecial}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isSpecial: !!checked }))}
                  />
                  <Label htmlFor="special-product" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                    منتج خاص (يمكن حجزه مرة واحدة فقط)
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* أزرار الإجراءات */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200">
              <ShimmerButton type="submit" className="flex items-center gap-2" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEditMode ? 'تحديث المنتج' : 'إضافة المنتج'}
                  </>
                )}
              </ShimmerButton>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default ProductForm; 
