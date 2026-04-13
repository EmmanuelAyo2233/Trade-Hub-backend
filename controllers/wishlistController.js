import Wishlist from '../models/WishlistModel.js';

// @desc    Get user's wishlist
export const getWishlist = async (req, res, next) => {
  try {
    const items = await Wishlist.getByUser(req.user._id);
    res.json({ wishlist: items });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle product in wishlist (add/remove)
export const toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      res.status(400);
      return next(new Error('productId is required'));
    }
    const result = await Wishlist.toggle(req.user._id, productId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// @desc    Get wishlist product IDs for current user
export const getWishlistIds = async (req, res, next) => {
  try {
    const ids = await Wishlist.getUserIds(req.user._id);
    res.json({ ids });
  } catch (err) {
    next(err);
  }
};
