import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/sequelize.js';
import Conversation from './ConversationModel.js';

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  conversationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  isDelivered: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'Messages',
  timestamps: true,
  updatedAt: false,
});

// ── Static methods ──

const formatMsg = (m) => ({
  _id: m.id,
  conversationId: m.conversationId,
  senderId: m.senderId,
  content: m.content,
  imageUrl: m.imageUrl || null,
  isDelivered: !!m.isDelivered,
  isRead: !!m.isRead,
  createdAt: m.createdAt,
});

Message.getByConversation = async function (conversationId, limit = 100, offset = 0) {
  const messages = await this.findAll({
    where: { conversationId },
    order: [['createdAt', 'ASC']],
    limit,
    offset,
    raw: true,
  });
  return messages.map(formatMsg);
};

Message.send = async function (conversationId, senderId, content, imageUrl = null) {
  if (!content?.trim() && !imageUrl) throw new Error('Message content or image is required');

  const msg = await this.create({
    conversationId,
    senderId,
    content: content?.trim() || null,
    imageUrl,
  });

  const lastText = imageUrl && !content?.trim() ? '📷 Image' : content?.trim();
  await Conversation.update(
    { lastMessage: lastText, lastMessageAt: new Date() },
    { where: { id: conversationId } }
  );

  return formatMsg(msg.get({ plain: true }));
};

Message.markDelivered = async function (conversationId, deliveredToUserId) {
  await this.update(
    { isDelivered: true },
    {
      where: {
        conversationId,
        senderId: { [Op.ne]: deliveredToUserId },
        isDelivered: false,
      },
    }
  );
};

Message.markConversationRead = async function (conversationId, readByUserId) {
  await this.update(
    { isRead: true, isDelivered: true },
    {
      where: {
        conversationId,
        senderId: { [Op.ne]: readByUserId },
        isRead: false,
      },
    }
  );
};

Message.getUnreadCount = async function (userId) {
  const [result] = await sequelize.query(`
    SELECT COUNT(*) as count FROM Messages m
    JOIN Conversations c ON m.conversationId = c.id
    WHERE (c.buyerId = ? OR c.vendorId = ?)
      AND m.senderId != ?
      AND m.isRead = 0
  `, { replacements: [userId, userId, userId], type: sequelize.QueryTypes.SELECT });
  return parseInt(result?.count) || 0;
};

export default Message;
