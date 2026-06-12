import express from 'express';
import {
  createProductReview,
  getProductReviews,
  getVendorReviews,
  getAllReviews,
  deleteReview,
} from '../controllers/reviewController.js';
import { protect, admin, vendor } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route to fetch reviews for a product
router.route('/product/:productId').get(getProductReviews);

// Buyer route to submit review
router.route('/').post(protect, createProductReview);

// Vendor route to fetch reviews for their store
router.route('/vendor').get(protect, vendor, getVendorReviews);

// Admin routes
router.route('/').get(protect, admin, getAllReviews);
router.route('/:id').delete(protect, admin, deleteReview);

export default router;
