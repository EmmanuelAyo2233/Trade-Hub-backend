import Order from '../models/Order.js';
import User from '../models/User.js';
import { createEscrow, releaseEscrow } from './walletController.js';

// @desc    Create new order
export const createOrder = async (req, res, next) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      vendorId, 
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
      res.status(400);
      return next(new Error('No order items'));
    }

    const createdOrder = await Order.createOrder({
      orderItems,
      buyerId: req.user._id,
      vendorId: vendorId,
      shippingAddress: shippingAddress.address,
      shippingCity: shippingAddress.city,
      shippingPostalCode: shippingAddress.postalCode,
      shippingCountry: shippingAddress.country,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    // Create escrow entry so vendor sees pending balance
    try {
      await createEscrow(vendorId, createdOrder._id || createdOrder.id, totalPrice);
    } catch (escrowErr) {
      console.error('Escrow creation failed:', escrowErr.message);
    }

    res.status(201).json(createdOrder);
  } catch (err) {
    next(err);
  }
};

// @desc    Get order by ID
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.getOrderById(req.params.id);

    if (order) {
      if (
        order.buyer._id.toString() === req.user._id.toString() ||
        order.vendor._id.toString() === req.user._id.toString() ||
        req.user.role === 'admin'
      ) {
        res.json(order);
      } else {
        res.status(401);
        return next(new Error('Not authorized to view this order'));
      }
    } else {
      res.status(404);
      return next(new Error('Order not found'));
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Get logged in buyer's orders
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.findBuyerOrders(req.user._id);
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

// @desc    Get vendor's orders
export const getVendorOrders = async (req, res, next) => {
  try {
    const orders = await Order.findVendorOrders(req.user._id);
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

// @desc    Mark order as shipped
export const shipOrder = async (req, res, next) => {
  try {
    const order = await Order.getOrderById(req.params.id);

    if (order && order.vendor._id.toString() === req.user._id.toString()) {
      const updatedOrder = await Order.markShipped(req.params.id);
      res.json(updatedOrder);
    } else {
      res.status(404);
      return next(new Error('Order not found or unauthorized'));
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Confirm delivery of order
export const confirmDelivery = async (req, res, next) => {
  try {
    const order = await Order.getOrderById(req.params.id);

    if (order && order.buyer._id.toString() === req.user._id.toString()) {
      const updatedOrder = await Order.markDelivered(req.params.id);

      // Release escrow to vendor wallet
      try {
        await releaseEscrow(order.vendor._id, order._id || req.params.id);
      } catch (escrowErr) {
        console.error('Escrow release failed:', escrowErr.message);
      }

      res.json(updatedOrder);
    } else {
      res.status(404);
      return next(new Error('Order not found or unauthorized'));
    }
  } catch (err) {
    next(err);
  }
};
