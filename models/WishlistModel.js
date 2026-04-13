import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const Wishlist = sequelize.define('Wishlist', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'Wishlists',
  timestamps: true,
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'productId'],
    },
  ],
});

// ── Static methods ──

Wishlist.getByUser = async function (userId) {
  const items = await sequelize.query(`
    SELECT w.id, w.productId, w.createdAt,
           p.id as _id, p.name, p.description, p.price, p.image, p.category, p.countInStock, p.isActive,
           vp.storeName as vendorName, vp.storeSlug as vendorSlug
    FROM Wishlists w
    JOIN Products p ON w.productId = p.id
    LEFT JOIN VendorProfiles vp ON p.vendorId = vp.userId
    WHERE w.userId = ?
    ORDER BY w.createdAt DESC
  `, {
    replacements: [userId],
    type: sequelize.QueryTypes.SELECT,
  });

  return items.map(i => ({
    _id: i._id,
    wishlistId: i.id,
    name: i.name,
    description: i.description,
    price: i.price,
    images: [i.image || 'https://placehold.co/400x400/e2e8f0/94a3b8?text=No+Image'],
    category: i.category,
    stockQty: i.countInStock,
    isActive: i.isActive === 1,
    vendorId: i.vendorName ? { storeName: i.vendorName, storeSlug: i.vendorSlug } : undefined,
    addedAt: i.createdAt,
  }));
};

Wishlist.toggle = async function (userId, productId) {
  const existing = await this.findOne({ where: { userId, productId } });
  if (existing) {
    await existing.destroy();
    return { added: false };
  } else {
    await this.create({ userId, productId });
    return { added: true };
  }
};

Wishlist.isWishlisted = async function (userId, productId) {
  const count = await this.count({ where: { userId, productId } });
  return count > 0;
};

Wishlist.getUserIds = async function (userId) {
  const rows = await this.findAll({
    where: { userId },
    attributes: ['productId'],
    raw: true,
  });
  return rows.map(r => r.productId);
};

export default Wishlist;
