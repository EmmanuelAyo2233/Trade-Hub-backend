import express from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  getUserProfile,
  updateUserProfile,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadAvatar } from '../middleware/cloudinaryUpload.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/refresh', refreshToken);
router.get('/me', protect, getUserProfile);
router.put('/profile', protect, uploadAvatar.single('avatar'), updateUserProfile);

export default router;
