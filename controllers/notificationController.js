import Notification from '../models/NotificationModel.js';

// @desc    Get all notifications for current user
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.getByUser(req.user._id);
    const unreadCount = await Notification.getUnreadCount(req.user._id);
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
};

// @desc    Get unread count only
export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id);
    res.json({ unreadCount: count });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark a single notification as read
export const markAsRead = async (req, res, next) => {
  try {
    await Notification.markAsRead(parseInt(req.params.id), req.user._id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark all notifications as read
export const markAllRead = async (req, res, next) => {
  try {
    await Notification.markAllRead(req.user._id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
