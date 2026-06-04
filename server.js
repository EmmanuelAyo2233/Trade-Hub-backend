import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import disputeRoutes from './routes/disputeRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

// Chat & Notification models
import Message from './models/MessageModel.js';
import Conversation from './models/ConversationModel.js';
import Notification from './models/NotificationModel.js';

dotenv.config({ quiet: true });

connectDB();

const app = express();
const httpServer = createServer(app);

// __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const allowedOrigins = [
  'http://localhost:5173',
  'https://marketplace-nine-ashen.vercel.app',
  FRONTEND_URL
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

// Socket.IO setup
const io = new SocketIO(httpServer, {
  cors: corsOptions,
});

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TradeHub Backend is running successfully'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handling
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// ── Socket.IO Authentication & Chat ──────────────────────────
const onlineUsers = new Map(); // userId -> socketId

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  onlineUsers.set(userId, socket.id);
  console.log(`🟢 User ${userId} connected (socket: ${socket.id})`);

  io.emit('user_online', { userId });

  // Join conversation room
  socket.on('join_conversation', async (conversationId) => {
    socket.join(`conv_${conversationId}`);
    // Mark messages as delivered when joining
    await Message.markDelivered(parseInt(conversationId), userId).catch(() => { });
    io.to(`conv_${conversationId}`).emit('messages_delivered', { conversationId, deliveredTo: userId });
  });

  // Send a message
  socket.on('send_message', async ({ conversationId, content, imageUrl }) => {
    try {
      const message = await Message.send(parseInt(conversationId), userId, content?.trim() || null, imageUrl || null);

      // Broadcast to conversation room
      io.to(`conv_${conversationId}`).emit('new_message', message);

      // Find the other user and send notification
      const conv = await Conversation.findByPk(conversationId);
      if (conv) {
        const otherUserId = conv.buyerId === userId ? conv.vendorId : conv.buyerId;
        const otherSocketId = onlineUsers.get(otherUserId);

        if (otherSocketId) {
          // Mark as delivered immediately since user is online
          await Message.markDelivered(parseInt(conversationId), otherUserId).catch(() => { });
          io.to(`conv_${conversationId}`).emit('messages_delivered', { conversationId, deliveredTo: otherUserId });

          io.to(otherSocketId).emit('message_notification', {
            conversationId,
            message,
          });
        }

        // Create a persistent notification for the recipient
        try {
          const msgPrefix = message.imageUrl && !message.content ? '📷 Image' : message.content?.slice(0, 80);
          const notif = await Notification.createNotification({
            userId: otherUserId,
            type: 'message',
            title: 'New Message',
            text: msgPrefix || 'You received a new message',
            link: `messages?vendorId=${userId}`,
            meta: { conversationId, senderId: userId },
          });
          // Push notification count + data via socket
          const notifCount = await Notification.getUnreadCount(otherUserId);
          if (otherSocketId) {
            io.to(otherSocketId).emit('new_notification', notif);
            io.to(otherSocketId).emit('notif_count_update', { count: notifCount });
          }
        } catch (notifErr) {
          console.error('Notification creation failed:', notifErr.message);
        }

        // Send global unread message update to the other user
        const unread = await Message.getUnreadCount(otherUserId);
        if (otherSocketId) {
          io.to(otherSocketId).emit('unread_update', { unreadCount: unread });
        }
      }
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // Mark messages as read
  socket.on('mark_read', async ({ conversationId }) => {
    try {
      await Message.markConversationRead(parseInt(conversationId), userId);
      io.to(`conv_${conversationId}`).emit('messages_read', { conversationId, readBy: userId });

      // Update sender's unread count
      const unread = await Message.getUnreadCount(userId);
      socket.emit('unread_update', { unreadCount: unread });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // Typing
  socket.on('typing', ({ conversationId }) => {
    socket.to(`conv_${conversationId}`).emit('user_typing', { userId, conversationId });
  });
  socket.on('stop_typing', ({ conversationId }) => {
    socket.to(`conv_${conversationId}`).emit('user_stop_typing', { userId, conversationId });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.emit('user_offline', { userId });
    console.log(`🔴 User ${userId} disconnected`);
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server correctly running on port ${PORT} now`);
});
