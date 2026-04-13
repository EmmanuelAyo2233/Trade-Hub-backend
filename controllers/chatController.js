import Conversation from '../models/ConversationModel.js';
import Message from '../models/MessageModel.js';

// @desc    Get all conversations for current user
export const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.getUserConversations(req.user._id);
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
};

// @desc    Get or create conversation between buyer and vendor
export const startConversation = async (req, res, next) => {
  try {
    const { vendorId } = req.body;
    if (!vendorId) {
      res.status(400);
      return next(new Error('vendorId is required'));
    }

    let buyerId, actualVendorId;
    if (req.user.role === 'vendor') {
      buyerId = parseInt(vendorId);
      actualVendorId = req.user._id;
    } else {
      buyerId = req.user._id;
      actualVendorId = parseInt(vendorId);
    }

    const conv = await Conversation.getOrCreate(buyerId, actualVendorId);
    res.json({ conversation: { _id: conv.id, buyerId: conv.buyerId, vendorId: conv.vendorId } });
  } catch (err) {
    next(err);
  }
};

// @desc    Get messages for a conversation
export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    await Message.markConversationRead(conversationId, req.user._id);
    const messages = await Message.getByConversation(parseInt(conversationId));
    res.json({ messages });
  } catch (err) {
    next(err);
  }
};

// @desc    Send a text message (REST fallback)
export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      res.status(400);
      return next(new Error('Message content is required'));
    }

    const message = await Message.send(parseInt(conversationId), req.user._id, content.trim());
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
};

// @desc    Send an image message
export const sendImageMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    if (!req.file) {
      res.status(400);
      return next(new Error('Image file is required'));
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const content = req.body.content || null;

    const message = await Message.send(parseInt(conversationId), req.user._id, content, imageUrl);
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
};

// @desc    Get total unread message count for current user
export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Message.getUnreadCount(req.user._id);
    res.json({ unreadCount: count });
  } catch (err) {
    next(err);
  }
};
