import { pool } from '../config/db.js';

class Vendor {
  static async findStoreBySlug(slug) {
    const [vp] = await pool.query(`
      SELECT vp.userId, vp.storeName, vp.storeSlug, vp.storeDescription, vp.avatar, vp.location, u.isActive, vp.isVerified, vp.verificationStatus
      FROM VendorProfiles vp
      JOIN Users u ON vp.userId = u.id
      WHERE vp.storeSlug = ?
    `, [slug]);
    
    return vp.length > 0 ? vp[0] : null;
  }

  static async getVendorStats(userId) {
    const [products] = await pool.query('SELECT COUNT(*) as count FROM Products WHERE vendorId = ?', [userId]);
    const [orders] = await pool.query(`
      SELECT totalPrice, status 
      FROM Orders 
      WHERE vendorId = ?
    `, [userId]);

    const completedOrders = orders.filter(o => ['completed', 'delivered'].includes(o.status));
    const totalSales = completedOrders.reduce((acc, o) => acc + parseFloat(o.totalPrice || 0), 0);

    const [users] = await pool.query('SELECT walletBalance FROM Users WHERE id = ?', [userId]);

    const [reviews] = await pool.query(`
      SELECT COUNT(*) as count, COALESCE(AVG(rating), 0) as avgRating
      FROM Reviews r
      JOIN Products p ON r.productId = p.id
      WHERE p.vendorId = ?
    `, [userId]);

    return {
      productsCount: products[0].count,
      ordersCount: orders.length,
      totalSales,
      walletBalance: users.length > 0 ? parseFloat(users[0].walletBalance) : 0,
      avgRating: parseFloat(reviews[0].avgRating || 0),
      reviewsCount: reviews[0].count
    };
  }
}

export default Vendor;
