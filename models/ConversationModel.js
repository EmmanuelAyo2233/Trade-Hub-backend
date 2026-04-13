import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  buyerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  vendorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  lastMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'Conversations',
  timestamps: true,
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['buyerId', 'vendorId'],
    },
  ],
});

// ── Static methods ──

Conversation.getOrCreate = async function (buyerId, vendorId) {
  const [conv] = await this.findOrCreate({
    where: { buyerId, vendorId },
    defaults: { buyerId, vendorId },
  });
  return conv;
};

Conversation.getUserConversations = async function (userId) {
  const rows = await sequelize.query(`
    SELECT c.id, c.buyerId, c.vendorId, c.lastMessage, c.lastMessageAt,
           bp.name as buyerName, bp.avatar as buyerAvatar,
           vp.name as vendorName, vp.storeName, vp.avatar as vendorAvatar,
           (SELECT COUNT(*) FROM Messages m WHERE m.conversationId = c.id AND m.isRead = 0 AND m.senderId != ?) as unreadCount
    FROM Conversations c
    LEFT JOIN BuyerProfiles bp ON c.buyerId = bp.userId
    LEFT JOIN VendorProfiles vp ON c.vendorId = vp.userId
    WHERE c.buyerId = ? OR c.vendorId = ?
    ORDER BY c.lastMessageAt DESC
  `, {
    replacements: [userId, userId, userId],
    type: sequelize.QueryTypes.SELECT,
  });

  return rows.map(r => ({
    _id: r.id,
    buyerId: r.buyerId,
    vendorId: r.vendorId,
    buyerName: r.buyerName || 'Buyer',
    buyerAvatar: r.buyerAvatar,
    vendorName: r.vendorName || r.storeName || 'Vendor',
    storeName: r.storeName,
    vendorAvatar: r.vendorAvatar,
    lastMessage: r.lastMessage,
    lastMessageAt: r.lastMessageAt,
    unreadCount: parseInt(r.unreadCount) || 0,
  }));
};

export default Conversation;
