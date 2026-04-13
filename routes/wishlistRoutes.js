import express from 'express';
import { getWishlist, toggleWishlist, getWishlistIds } from '../controllers/wishlistController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getWishlist);
router.post('/toggle', protect, toggleWishlist);
router.get('/ids', protect, getWishlistIds);

export default router;
