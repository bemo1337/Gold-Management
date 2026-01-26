import React, { useState, useEffect } from 'react';
import { Plus, X, Edit3 } from 'lucide-react';

const ProductTypeFields = ({
  productType,
  sizes,
  setComponents,
  onSizesChange,
  onSetComponentsChange,
}) => {
  const [showAddSize, setShowAddSize] = useState(false);
  const [newSize, setNewSize] = useState('');
  const [editingSize, setEditingSize] = useState(null);
  const [ringSizesInput, setRingSizesInput] = useState('');

  // Initialize ringSizesInput from sizes when sizes change (for set product type)
  useEffect(() => {
    if (productType === 'set' && sizes && sizes.length > 0) {
      setRingSizesInput(sizes.join(', '));
    } else if (productType === 'set' && (!sizes || sizes.length === 0)) {
      setRingSizesInput('');
    }
  }, [productType, sizes]);

  const availableSetComponents = [
    { value: 'ring', label: 'خاتم', icon: '💍' },
    { value: 'bracelet', label: 'سوار', icon: '⌚' },
    { value: 'earring', label: 'أقراط', icon: '💎' },
    { value: 'necklace', label: 'قلادة', icon: '📿' },
  ];

  const addSize = () => {
    if (newSize.trim()) {
      onSizesChange([...sizes, newSize.trim()]);
      setNewSize('');
      setShowAddSize(false);
    }
  };

  const removeSize = (index) => {
    onSizesChange(sizes.filter((_, i) => i !== index));
  };

  const updateSize = (index, value) => {
    const updatedSizes = sizes.map((size, i) => i === index ? value : size);
    onSizesChange(updatedSizes);
    setEditingSize(null);
  };

  const toggleSetComponent = (component) => {
    const isSelected = setComponents.includes(component);
    if (isSelected) {
      onSetComponentsChange(setComponents.filter(c => c !== component));
    } else {
      onSetComponentsChange([...setComponents, component]);
    }
  };

  // Show size input for both 'ring' and 'sized-ring'
  if (productType === 'ring' || productType === 'sized-ring') {
    return (
      <div className="product-type-fields-container">
        <div className="product-type-header">
          <Edit3 className="product-type-icon" />
          <h3 className="product-type-title">مقاسات الخاتم / المحبس</h3>
        </div>
        
        {/* Existing Sizes */}
        <div className="ring-sizes-section">
          <div className="ring-sizes-grid">
            {sizes.map((size, index) => (
              <div key={index} className="ring-size-item">
                {editingSize?.index === index ? (
                  <div className="flex items-center space-x-reverse space-x-2 w-full">
                    <input
                      type="text"
                      value={editingSize.value}
                      onChange={(e) => setEditingSize({ index, value: e.target.value })}
                      className="ring-size-edit"
                      onBlur={() => updateSize(index, editingSize.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          updateSize(index, editingSize.value);
                        }
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <>
                    <span
                      className="ring-size-text"
                      onClick={() => setEditingSize({ index, value: size })}
                    >
                      {size}
                    </span>
                    <button
                      onClick={() => removeSize(index)}
                      className="ring-size-remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Add Size */}
        {showAddSize && (
          <div className="add-size-section">
            <div className="flex items-center space-x-reverse space-x-2">
              <input
                type="text"
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                placeholder="أدخل المقاس الجديد"
                className="add-size-input"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addSize();
                  }
                }}
              />
              <button
                onClick={addSize}
                className="add-size-button"
              >
                إضافة
              </button>
              <button
                onClick={() => {
                  setShowAddSize(false);
                  setNewSize('');
                }}
                className="cancel-size-button"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
        
        <button
          onClick={() => setShowAddSize(true)}
          className="add-new-size-button"
        >
          <Plus className="h-5 w-5" />
          <span>إضافة مقاس جديد</span>
        </button>
      </div>
    );
  }

  // For 'set', if 'ring' is selected as a set component, show size input for the ring
  if (productType === 'set') {
    const handleRingSizesChange = (e) => {
      const inputValue = e.target.value;
      setRingSizesInput(inputValue); // Keep raw input for user to see while typing
    };

    const handleRingSizesBlur = () => {
      // Process the input when user leaves the field
      const newSizes = ringSizesInput.split(',').map(s => s.trim()).filter(Boolean);
      onSizesChange(newSizes);
      // Update input to show cleaned version with proper spacing
      setRingSizesInput(newSizes.join(', '));
    };

    return (
      <div className="product-type-fields-container">
        <div className="product-type-header">
          <Edit3 className="product-type-icon" />
          <h3 className="product-type-title">مكونات الطقم</h3>
          <p className="text-sm text-gray-500 mt-1">اختر المكونات التي يتضمنها الطقم</p>
        </div>
        
        <div className="set-components-section">
          <div className="set-components-grid">
            {availableSetComponents.map((component) => {
              const isSelected = setComponents.includes(component.value);
              return (
                <div 
                  key={component.value} 
                  className={`set-component-card ${isSelected ? 'set-component-selected' : ''}`}
                  onClick={() => toggleSetComponent(component.value)}
                >
                  <div className="set-component-checkbox-wrapper">
                    <input
                      type="checkbox"
                      id={`component-${component.value}`}
                      checked={isSelected}
                      onChange={() => toggleSetComponent(component.value)}
                      className="set-component-checkbox"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="set-component-content">
                    <span className="set-component-icon">{component.icon}</span>
                    <label
                      htmlFor={`component-${component.value}`}
                      className="set-component-label"
                    >
                      {component.label}
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Show ringSizes input if ring is checked */}
        {setComponents.includes('ring') && (
          <div className="ring-sizes-section mt-6">
            <div className="product-type-header mb-3">
              <h4 className="product-type-title text-lg">قياسات الخواتم</h4>
            </div>
            <div className="flex items-center space-x-reverse space-x-2">
              <input
                type="text"
                value={ringSizesInput}
                onChange={handleRingSizesChange}
                onBlur={handleRingSizesBlur}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleRingSizesBlur();
                    e.target.blur();
                  }
                }}
                placeholder="مثال: 12, 13, 14, 15"
                className="form-input flex-1"
              />
              {sizes && sizes.length > 0 && (
                <div className="flex items-center space-x-reverse space-x-2">
                  <span className="text-sm text-gray-600">المقاسات المضافة:</span>
                  <div className="flex space-x-reverse space-x-1">
                    {sizes.map((size, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gold-100 text-gold-800 rounded text-sm">
                        {size}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">افصل بين المقاسات بفاصلة (،)</p>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default ProductTypeFields; 
