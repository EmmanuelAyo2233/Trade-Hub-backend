import Vendor from '../models/Vendor.js';
import Product from '../models/Product.js';
import { pool } from '../config/db.js';

// @desc    Get vendor store by slug
export const getStoreBySlug = async (req, res, next) => {
  try {
    const vendor = await Vendor.findStoreBySlug(req.params.slug);
    
    if (!vendor) {
      res.status(404);
      return next(new Error('Store not found'));
    }

    if (vendor.isActive === 0) {
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
      location: vendor.location,
      isVerified: vendor.isVerified === 1
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

// @desc    Submit Vendor KYC verification documents and info
export const submitVendorKYC = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      fullName,
      email,
      phoneNumber,
      residentialAddress,
      businessAddress,
      businessName,
      businessCategory,
      businessDescription,
      cacNumber,
      taxIdentificationNumber,
      storeName,
      storeDescription,
    } = req.body;

    // Check if vendor profile exists
    const [profiles] = await pool.query('SELECT * FROM VendorProfiles WHERE userId = ?', [userId]);
    if (profiles.length === 0) {
      res.status(404);
      return next(new Error('Vendor profile not found'));
    }
    const currentProfile = profiles[0];

    // File handling - Cloudinary returns secure_url in file.path
    let idDocumentPath = currentProfile.idDocument;
    let selfiePhotoPath = currentProfile.selfiePhoto;

    if (req.files) {
      if (req.files.idDocument && req.files.idDocument[0]) {
        // Cloudinary storage sets .path to the secure_url; disk storage sets .filename
        idDocumentPath = req.files.idDocument[0].path || `/uploads/${req.files.idDocument[0].filename}`;
      }
      if (req.files.selfiePhoto && req.files.selfiePhoto[0]) {
        selfiePhotoPath = req.files.selfiePhoto[0].path || `/uploads/${req.files.selfiePhoto[0].filename}`;
      }
    }

    // Validation
    if (!fullName || !email || !phoneNumber || !residentialAddress || !businessName || !businessCategory || !businessDescription) {
      res.status(400);
      return next(new Error('Please fill in all required fields'));
    }

    if (!idDocumentPath || !selfiePhotoPath) {
      res.status(400);
      return next(new Error('Please upload both a Government ID and a Selfie Photograph'));
    }

    // Update profile
    await pool.query(`
      UPDATE VendorProfiles SET
        fullName = ?,
        email = ?,
        phoneNumber = ?,
        residentialAddress = ?,
        businessAddress = ?,
        businessName = ?,
        businessCategory = ?,
        businessDescription = ?,
        cacNumber = ?,
        taxIdentificationNumber = ?,
        idDocument = ?,
        selfiePhoto = ?,
        storeName = ?,
        storeDescription = ?,
        verificationStatus = 'pending',
        isVerified = FALSE
      WHERE userId = ?
    `, [
      fullName,
      email,
      phoneNumber,
      residentialAddress,
      businessAddress || residentialAddress, // Fallback if business address isn't different
      businessName,
      businessCategory,
      businessDescription,
      cacNumber || null,
      taxIdentificationNumber || null,
      idDocumentPath,
      selfiePhotoPath,
      storeName || currentProfile.storeName,
      storeDescription || currentProfile.storeDescription,
      userId
    ]);

    // Fetch the updated profile to send back
    const [updated] = await pool.query('SELECT * FROM VendorProfiles WHERE userId = ?', [userId]);
    res.json({
      message: 'KYC documents submitted successfully. Account is pending review.',
      vendor: {
        ...updated[0],
        isVerified: false,
        isApproved: false
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current KYC status of logged-in vendor
export const getVendorKYCStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const [profiles] = await pool.query('SELECT * FROM VendorProfiles WHERE userId = ?', [userId]);
    
    if (profiles.length === 0) {
      res.status(404);
      return next(new Error('Vendor profile not found'));
    }
    
    res.json(profiles[0]);
  } catch (err) {
    next(err);
  }
};
