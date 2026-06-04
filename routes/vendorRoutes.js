import express from 'express';
import {
  getStoreBySlug,
  updateVendorProfile,
  getVendorStats,
  submitVendorKYC,
  getVendorKYCStatus,
} from '../controllers/vendorController.js';
import { protect, vendor } from '../middleware/authMiddleware.js';
import { uploadKYC } from '../middleware/cloudinaryUpload.js';

const router = express.Router();

router.post('/kyc/submit', protect, vendor, uploadKYC.fields([
  { name: 'idDocument', maxCount: 1 },
  { name: 'selfiePhoto', maxCount: 1 }
]), submitVendorKYC);

router.get('/kyc/status', protect, vendor, getVendorKYCStatus);

router.put('/me', protect, vendor, updateVendorProfile);
router.get('/me/stats', protect, vendor, getVendorStats);
router.get('/:slug', getStoreBySlug);

export default router;
