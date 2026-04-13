import express from 'express';
import {
  createOrder,
  getOrderById,
  getMyOrders,
  getVendorOrders,
  shipOrder,
  confirmDelivery,
} from '../controllers/orderController.js';
import { protect, vendor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, createOrder);
router.route('/me').get(protect, getMyOrders);
router.route('/vendor').get(protect, vendor, getVendorOrders);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/ship').patch(protect, vendor, shipOrder);
router.route('/:id/confirm').patch(protect, confirmDelivery);

export default router;
