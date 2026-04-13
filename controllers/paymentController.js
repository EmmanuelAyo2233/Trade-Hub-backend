import axios from 'axios';
import Order from '../models/Order.js';
import { createEscrow } from './walletController.js';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// @desc    Initialize Paystack transaction
// @route   POST /api/payments/initialize
export const initializePayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const order = await Order.getOrderById(orderId);
    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    // Only the buyer of this order can pay
    if (order.buyer._id.toString() !== req.user._id.toString()) {
      res.status(403);
      return next(new Error('Not authorised to pay for this order'));
    }

    if (order.isPaid) {
      res.status(400);
      return next(new Error('Order is already paid'));
    }

    // Amount in kobo (Paystack expects smallest currency unit)
    const amountKobo = Math.round(parseFloat(order.totalPrice) * 100);

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: req.user.email,
        amount: amountKobo,
        reference: `TH-${orderId}-${Date.now()}`,
        metadata: {
          orderId,
          buyerId: req.user._id,
          custom_fields: [
            { display_name: 'Order ID', variable_name: 'order_id', value: orderId },
          ],
        },
        callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/verify`,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const { authorization_url, access_code, reference } = response.data.data;

    res.json({ authorization_url, access_code, reference });
  } catch (err) {
    if (err.response) {
      res.status(err.response.status || 500);
      return next(new Error(err.response.data?.message || 'Paystack initialisation failed'));
    }
    next(err);
  }
};

// @desc    Verify Paystack transaction and mark order paid
// @route   GET /api/payments/verify/:ref
export const verifyPayment = async (req, res, next) => {
  try {
    const { ref } = req.params;

    // Call Paystack verify endpoint
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      }
    );

    const txData = response.data.data;

    if (txData.status !== 'success') {
      res.status(400);
      return next(new Error(`Payment not successful. Status: ${txData.status}`));
    }

    // Extract orderId from reference or metadata
    const orderId =
      txData.metadata?.orderId ||
      ref.split('-')[1]; // fallback: TH-<orderId>-<ts>

    const order = await Order.getOrderById(orderId);
    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    if (order.isPaid) {
      // Already recorded — return existing order, idempotent
      return res.json({ success: true, order });
    }

    const paymentResult = {
      id: txData.id,
      status: txData.status,
      update_time: txData.paid_at || new Date().toISOString(),
      email_address: txData.customer?.email || req.user.email,
    };

    const updatedOrder = await Order.markPaid(orderId, paymentResult);

    // Create escrow entry for vendor
    try {
      await createEscrow(order.vendor._id, orderId, order.totalPrice);
    } catch (escrowErr) {
      console.error('Escrow creation after verify failed:', escrowErr.message);
    }

    res.json({ success: true, order: updatedOrder });
  } catch (err) {
    if (err.response) {
      res.status(err.response.status || 500);
      return next(new Error(err.response.data?.message || 'Paystack verification failed'));
    }
    next(err);
  }
};

// @desc    Paystack webhook handler (optional but recommended)
// @route   POST /api/payments/webhook
export const paystackWebhook = async (req, res, next) => {
  try {
    const crypto = await import('crypto');
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).send('Invalid signature');
    }

    const { event, data } = req.body;

    if (event === 'charge.success') {
      const orderId =
        data.metadata?.orderId ||
        data.reference?.split('-')[1];

      if (orderId) {
        const order = await Order.getOrderById(orderId);
        if (order && !order.isPaid) {
          await Order.markPaid(orderId, {
            id: data.id,
            status: data.status,
            update_time: data.paid_at,
            email_address: data.customer?.email,
          });
          await createEscrow(order.vendor._id, orderId, order.totalPrice).catch(() => {});
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
};
