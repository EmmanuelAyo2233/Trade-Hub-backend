import express from 'express';
import {
  raiseDispute,
  getDisputes,
  getMyDisputes,
  getDisputeById,
  resolveDispute,
} from '../controllers/disputeController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Buyer: raise a dispute / Admin: get all disputes
router.route('/')
  .post(protect, raiseDispute)
  .get(protect, admin, getDisputes);

// Buyer: get their own disputes
router.get('/me', protect, getMyDisputes);

// Admin or the creating buyer: get single dispute
router.route('/:id')
  .get(protect, getDisputeById);

// Admin: resolve a dispute
router.route('/:id/resolve')
  .patch(protect, admin, resolveDispute);

export default router;
