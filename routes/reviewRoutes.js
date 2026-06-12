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

// Buyer route to submit review + Admin GET all reviews
router.route('/')
  .post(protect, createProductReview)
  .get(protect, admin, getAllReviews);

// Vendor route to fetch reviews for their store
router.route('/vendor').get(protect, vendor, getVendorReviews);

// Admin route to delete a review
router.route('/:id').delete(protect, admin, deleteReview);

export default router;
