import express from 'express';
import { getUsers, toggleUserStatus, toggleVendorApproval, platformStats, platformWallet, getVendors, getBuyers } from '../controllers/adminController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, admin);

router.get('/users', getUsers);
router.get('/stats', platformStats);
router.get('/wallet', platformWallet);
router.get('/vendors', getVendors);
router.get('/buyers', getBuyers);
router.patch('/users/:id/status', toggleUserStatus);
router.patch('/vendors/:id/approval', toggleVendorApproval);

export default router;
