import express from 'express';
import { initializePayment, verifyPayment, paystackWebhook } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Webhook must use raw body — register before express.json() parses it
// (handled at server level, this route receives parsed body)
router.post('/webhook', paystackWebhook);

router.post('/initialize', protect, initializePayment);
router.get('/verify/:ref', protect, verifyPayment);

export default router;
