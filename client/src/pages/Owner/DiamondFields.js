import React, { useState } from 'react';
import { Plus, X, Diamond } from 'lucide-react';


const DiamondFields = ({ data, onChange }) => {
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
  const [showAddStone, setShowAddStone] = useState(false);
  const [newStone, setNewStone] = useState({
    type: 'FL',
    color: 'D',
    count: 1,
    caratPriceUSD: 0,
    caratPriceSYP: 0,
    totalPriceUSD: 0,
    totalPriceSYP: 0,
    weight: 0,
  });

  const stoneTypes = [
    'FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3'
  ];

  const stoneColors = [
    'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
  ];

  const addStone = () => {
    const stone = {
      id: Date.now().toString(),
      type: newStone.type,
      color: newStone.color,
      count: newStone.count,
      caratPriceUSD: newStone.caratPriceUSD,
      caratPriceSYP: newStone.caratPriceSYP,
      totalPriceUSD: newStone.totalPriceUSD !== undefined && newStone.totalPriceUSD !== null
        ? newStone.totalPriceUSD
        : newStone.count * newStone.caratPriceUSD,
      totalPriceSYP: newStone.totalPriceSYP !== undefined && newStone.totalPriceSYP !== null
        ? newStone.totalPriceSYP
        : newStone.count * newStone.caratPriceSYP,
      weight: newStone.weight,
    };

    const updatedStones = [...data.stones, stone];
    const updatedData = {
      stones: updatedStones,
      totalStoneWeight: updatedStones.reduce((sum, s) => sum + s.weight, 0),
      totalStonePrice: updatedStones.reduce((sum, s) => sum + s.totalPrice, 0),
    };

    onChange(updatedData);
    setNewStone({
      type: 'FL',
      color: 'D',
      count: 1,
      caratPriceUSD: 0,
      caratPriceSYP: 0,
      totalPriceUSD: 0,
      totalPriceSYP: 0,
      weight: 0,
    });
    setShowAddStone(false);
  };

  const removeStone = (id) => {
    const updatedStones = data.stones.filter(stone => stone.id !== id);
    const updatedData = {
      stones: updatedStones,
      totalStoneWeight: updatedStones.reduce((sum, s) => sum + s.weight, 0),
      totalStonePrice: updatedStones.reduce((sum, s) => sum + s.totalPrice, 0),
    };
    onChange(updatedData);
  };

  const updateStone = (id, field, value) => {
    const updatedStones = data.stones.map(stone => {
      if (stone.id === id) {
        const updatedStone = { ...stone, [field]: value };
        if (field === 'totalPriceUSD' || field === 'totalPriceSYP') {
          // Use the manually entered value
        } else if (field === 'count' || field === 'caratPriceUSD') {
          updatedStone.totalPriceUSD = updatedStone.totalPriceUSD !== undefined && updatedStone.totalPriceUSD !== null
            ? updatedStone.totalPriceUSD
            : updatedStone.count * updatedStone.caratPriceUSD;
        } else if (field === 'count' || field === 'caratPriceSYP') {
          updatedStone.totalPriceSYP = updatedStone.totalPriceSYP !== undefined && updatedStone.totalPriceSYP !== null
            ? updatedStone.totalPriceSYP
            : updatedStone.count * updatedStone.caratPriceSYP;
        }
        return updatedStone;
      }
      return stone;
    });

    const updatedData = {
      stones: updatedStones,
      totalStoneWeight: updatedStones.reduce((sum, s) => sum + s.weight, 0),
      totalStonePrice: updatedStones.reduce((sum, s) => sum + s.totalPrice, 0),
    };
    onChange(updatedData);
  };

  return (
    <div className="border border-slate-200 rounded-lg p-6 bg-gradient-to-br from-slate-50 to-white space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md">
            <Diamond className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">تفاصيل الأحجار الكريمة</h3>
        </div>
      </div>

      {/* Existing Stones */}
      {data.stones.map((stone) => (
        <div key={stone.id} className="border border-slate-200 rounded-lg p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
            <h4 className="text-lg font-semibold text-slate-900">
              حجر {stone.type} - {stone.color}
            </h4>
            <button
              onClick={() => removeStone(stone.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="حذف الحجر"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                نوع الحجر
              </label>
              <select
                value={stone.type}
                onChange={(e) => updateStone(stone.id, 'type', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {stoneTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                لون الحجر
              </label>
              <select
                value={stone.color}
                onChange={(e) => updateStone(stone.id, 'color', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {stoneColors.map(color => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                العدد
              </label>
              <input
                type="text"
                value={formatNumber(stone.count)}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^[\d,]*$/.test(value)) {
                    updateStone(stone.id, 'count', parseFormattedNumber(value));
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="0"
                inputMode="numeric"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                سعر القيراط (دولار)
              </label>
              <input
                type="text"
                value={stone.caratPriceUSD || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isValidNumberInput(value)) {
                    updateStone(stone.id, 'caratPriceUSD', value);
                  }
                }}
                onBlur={(e) => {
                  const value = parseFormattedDecimalWithCommas(e.target.value);
                  updateStone(stone.id, 'caratPriceUSD', value);
                }}
                onFocus={(e) => {
                  const value = e.target.value.replace(/,/g, '');
                  updateStone(stone.id, 'caratPriceUSD', value);
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="0.00"
                inputMode="decimal"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                سعر القيراط (ليرة)
              </label>
              <input
                type="text"
                value={formatNumber(stone.caratPriceSYP)}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^[\d,]*$/.test(value)) {
                    updateStone(stone.id, 'caratPriceSYP', parseFormattedNumber(value));
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="0"
                inputMode="numeric"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                الوزن (قيراط)
              </label>
              <input
                type="text"
                value={stone.weight || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    updateStone(stone.id, 'weight', value);
                  }
                }}
                onBlur={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  updateStone(stone.id, 'weight', value);
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="0.00"
                inputMode="decimal"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                السعر الإجمالي (دولار)
              </label>
              <input
                type="text"
                value={stone.totalPriceUSD || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isValidNumberInput(value)) {
                    updateStone(stone.id, 'totalPriceUSD', value);
                  }
                }}
                onBlur={(e) => {
                  const value = parseFormattedDecimalWithCommas(e.target.value);
                  updateStone(stone.id, 'totalPriceUSD', value);
                }}
                onFocus={(e) => {
                  const value = e.target.value.replace(/,/g, '');
                  updateStone(stone.id, 'totalPriceUSD', value);
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="0.00"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                السعر الإجمالي (ليرة)
              </label>
              <input
                type="text"
                value={formatNumber(stone.totalPriceSYP)}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^[\d,]*$/.test(value)) {
                    updateStone(stone.id, 'totalPriceSYP', parseFormattedNumber(value));
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="0"
                inputMode="numeric"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add New Stone */}
      {showAddStone && (
        <div className="border border-slate-200 rounded-lg p-5 bg-gradient-to-br from-blue-50 to-purple-50 shadow-md">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">إضافة حجر جديد</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                نوع الحجر
              </label>
              <select
                value={newStone.type}
                onChange={(e) => setNewStone(prev => ({ ...prev, type: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {stoneTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                لون الحجر
              </label>
              <select
                value={newStone.color}
                onChange={(e) => setNewStone(prev => ({ ...prev, color: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {stoneColors.map(color => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                العدد
              </label>
              <input
                type="text"
                value={formatNumber(newStone.count)}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^[\d,]*$/.test(value)) {
                    setNewStone(prev => ({ ...prev, count: parseFormattedNumber(value) }));
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="0"
                inputMode="numeric"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">سعر القيراط (دولار)</label>
              <input
                type="text"
                value={newStone.caratPriceUSD || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isValidNumberInput(value)) {
                    setNewStone(prev => ({ ...prev, caratPriceUSD: value }));
                  }
                }}
                onBlur={(e) => {
                  const value = parseFormattedDecimalWithCommas(e.target.value);
                  setNewStone(prev => ({ ...prev, caratPriceUSD: value }));
                }}
                onFocus={(e) => {
                  const value = e.target.value.replace(/,/g, '');
                  setNewStone(prev => ({ ...prev, caratPriceUSD: value }));
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="0.00"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">سعر القيراط (ليرة)</label>
              <input
                type="text"
                value={formatNumber(newStone.caratPriceSYP)}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^[\d,]*$/.test(value)) {
                    setNewStone(prev => ({ ...prev, caratPriceSYP: parseFormattedNumber(value) }));
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="0"
                inputMode="numeric"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                الوزن (قيراط)
              </label>
              <input
                type="text"
                value={newStone.weight || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setNewStone(prev => ({ ...prev, weight: value }));
                  }
                }}
                onBlur={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setNewStone(prev => ({ ...prev, weight: value }));
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="0.00"
                inputMode="decimal"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                السعر الإجمالي (دولار)
              </label>
              <input
                type="text"
                value={newStone.totalPriceUSD || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isValidNumberInput(value)) {
                    setNewStone(prev => ({ ...prev, totalPriceUSD: value }));
                  }
                }}
                onBlur={(e) => {
                  const value = parseFormattedDecimalWithCommas(e.target.value);
                  setNewStone(prev => ({ ...prev, totalPriceUSD: value }));
                }}
                onFocus={(e) => {
                  const value = e.target.value.replace(/,/g, '');
                  setNewStone(prev => ({ ...prev, totalPriceUSD: value }));
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="0.00"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                السعر الإجمالي (ليرة)
              </label>
              <input
                type="text"
                value={formatNumber(newStone.totalPriceSYP)}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^[\d,]*$/.test(value)) {
                    setNewStone(prev => ({ ...prev, totalPriceSYP: parseFormattedNumber(value) }));
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="0"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowAddStone(false)}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              إلغاء
            </button>
            <button
              onClick={addStone}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              إضافة الحجر
            </button>
          </div>
        </div>
      )}

      {/* Add Stone Button */}
      <button
        onClick={() => setShowAddStone(true)}
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 h-11 px-6 py-2 shadow-md hover:shadow-lg transition-all"
      >
        <Plus className="h-5 w-5" />
        <span>إضافة حجر جديد</span>
      </button>

      {/* Summary */}
      {data.stones.length > 0 && (
        <div className="border border-slate-200 rounded-lg p-5 bg-gradient-to-br from-slate-50 to-white mt-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">ملخص الأحجار</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-slate-600">العدد الإجمالي:</span>
              <span className="text-lg font-bold text-slate-900">
                {data.stones.reduce((sum, stone) => sum + (stone.count || 0), 0)}
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-slate-600">الوزن الإجمالي:</span>
              <span className="text-lg font-bold text-slate-900">
                {data.stones.reduce((sum, stone) => sum + (stone.weight || 0), 0).toFixed(2)} قيراط
              </span>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-slate-600">السعر الإجمالي:</span>
              <div className="flex flex-col gap-1">
                <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200">
                  {data.stones.reduce((sum, stone) => sum + (stone.totalPriceUSD || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
                <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-green-50 text-green-700 border-green-200">
                  {data.stones.reduce((sum, stone) => sum + (stone.totalPriceSYP || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ل.س
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiamondFields; 
