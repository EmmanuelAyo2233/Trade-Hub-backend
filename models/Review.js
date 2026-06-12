import { pool } from '../config/db.js';

class Review {
  static async create({ productId, orderId, buyerId, rating, comment }) {
    const [result] = await pool.query(
      'INSERT INTO Reviews (productId, orderId, buyerId, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [productId, orderId, buyerId, rating, comment]
    );
    return this.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query(`
      SELECT r.*, 
             bp.name as buyerName, bp.avatar as buyerAvatar,
             p.name as productName, p.image as productImage
      FROM Reviews r
      JOIN Users u ON r.buyerId = u.id
      LEFT JOIN BuyerProfiles bp ON u.id = bp.userId
      JOIN Products p ON r.productId = p.id
      WHERE r.id = ?
    `, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async findByProductId(productId) {
    const [rows] = await pool.query(`
      SELECT r.*, 
             bp.name as buyerName, bp.avatar as buyerAvatar
      FROM Reviews r
      JOIN Users u ON r.buyerId = u.id
      LEFT JOIN BuyerProfiles bp ON u.id = bp.userId
      WHERE r.productId = ?
      ORDER BY r.createdAt DESC
    `, [productId]);
    return rows;
  }

  static async findByVendorId(vendorId) {
    const [rows] = await pool.query(`
      SELECT r.*, 
             bp.name as buyerName, bp.avatar as buyerAvatar,
             p.name as productName, p.image as productImage
      FROM Reviews r
      JOIN Users u ON r.buyerId = u.id
      LEFT JOIN BuyerProfiles bp ON u.id = bp.userId
      JOIN Products p ON r.productId = p.id
      WHERE p.vendorId = ?
      ORDER BY r.createdAt DESC
    `, [vendorId]);
    return rows;
  }

  static async findAll() {
    const [rows] = await pool.query(`
      SELECT r.*, 
             bp.name as buyerName, bp.avatar as buyerAvatar,
             p.name as productName, p.image as productImage,
             vp.storeName as vendorName, vp.storeSlug as vendorSlug
      FROM Reviews r
      JOIN Users bu ON r.buyerId = bu.id
      LEFT JOIN BuyerProfiles bp ON bu.id = bp.userId
      JOIN Products p ON r.productId = p.id
      JOIN Users vu ON p.vendorId = vu.id
      JOIN VendorProfiles vp ON vu.id = vp.userId
      ORDER BY r.createdAt DESC
    `);
    return rows;
  }
}

export default Review;
