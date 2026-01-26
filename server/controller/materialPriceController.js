const MaterialPrice = require('../models/MaterialPrice');
const Product = require('../models/Product');
const VALIDATION_LIMITS = require('../constants/validationLimits');

// Get all material prices
exports.getMaterialPrices = async (req, res) => {
  try {
    const prices = await MaterialPrice.find().sort({ material: 1 });
    
    // Material prices retrieved
    
    res.json(prices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update material price
exports.updateMaterialPrice = async (req, res) => {
  try {
    const { material, pricePerGram, karat, isManual, manualPrices } = req.body;
    
    if (!material) {
      return res.status(400).json({ 
        message: 'المادة مطلوبة' 
      });
    }

    // Validate material
    const validMaterials = VALIDATION_LIMITS.VALID_MATERIALS;
    if (!validMaterials.includes(material)) {
      return res.status(400).json({ 
        message: 'المادة يجب أن تكون: ذهب، فضة، أو ألماس' 
      });
    }

    let updateData = {
      lastUpdated: new Date(),
      updatedBy: req.user._id
    };

    if (material === 'ذهب') {
      if (isManual && manualPrices) {
        // الوضع اليدوي - استخدام الأسعار اليدوية مباشرة
        updateData.goldKaratPrices = {
          '18': {
            usd: Math.round(manualPrices['18'].usd * 100) / 100,
            syp: Math.round(manualPrices['18'].syp * 100) / 100
          },
          '21': {
            usd: Math.round(manualPrices['21'].usd * 100) / 100,
            syp: Math.round(manualPrices['21'].syp * 100) / 100
          },
          '24': {
            usd: Math.round(manualPrices['24'].usd * 100) / 100,
            syp: Math.round(manualPrices['24'].syp * 100) / 100
          }
        };
        
        // حفظ السعر الأساسي كعيار 21
        updateData.pricePerGram = {
          usd: Math.round(manualPrices['21'].usd * 100) / 100,
          syp: Math.round(manualPrices['21'].syp * 100) / 100
        };
        
        // حفظ وضع التعديل
        updateData.isManualPricing = true;
        
      } else {
        // الوضع التلقائي - الحساب من عيار 21
        // للذهب، نحتاج إلى karat و pricePerGram
        if (!karat || !pricePerGram || !pricePerGram.usd || !pricePerGram.syp) {
          return res.status(400).json({ 
            message: 'للذهب: karat و pricePerGram.usd و pricePerGram.syp مطلوبة' 
          });
        }

        // التحقق من صحة العيار
        const validKarats = ['18', '21', '24'];
        if (!validKarats.includes(karat)) {
          return res.status(400).json({ 
            message: 'العيار يجب أن يكون: 18، 21، أو 24' 
          });
        }

        // حساب أسعار العيارات الأخرى تلقائياً
        const karat21PriceUSD = karat === '21' ? pricePerGram.usd : 
          karat === '18' ? (pricePerGram.usd * 21) / 18 : 
          (pricePerGram.usd * 21) / 24;
        
        const karat21PriceSYP = karat === '21' ? pricePerGram.syp : 
          karat === '18' ? (pricePerGram.syp * 21) / 18 : 
          (pricePerGram.syp * 21) / 24;

        // حساب أسعار العيارات الأخرى
        const karat18PriceUSD = (karat21PriceUSD * 18) / 21;
        const karat18PriceSYP = (karat21PriceSYP * 18) / 21;
        const karat24PriceUSD = (karat21PriceUSD * 24) / 21;
        const karat24PriceSYP = (karat21PriceSYP * 24) / 21;

        updateData.goldKaratPrices = {
          '18': {
            usd: Math.round(karat18PriceUSD * 100) / 100,
            syp: Math.round(karat18PriceSYP * 100) / 100
          },
          '21': {
            usd: Math.round(karat21PriceUSD * 100) / 100,
            syp: Math.round(karat21PriceSYP * 100) / 100
          },
          '24': {
            usd: Math.round(karat24PriceUSD * 100) / 100,
            syp: Math.round(karat24PriceSYP * 100) / 100
          }
        };

        // تحديث السعر الأساسي (عيار 21)
        updateData.pricePerGram = {
          usd: Math.round(karat21PriceUSD * 100) / 100,
          syp: Math.round(karat21PriceSYP * 100) / 100
        };
        
        // حفظ وضع التعديل
        updateData.isManualPricing = false;
      }

    } else {
      // للفضة والألماس، نستخدم السعر العادي
      if (!pricePerGram || !pricePerGram.usd || !pricePerGram.syp) {
        return res.status(400).json({ 
          message: 'pricePerGram.usd و pricePerGram.syp مطلوبة' 
        });
      }

      updateData.pricePerGram = pricePerGram;
    }

    // Update or create material price
    const materialPrice = await MaterialPrice.findOneAndUpdate(
      { material },
      updateData,
      { upsert: true, new: true }
    );


    res.json(materialPrice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get price for specific karat (for gold)
exports.getGoldKaratPrice = async (req, res) => {
  try {
    const { karat } = req.params;
    
    if (!karat || !['18', '21', '24'].includes(karat)) {
      return res.status(400).json({ 
        message: 'العيار يجب أن يكون: 18، 21، أو 24' 
      });
    }

    const goldPrice = await MaterialPrice.findOne({ material: 'ذهب' });
    if (!goldPrice || !goldPrice.goldKaratPrices) {
      return res.status(404).json({ message: 'أسعار الذهب غير متوفرة' });
    }

    const karatPrice = goldPrice.goldKaratPrices[karat];
    if (!karatPrice) {
      return res.status(404).json({ message: `سعر عيار ${karat} غير متوفر` });
    }

    res.json({
      material: 'ذهب',
      karat,
      pricePerGram: karatPrice
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update all products prices based on new material prices
exports.updateAllProductPrices = async (req, res) => {
  try {
    const { material } = req.body;
    
    if (!material) {
      return res.status(400).json({ message: 'المادة مطلوبة' });
    }

    // Get the updated material price
    const materialPrice = await MaterialPrice.findOne({ material });
    if (!materialPrice) {
      return res.status(404).json({ message: 'سعر المادة غير موجود' });
    }

    // Get ALL products with this material (no limit - single owner website)
    const products = await Product.find({ 
      material
    });
    
    if (products.length === 0) {
      return res.json({ 
        message: `لا توجد منتجات من ${material} لتحديثها`,
        updatedCount: 0,
        totalProducts: 0,
        material
      });
    }
    
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    // تحديث المنتجات بشكل متسلسل لتجنب مشاكل الذاكرة في حال وجود عدد كبير
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      try {
        let newGramPriceUSD, newGramPriceSYP;
        
        if (material === 'ذهب') {
          // للذهب، نستخدم السعر حسب العيار
          const karat = product.karat;
          
          if (!materialPrice.goldKaratPrices || !materialPrice.goldKaratPrices[karat]) {
            skippedCount++;
            continue;
          }
          
          newGramPriceUSD = materialPrice.goldKaratPrices[karat].usd;
          newGramPriceSYP = materialPrice.goldKaratPrices[karat].syp;
          
        } else {
          // للفضة والألماس، نستخدم السعر العادي
          newGramPriceUSD = materialPrice.pricePerGram.usd;
          newGramPriceSYP = materialPrice.pricePerGram.syp;
        }
        
        // Get crafting fees from product
        const craftingFeeUSD = product.craftingFeeUSD || 0;
        const craftingFeeSYP = product.gramWage || 0;
        
        // Calculate total price using the new formula: (pricePerGram + craftingFee) * weight
        const totalPriceUSD = (newGramPriceUSD + craftingFeeUSD) * product.weight;
        const totalPriceSYP = (newGramPriceSYP + craftingFeeSYP) * product.weight;
        
        // Update product prices
        product.gramPrice = {
          usd: newGramPriceUSD,
          syp: newGramPriceSYP
        };
        
        product.totalPrice = {
          usd: totalPriceUSD,
          syp: totalPriceSYP
        };
        
        await product.save();
        updatedCount++;
        
      } catch (error) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          category: 'OPERATION',
          event: 'UPDATE_PRODUCT_PRICE_ERROR',
          details: { 
            productName: product.name,
            productIndex: `${i+1}/${products.length}`,
            error: error.message 
          }
        }));
        errors.push({ productName: product.name, error: error.message });
        skippedCount++;
      }
    }
    
    res.json({ 
      message: `تم تحديث أسعار ${updatedCount} منتج بنجاح`,
      updatedCount,
      totalProducts: products.length,
      skippedCount,
      material,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update all products prices for all materials
exports.updateAllMaterialsPrices = async (req, res) => {
  try {
    // Get all material prices
    const materialPrices = await MaterialPrice.find();
    
    if (materialPrices.length === 0) {
      return res.status(404).json({ message: 'لا توجد أسعار مواد محددة' });
    }
    
    let totalUpdated = 0;
    
    // Update products for each material
    for (const materialPrice of materialPrices) {
      const products = await Product.find({ 
        material: materialPrice.material
      });
      
      // تحديث كل منتج
      for (const product of products) {
        try {
          let newGramPriceUSD, newGramPriceSYP;
          
          if (materialPrice.material === 'ذهب') {
            // للذهب، نستخدم السعر حسب العيار
            const karat = product.karat;
            if (materialPrice.goldKaratPrices && materialPrice.goldKaratPrices[karat]) {
              newGramPriceUSD = materialPrice.goldKaratPrices[karat].usd;
              newGramPriceSYP = materialPrice.goldKaratPrices[karat].syp;
            } else {
              // إذا لم يكن هناك سعر للعيار، نستخدم السعر الأساسي
              newGramPriceUSD = materialPrice.pricePerGram.usd;
              newGramPriceSYP = materialPrice.pricePerGram.syp;
            }
          } else {
            // للفضة والألماس، نستخدم السعر العادي
            newGramPriceUSD = materialPrice.pricePerGram.usd;
            newGramPriceSYP = materialPrice.pricePerGram.syp;
          }
          
          // Get crafting fees from product
          const craftingFeeUSD = product.craftingFeeUSD || 0;
          const craftingFeeSYP = product.gramWage || 0;
          
          // Calculate total price
          const totalPriceUSD = (newGramPriceUSD + craftingFeeUSD) * product.weight;
          const totalPriceSYP = (newGramPriceSYP + craftingFeeSYP) * product.weight;
          
          product.gramPrice = {
            usd: newGramPriceUSD,
            syp: newGramPriceSYP
          };
          
          product.totalPrice = {
            usd: totalPriceUSD,
            syp: totalPriceSYP
          };
          
          await product.save();
          totalUpdated++;
        } catch (error) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            category: 'OPERATION',
            event: 'UPDATE_PRODUCT_PRICE_ERROR',
            details: { productName: product.name, error: error.message }
          }));
        }
      }
    }
    
    res.json({ 
      message: `تم تحديث أسعار جميع المنتجات بنجاح`,
      totalUpdated,
      materialsCount: materialPrices.length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 