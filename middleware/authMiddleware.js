import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.getFullProfile(decoded.userId);
      if (!user) {
        res.status(401);
        return next(new Error('User not found'));
      }
      
      req.user = user;
      next();
    } catch (error) {
      res.status(401);
      next(new Error('Not authorized, token failed'));
    }
  }

  if (!token) {
    res.status(401);
    next(new Error('Not authorized, no token'));
  }
};

const vendor = (req, res, next) => {
  if (req.user && (req.user.role === 'vendor' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(401);
    next(new Error('Not authorized as a vendor'));
  }
};

// Blocks unapproved vendors from mutating products
// Admin always passes
const approvedVendor = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  if (req.user && req.user.role === 'vendor') {
    if (req.user.isVerified) {
      return next();
    }
    res.status(403);
    return next(new Error('Your account must be verified before you can upload or manage products.'));
  }
  res.status(401);
  next(new Error('Not authorized as a vendor'));
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401);
    next(new Error('Not authorized as an admin'));
  }
};

export { protect, vendor, approvedVendor, admin };

