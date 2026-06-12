import Review from '../models/Review.js';
import Order from '../models/Order.js';
import { pool } from '../config/db.js';

// @desc    Create product review
// @route   POST /api/reviews
// @access  Private (Buyer)
export const createProductReview = async (req, res, next) => {
  try {
    const { productId, orderId, rating, comment } = req.body;
    const buyerId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400);
      return next(new Error('Please provide a rating between 1 and 5'));
    }

    // Check if order exists, belongs to the buyer, and is delivered
    const order = await Order.getOrderById(orderId);
    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    if (order.buyer._id.toString() !== buyerId.toString()) {
      res.status(401);
      return next(new Error('Not authorized to review this order'));
    }

    if (order.status !== 'delivered' && order.status !== 'completed' && !order.isDelivered) {
      res.status(400);
      return next(new Error('You can only review products from delivered orders'));
    }

    // Check if the product was actually in the order
    const hasProduct = order.orderItems.some(item => item.productId === parseInt(productId));
    if (!hasProduct) {
      res.status(400);
      return next(new Error('Product was not part of this order'));
    }

    // Create review
    const review = await Review.create({
      productId: parseInt(productId),
      orderId: parseInt(orderId),
      buyerId,
      rating: parseInt(rating),
      comment
    });

    res.status(201).json({ success: true, review });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400);
      return next(new Error('You have already reviewed this product for this order'));
    }
    next(err);
  }
};

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
export const getProductReviews = async (req, res, next) => {
  try {
    const reviews = await Review.findByProductId(req.params.productId);
    res.json(reviews);
  } catch (err) {
    next(err);
  }
};

// @desc    Get reviews for a vendor's products
// @route   GET /api/reviews/vendor
// @access  Private (Vendor)
export const getVendorReviews = async (req, res, next) => {
  try {
    const reviews = await Review.findByVendorId(req.user._id);
    res.json(reviews);
  } catch (err) {
    next(err);
  }
};

// @desc    Get all reviews
// @route   GET /api/reviews
// @access  Private (Admin)
export const getAllReviews = async (req, res, next) => {
  try {
    const reviews = await Review.findAll();
    res.json(reviews);
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Admin)
export const deleteReview = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM Reviews WHERE id = ?', [req.params.id]);
    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    next(err);
  }
};
