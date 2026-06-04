import express from 'express';
import {
  getProducts,
  getProductById,
  compareProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
} from '../controllers/productController.js';
import { protect, vendor, approvedVendor } from '../middleware/authMiddleware.js';
import { uploadProduct } from '../middleware/cloudinaryUpload.js';

const router = express.Router();

router.get('/compare', compareProducts); // Must be above /:id
router.get('/me', protect, vendor, getMyProducts);

router.route('/')
  .get(getProducts)
  // Only approved vendors may create products
  .post(protect, approvedVendor, uploadProduct.single('image'), createProduct);

router.route('/:id')
  .get(getProductById)
  .put(protect, approvedVendor, uploadProduct.single('image'), updateProduct)
  .delete(protect, approvedVendor, deleteProduct);

export default router;
