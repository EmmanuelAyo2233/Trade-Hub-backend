import express from 'express';
import { getConversations, startConversation, getMessages, sendMessage, sendImageMessage, getUnreadCount } from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/conversations', protect, getConversations);
router.post('/conversations', protect, startConversation);
router.get('/conversations/:conversationId/messages', protect, getMessages);
router.post('/conversations/:conversationId/messages', protect, sendMessage);
router.post('/conversations/:conversationId/image', protect, upload.single('image'), sendImageMessage);
router.get('/unread', protect, getUnreadCount);

export default router;
