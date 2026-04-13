import { pool } from '../config/db.js';

class Dispute {
  static async create(orderId, buyerId, vendorId, reason) {
    const [result] = await pool.query(
      'INSERT INTO Disputes (orderId, buyerId, vendorId, reason) VALUES (?, ?, ?, ?)',
      [orderId, buyerId, vendorId, reason]
    );
    return this.findById(result.insertId);
  }

  static async findByOrderId(orderId) {
    const [disputes] = await pool.query('SELECT * FROM Disputes WHERE orderId = ?', [orderId]);
    return disputes.length > 0 ? disputes[0] : null;
  }

  static async findById(id) {
    const [disputes] = await pool.query(`
      SELECT d.*, 
             bu.email as buyerEmail, bp.name as buyerName,
             vu.email as vendorEmail, vp.storeName as vendorName, vp.storeSlug as vendorSlug,
             o.totalPrice, o.createdAt as orderCreatedAt
      FROM Disputes d
      JOIN Users bu ON d.buyerId = bu.id
      LEFT JOIN BuyerProfiles bp ON bu.id = bp.userId
      JOIN Users vu ON d.vendorId = vu.id
      JOIN VendorProfiles vp ON vu.id = vp.userId
      JOIN Orders o ON d.orderId = o.id
      WHERE d.id = ?
    `, [id]);

    if (disputes.length === 0) return null;

    const d = disputes[0];
    return {
      _id: d.id,
      buyer: { _id: d.buyerId, name: d.buyerName, email: d.buyerEmail },
      vendor: { _id: d.vendorId, name: d.vendorName, email: d.vendorEmail, vendorSlug: d.vendorSlug },
      order: { _id: d.orderId, totalPrice: d.totalPrice, createdAt: d.orderCreatedAt },
      reason: d.reason,
      status: d.status,
      resolutionNotes: d.resolutionNotes,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    };
  }

  static async findByBuyerId(buyerId) {
    const [disputes] = await pool.query(`
      SELECT d.*, 
             bu.email as buyerEmail, bp.name as buyerName,
             vu.email as vendorEmail, vp.storeName as vendorName, vp.storeSlug as vendorSlug,
             o.totalPrice, o.createdAt as orderCreatedAt
      FROM Disputes d
      JOIN Users bu ON d.buyerId = bu.id
      LEFT JOIN BuyerProfiles bp ON bu.id = bp.userId
      JOIN Users vu ON d.vendorId = vu.id
      JOIN VendorProfiles vp ON vu.id = vp.userId
      JOIN Orders o ON d.orderId = o.id
      WHERE d.buyerId = ?
      ORDER BY d.createdAt DESC
    `, [buyerId]);

    return disputes.map(d => ({
      _id: d.id,
      buyer: { _id: d.buyerId, name: d.buyerName, email: d.buyerEmail },
      vendor: { _id: d.vendorId, name: d.vendorName, email: d.vendorEmail, vendorSlug: d.vendorSlug },
      order: { _id: d.orderId, totalPrice: d.totalPrice, createdAt: d.orderCreatedAt },
      reason: d.reason,
      status: d.status,
      resolutionNotes: d.resolutionNotes,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }));
  }

  static async findAll() {
    const [disputes] = await pool.query(`
      SELECT d.*, 
             bu.email as buyerEmail, bp.name as buyerName,
             vu.email as vendorEmail, vp.storeName as vendorName, vp.storeSlug as vendorSlug,
             o.totalPrice, o.createdAt as orderCreatedAt
      FROM Disputes d
      JOIN Users bu ON d.buyerId = bu.id
      LEFT JOIN BuyerProfiles bp ON bu.id = bp.userId
      JOIN Users vu ON d.vendorId = vu.id
      JOIN VendorProfiles vp ON vu.id = vp.userId
      JOIN Orders o ON d.orderId = o.id
    `);

    return disputes.map(d => ({
      _id: d.id,
      buyer: { _id: d.buyerId, name: d.buyerName, email: d.buyerEmail },
      vendor: { _id: d.vendorId, name: d.vendorName, email: d.vendorEmail, vendorSlug: d.vendorSlug },
      order: { _id: d.orderId, totalPrice: d.totalPrice, createdAt: d.orderCreatedAt },
      reason: d.reason,
      status: d.status,
      resolutionNotes: d.resolutionNotes,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }));
  }

  static async resolve(id, status, resolutionNotes) {
    await pool.query(
      'UPDATE Disputes SET status = ?, resolutionNotes = ? WHERE id = ?',
      [status, resolutionNotes, id]
    );
    return this.findById(id);
  }
}

export default Dispute;
