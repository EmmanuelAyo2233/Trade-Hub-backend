import Product from '../models/Product.js';

// Helper to format products for frontend
const formatProduct = p => ({
  _id: p._id,
  name: p.name,
  description: p.description,
  price: p.price,
  images: [p.image || 'https://placehold.co/400x400/e2e8f0/94a3b8?text=No+Image'],
  category: p.category,
  stockQty: p.countInStock,
  isActive: p.isActive === 1,
  createdAt: p.createdAt,
  vendorId: p.vendorName ? { _id: p.vendorId, storeName: p.vendorName, storeSlug: p.vendorSlug } : undefined
});

// @desc    Fetch all products
export const getProducts = async (req, res, next) => {
  try {
    const products = await Product.findAll(req.query);
    const formattedProducts = products.map(formatProduct);
    res.json({ products: formattedProducts, totalPages: 1, total: formattedProducts.length });
  } catch (err) {
    next(err);
  }
};

// @desc    Fetch single product
export const getProductById = async (req, res, next) => {
  try {
    const p = await Product.findById(req.params.id);
    if (p) {
      res.json({ product: formatProduct(p) });
    } else {
      res.status(404);
      next(new Error('Product not found'));
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Compare products
export const compareProducts = async (req, res, next) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      res.status(400);
      return next(new Error('No product ids provided'));
    }
    const idArray = ids.split(',');
    const products = await Product.findByIds(idArray);
    res.json({ products: products.map(formatProduct) });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a product
export const createProduct = async (req, res, next) => {
  try {
    const { name, price, description, category, stockQty } = req.body;
    const countInStock = parseInt(stockQty || req.body.countInStock || 0, 10);
    const parsedPrice = parseFloat(price);
    const vendorId = parseInt(req.user._id, 10);
    const image = req.file ? `/uploads/${req.file.filename}` : 'https://placehold.co/400x400/e2e8f0/94a3b8?text=No+Image';

    const insertId = await Product.create({
      vendorId, name, description, price: parsedPrice, image, category, countInStock
    });

    const p = { _id: insertId, name, description, price: parsedPrice, images: [image], category, stockQty: countInStock, isActive: true };
    res.status(201).json(p);
  } catch (err) {
    next(err);
  }
};

// @desc    Update a product
export const updateProduct = async (req, res, next) => {
  try {
    const { name, price, description, category, countInStock, stockQty } = req.body;
    
    const product = await Product.findRawById(req.params.id);

    if (product) {

      if (product.vendorId !== req.user._id && req.user.role !== 'admin') {
        res.status(401);
        return next(new Error('Not authorized to update this product'));
      }

      const updatedName = name || product.name;
      const updatedPrice = price || product.price;
      const updatedDescription = description || product.description;
      const updatedCategory = category || product.category;
      const updatedCountInStock = countInStock !== undefined ? countInStock : (stockQty !== undefined ? stockQty : product.countInStock);
      let updatedImage = req.file ? `/uploads/${req.file.filename}` : product.image;

      await Product.updateById(req.params.id, {
        name: updatedName, price: updatedPrice, description: updatedDescription, 
        category: updatedCategory, countInStock: updatedCountInStock, image: updatedImage
      });

      const updatedP = await Product.findById(req.params.id);
      res.json(updatedP);
    } else {
      res.status(404);
      next(new Error('Product not found'));
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a product
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findRawById(req.params.id);

    if (product) {
      if (product.vendorId !== req.user._id && req.user.role !== 'admin') {
        res.status(401);
        return next(new Error('Not authorized to delete this product'));
      }

      await Product.deleteById(req.params.id);
      res.json({ message: 'Product removed' });
    } else {
      res.status(404);
      next(new Error('Product not found'));
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Get vendor's products
export const getMyProducts = async (req, res, next) => {
  try {
    const products = await Product.findByVendorId(req.user._id);
    res.json(products.map(formatProduct));
  } catch (err) {
    next(err);
  }
};
