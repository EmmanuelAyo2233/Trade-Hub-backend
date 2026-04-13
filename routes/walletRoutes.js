import express from 'express';
import { getMyWallet, withdrawWallet } from '../controllers/walletController.js';
import { protect, vendor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/me', protect, getMyWallet);
router.post('/withdraw', protect, vendor, withdrawWallet);

export default router;
