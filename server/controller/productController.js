const Product = require('../models/Product');
const favoriteAlertController = require('./favoriteAlertController');
const securityLogger = require('../utils/securityLogger');
const VALIDATION_LIMITS = require('../constants/validationLimits');

// Helper: Validate stones for diamond
function validateDiamondStones(stones) {
  const allowedTypes = VALIDATION_LIMITS.STONE_TYPES;
  const allowedColors = VALIDATION_LIMITS.STONE_COLORS;
  for (const stone of stones) {
    if (!allowedTypes.includes(stone.type)) {
      return `Invalid stone type: ${stone.type}`;
    }
    if (!allowedColors.includes(stone.color)) {
      return `Invalid stone color: ${stone.color}`;
    }
    if (typeof stone.count !== 'number' || stone.count < 1) {
      return `Invalid stone count: ${stone.count}`;
    }
    // caratPrice, totalPrice, totalWeight are validated by schema
  }
  return null;
}

// Create a new product
exports.createProduct = async (req, res) => {
  try {
    // Handle uploaded images (stored in memory)
    const images = req.files && req.files.length > 0 
      ? req.files.map(file => {
          // Convert buffer to base64 data URL
          return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        })
      : [];
    
    // Validate: At least one image is required
    if (!images || images.length === 0) {
      return res.status(400).json({ message: 'يجب إضافة صورة واحدة على الأقل للمنتج' });
    }
    
    const { productType, material, stones } = req.body;
    // Parse arrays if sent as JSON strings (from FormData)
    let ringSizes = req.body.ringSizes;
    let setAccessories = req.body.setAccessories;
    if (typeof ringSizes === 'string') {
      try { ringSizes = JSON.parse(ringSizes); } catch { ringSizes = []; }
    }
    if (typeof setAccessories === 'string') {
      try { setAccessories = JSON.parse(setAccessories); } catch { setAccessories = []; }
    }
    // Parse gramPrice and totalPrice if sent as JSON strings
    let gramPrice = req.body.gramPrice;
    let totalPrice = req.body.totalPrice;
    if (typeof gramPrice === 'string') {
      try { gramPrice = JSON.parse(gramPrice); } catch { gramPrice = { usd: 0, syp: 0 }; }
    }
    if (typeof totalPrice === 'string') {
      try { totalPrice = JSON.parse(totalPrice); } catch { totalPrice = { usd: 0, syp: 0 }; }
    }
    // Validate ringSizes and setAccessories
    const isRing = productType === 'خاتم' || productType === 'محبس';
    const isSetWithRing = productType === 'طقم' && setAccessories && Array.isArray(setAccessories) && (setAccessories.includes('خاتم') || setAccessories.includes('ring'));
    if ((isRing || isSetWithRing) && (!ringSizes || ringSizes.length === 0)) {
      return res.status(400).json({ message: 'ringSizes are required for خاتم أو محبس أو طقم مع خاتم' });
    }
    if (!(isRing || isSetWithRing) && ringSizes && Array.isArray(ringSizes) && ringSizes.length > 0) {
      return res.status(400).json({ message: 'ringSizes only allowed for خاتم أو محبس أو طقم مع خاتم' });
    }
    if (productType === 'طقم' && (!setAccessories || setAccessories.length === 0)) {
      return res.status(400).json({ message: 'setAccessories are required for طقم' });
    }
    if (productType !== 'طقم' && setAccessories && Array.isArray(setAccessories) && setAccessories.length > 0) {
      return res.status(400).json({ message: 'setAccessories only allowed for طقم' });
    }
    // Validate stones for diamond
    let stonesArr = stones;
    if (typeof stones === 'string') {
      stonesArr = JSON.parse(stones);
    }
    if (material === 'ألماس' && stonesArr && stonesArr.length > 0) {
      const error = validateDiamondStones(stonesArr);
      if (error) return res.status(400).json({ message: error });
    }
    // Parse createdAt if sent as a string (from FormData)
    let createdAt = req.body.createdAt;
    if (typeof createdAt === 'string') {
      try { createdAt = new Date(JSON.parse(createdAt)); } catch { createdAt = new Date(); }
    }
    const productData = {
      ...req.body,
      stones: stonesArr,
      ringSizes,
      setAccessories,
      images,
      createdAt,
      gramPrice,
      totalPrice
    };
    
    const product = new Product(productData);
    await product.save();
    // Product saved successfully
    
    // Log product creation
    securityLogger.logProductOperation('CREATE', req, product._id, {
      name: product.name,
      material: product.material,
      productType: product.productType,
      imageCount: product.images?.length || 0
    });
    
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ 
      message: err.message,
      error: err.name,
      code: 'SERVER_ERROR'
    });
  }
};

// Get all products (public endpoint - shows all products)
// NOTE: Special products are always shown, regardless of reservation status.
// Only the reservation button is disabled for reserved special products.
exports.getProducts = async (req, res) => {
  try {
    // No filter - show all products (single-store template)
    // Special reserved products are included in the results
    let filter = {};
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
      .sort({ pinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);
    const hasMore = skip + products.length < total;

    // Calculate statistics (for owner dashboard) - ALWAYS calculate if authenticated
    let stats = null;
    if (req.user) {
      const [pinnedCount, goldCount, silverCount, diamondCount] = await Promise.all([
        Product.countDocuments({ pinned: true }),
        Product.countDocuments({ $or: [{ material: 'gold' }, { material: 'ذهب' }] }),
        Product.countDocuments({ $or: [{ material: 'silver' }, { material: 'فضة' }] }),
        Product.countDocuments({ $or: [{ material: 'diamond' }, { material: 'ألماس' }] })
      ]);
      
      stats = {
        totalProducts: total,
        pinnedCount,
        goldCount,
        silverCount,
        diamondCount
      };
    }

    res.json({ 
      products, 
      hasMore,
      totalPages,
      totalProducts: total,
      currentPage: page,
      stats
    });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'GET_PRODUCTS_ERROR',
      details: { error: err.message }
    }));
    res.status(500).json({ message: err.message });
  }
};

// Search products by name or ID (for certificate creation)
exports.searchProducts = async (req, res) => {
  try {
    // Only allow owners to search products
    if (!req.user || req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const { query } = req.query; // Search term (name or ID)
    
    // If query is empty or too short, return all products (for dropdown display)
    // Optimized: Only fetch essential fields and limit results for performance
    if (!query || query.trim().length < 2) {
      const allProducts = await Product.find({})
        .limit(50) // Reduced to 50 for better performance (most recent products)
        .select('_id name material karat carat') // Minimal fields needed for dropdown
        .sort({ createdAt: -1 }) // Show newest first
        .lean(); // Use lean() for better performance (returns plain JS objects)
      return res.json({ products: allProducts });
    }
    
    const searchTerm = query.trim();
    
    // Build search query - try to match ID exactly first, then search by name
    let searchQuery = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } }
      ]
    };
    
    // Try to match ID exactly if it looks like a valid ObjectId (24 hex characters)
    if (/^[0-9a-fA-F]{24}$/.test(searchTerm)) {
      searchQuery.$or.push({ _id: searchTerm });
    }
    
    // Search products by name or ID
    const products = await Product.find(searchQuery)
      .limit(50) // Limit to 50 for performance
      .select('_id name material karat carat') // Minimal fields for dropdown
      .sort({ createdAt: -1 }) // Show newest first
      .lean(); // Use lean() for better performance
    
    res.json({ products });
  } catch (err) {
    console.error('Error searching products:', err);
    res.status(500).json({ message: 'Error searching products' });
  }
};

// Get a single product by ID (public, or restrict to owner if authenticated and owner)
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    // Convert to plain object and add likes count
    const productObj = product.toObject();
    productObj.likesCount = product.likes ? product.likes.length : 0;
    
    // If user is authenticated, check if they liked this product
    if (req.user) {
      productObj.isLiked = product.likes ? product.likes.some(id => id.equals(req.user._id)) : false;
    } else {
      productObj.isLiked = false;
    }
    
    // Any authenticated user can view product details (public endpoint)
    res.json(productObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a product
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    // Store owner can update any product (already checked by authorize('owner') middleware)
    const { productType, ringSizes, setAccessories, material, stones } = req.body;
    // Parse gramPrice and totalPrice if sent as JSON strings
    let gramPrice = req.body.gramPrice;
    let totalPrice = req.body.totalPrice;
    if (typeof gramPrice === 'string') {
      try { gramPrice = JSON.parse(gramPrice); } catch { gramPrice = { usd: 0, syp: 0 }; }
    }
    if (typeof totalPrice === 'string') {
      try { totalPrice = JSON.parse(totalPrice); } catch { totalPrice = { usd: 0, syp: 0 }; }
    }
    // Validate ringSizes and setAccessories
    const isRing = productType === 'خاتم' || productType === 'محبس';
    const isSetWithRing = productType === 'طقم' && setAccessories && Array.isArray(setAccessories) && (setAccessories.includes('خاتم') || setAccessories.includes('ring'));
    if ((isRing || isSetWithRing) && (!ringSizes || ringSizes.length === 0)) {
      return res.status(400).json({ message: 'ringSizes are required for خاتم أو محبس أو طقم مع خاتم' });
    }
    if (!(isRing || isSetWithRing) && ringSizes && Array.isArray(ringSizes) && ringSizes.length > 0) {
      return res.status(400).json({ message: 'ringSizes only allowed for خاتم أو محبس أو طقم مع خاتم' });
    }
    if (productType === 'طقم' && (!setAccessories || setAccessories.length === 0)) {
      return res.status(400).json({ message: 'setAccessories are required for طقم' });
    }
    if (productType !== 'طقم' && setAccessories && setAccessories.length > 0) {
      return res.status(400).json({ message: 'setAccessories only allowed for طقم' });
    }
    // Validate stones for diamond
    let stonesArr = stones;
    if (typeof stones === 'string') {
      stonesArr = JSON.parse(stones);
    }
    if (material === 'ألماس' && stonesArr && stonesArr.length > 0) {
      const error = validateDiamondStones(stonesArr);
      if (error) return res.status(400).json({ message: error });
    }
    // If new images are uploaded, replace the images array
    if (req.files && req.files.length > 0) {
      // Note: Images are stored in memory (multer.memoryStorage)
      // You may need to implement your own image storage solution
      // For now, we'll store image data as base64 or handle via your storage solution
      product.images = req.files.map(file => {
        // Convert buffer to base64 data URL if needed
        // Or implement your own storage solution
        return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      });
    }
    
    // Validate: Product must have at least one image (existing or newly uploaded)
    const finalImages = product.images || [];
    if (finalImages.length === 0) {
      return res.status(400).json({ message: 'يجب أن يحتوي المنتج على صورة واحدة على الأقل' });
    }
    
    // Don't allow clearing images via body - remove images from req.body if present
    const { images: bodyImages, ...bodyWithoutImages } = req.body;
    
    Object.assign(product, bodyWithoutImages, { stones: stonesArr, gramPrice, totalPrice });
    await product.save();
    
    // فحص وتفعيل تنبيهات المنتجات المفضلة
    try {
      await favoriteAlertController.checkAndTriggerProductAlerts(product._id, product);
    } catch (alertError) {
      // Silent error - don't stop product update if alert check fails
      // لا نوقف العملية إذا فشل فحص التنبيهات
    }
    
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Delete the product from database
    await product.deleteOne();
    
    // Log product deletion
    securityLogger.logProductOperation('DELETE', req, req.params.id, {
      name: product.name,
      material: product.material,
      productType: product.productType,
      imageCount: product.images?.length || 0
    });
    
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Pin or unpin a product
exports.togglePin = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Store owner can pin any product (already checked by authorize('owner') middleware)
    product.pinned = !product.pinned;
    
    await product.save();
    
    res.json({ pinned: product.pinned });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Toggle special status of a product
exports.toggleSpecial = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Store owner can toggle special status (already checked by authorize('owner') middleware)
    product.special = !product.special;
    
    await product.save();
    
    res.json({ special: product.special });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Toggle like/unlike a product
exports.toggleLike = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const userId = req.user._id;
    
    // Toggling like for product
    
    const liked = product.likes.some(id => id.equals(userId));
    
    if (liked) {
      product.likes = product.likes.filter(id => !id.equals(userId));
    } else {
      product.likes.push(userId);
    }
    
    await product.save();
    res.json({ likes: product.likes.length, liked: !liked });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get user's favorite products
exports.getFavoriteProducts = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find all products that the user has liked
    const products = await Product.find({
      likes: { $in: [userId] }
    }).sort({ createdAt: -1 });

    // Add liked property to each product
    const productsWithLiked = products.map(product => ({
      ...product.toObject(),
      liked: true,
      likes: product.likes.length
    }));

    res.json({ products: productsWithLiked });
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: 'OPERATION',
      event: 'GET_FAVORITE_PRODUCTS_ERROR',
      userId: req.user?._id || 'unknown',
      details: { error: err.message }
    }));
    res.status(500).json({ message: err.message });
  }
};

// Get user's favorite products count
exports.getFavoriteProductsCount = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Count all products that the user has liked
    const count = await Product.countDocuments({
      likes: { $in: [userId] }
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 