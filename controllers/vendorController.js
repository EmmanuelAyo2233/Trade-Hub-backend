import Vendor from '../models/Vendor.js';
import Product from '../models/Product.js';

// @desc    Get vendor store by slug
export const getStoreBySlug = async (req, res, next) => {
  try {
    const vendor = await Vendor.findStoreBySlug(req.params.slug);
    
    if (!vendor) {
      res.status(404);
      return next(new Error('Store not found'));
    }

    if (vendor.isActive === 0 || vendor.isApproved === 0) {
      res.status(403);
      return next(new Error('Store is currently unavailable.'));
    }

    const products = await Product.findByVendorId(vendor.userId);
    
    // Format response
    const formattedVendor = {
      _id: vendor.userId,
      storeName: vendor.storeName,
      storeSlug: vendor.storeSlug,
      storeDescription: vendor.storeDescription,
      avatar: vendor.avatar,
      location: vendor.location
    };

    const formattedProducts = products.filter(p => p.isActive === 1).map(p => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      price: p.price,
      images: [p.image || 'https://placehold.co/400x400/e2e8f0/94a3b8?text=No+Image'],
      category: p.category,
      stockQty: p.countInStock,
      isActive: true
    }));

    res.json({ vendor: formattedVendor, products: formattedProducts });
  } catch (err) {
    next(err);
  }
};

// @desc    Update vendor profile
export const updateVendorProfile = async (req, res) => {
  // Logic migrated to authController / User model
  // Keeping as placeholder to not break route imports
  res.status(400).json({ message: 'Please use the unified profile update endpoint.' });
};

// @desc    Get vendor stats
export const getVendorStats = async (req, res, next) => {
  try {
    const stats = await Vendor.getVendorStats(req.user._id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
};
