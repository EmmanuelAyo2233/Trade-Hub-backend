import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/sequelize.js';

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('message', 'order', 'delivery', 'review', 'system'),
    defaultValue: 'system',
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  link: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  meta: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'Notifications',
  timestamps: true,
  updatedAt: false,
});

// ── Static methods ──

const formatNotif = (n) => ({
  _id: n.id,
  userId: n.userId,
  type: n.type,
  title: n.title,
  text: n.text,
  link: n.link,
  isRead: !!n.isRead,
  meta: n.meta,
  createdAt: n.createdAt,
});

Notification.getByUser = async function (userId, limit = 50) {
  const rows = await this.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit,
    raw: true,
  });
  return rows.map(formatNotif);
};

Notification.getUnreadCount = async function (userId) {
  return await this.count({ where: { userId, isRead: false } });
};

Notification.markAsRead = async function (notifId, userId) {
  await this.update({ isRead: true }, { where: { id: notifId, userId } });
};

Notification.markAllRead = async function (userId) {
  await this.update({ isRead: true }, { where: { userId, isRead: false } });
};

Notification.createNotification = async function ({ userId, type, title, text, link, meta }) {
  const notif = await this.create({ userId, type, title, text, link, meta });
  return formatNotif(notif.get({ plain: true }));
};

export default Notification;
