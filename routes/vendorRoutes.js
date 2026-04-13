import express from 'express';
import {
  getStoreBySlug,
  updateVendorProfile,
  getVendorStats,
} from '../controllers/vendorController.js';
import { protect, vendor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.put('/me', protect, vendor, updateVendorProfile);
router.get('/me/stats', protect, vendor, getVendorStats);
router.get('/:slug', getStoreBySlug);

export default router;
