import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// @desc    Register a new user
export const registerUser = async (req, res, next) => {
  try {
      const { name, email, password, role, vendorSlug, vendorDescription } = req.body;

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        res.status(400);
        return next(new Error('User already exists'));
      }

      await User.createWithProfile({ name, email, password, role, vendorSlug, vendorDescription })
        .then(async (userId) => {
          const accessToken = generateToken(res, userId);
          const userObj = await User.getFullProfile(userId);
          
          res.status(201).json({
            user: userObj,
            accessToken,
          });
        });
  } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
          res.status(400);
          return next(new Error('Email or Vendor Slug already exists'));
      }
      next(err);
  }
};

// @desc    Auth user & get token
export const loginUser = async (req, res, next) => {
  try {
      const { email, password } = req.body;
      const user = await User.findByEmail(email);

      if (user) {
        if (user.isActive === 0) {
            res.status(403);
            return next(new Error('Your account has been suspended by the administrator.'));
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            const accessToken = generateToken(res, user.id);
            const userObj = await User.getFullProfile(user.id);
            res.json({
               user: userObj,
               accessToken,
            });
        } else {
            res.status(401);
            return next(new Error('Invalid email or password'));
        }
      } else {
        res.status(401);
        return next(new Error('Invalid email or password'));
      }
  } catch (err) {
      next(err);
  }
};

// @desc    Logout user / clear cookie
export const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Refresh token
export const refreshToken = async (req, res, next) => {
  const token = req.cookies.jwt;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userObj = await User.getFullProfile(decoded.userId);
      if (!userObj) {
        res.status(401);
        return next(new Error('User not found'));
      }
      
      const accessToken = jwt.sign({ userId: userObj._id }, process.env.JWT_SECRET, {
        expiresIn: '15m',
      });
      res.json({ accessToken });
    } catch (error) {
      res.status(401);
      next(new Error('Not authorized, token failed'));
    }
  } else {
    res.status(401);
    next(new Error('Not authorized, no token'));
  }
};

// @desc    Get user profile
export const getUserProfile = async (req, res) => {
  res.json({ user: req.user });
};

// @desc    Update user profile
export const updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let avatarPath = req.user.avatar;
    if (req.file) {
      avatarPath = `/uploads/${req.file.filename}`;
    }

    try {
      await User.updateProfile(userId, { user: req.user, reqBody: req.body, avatarPath });
    } catch (updateErr) {
      if (updateErr.status) {
        res.status(updateErr.status);
      } else if (updateErr.message && updateErr.message.includes('password')) {
        res.status(400);
      }
      return next(updateErr);
    }

    const updatedUser = await User.getFullProfile(userId);
    res.json({ user: updatedUser });
  } catch (err) {
    next(err);
  }
};
