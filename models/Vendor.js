import { pool } from '../config/db.js';

class Vendor {
  static async findStoreBySlug(slug) {
    const [vp] = await pool.query(`
      SELECT vp.userId, vp.storeName, vp.storeSlug, vp.storeDescription, vp.avatar, vp.location, u.isActive, vp.isApproved
      FROM VendorProfiles vp
      JOIN Users u ON vp.userId = u.id
      WHERE vp.storeSlug = ?
    `, [slug]);
    
    return vp.length > 0 ? vp[0] : null;
  }

  static async getVendorStats(userId) {
    const [products] = await pool.query('SELECT COUNT(*) as count FROM Products WHERE vendorId = ?', [userId]);
    const [orders] = await pool.query(`
      SELECT o.totalAmount, o.status 
      FROM Orders o
      JOIN OrderItems oi ON o.id = oi.orderId
      JOIN Products p ON oi.productId = p.id
      WHERE p.vendorId = ?
    `, [userId]);

    const completedOrders = orders.filter(o => o.status === 'completed');
    const totalSales = completedOrders.reduce((acc, o) => acc + parseFloat(o.totalAmount), 0);

    const [users] = await pool.query('SELECT walletBalance FROM Users WHERE id = ?', [userId]);

    return {
      productsCount: products[0].count,
      ordersCount: orders.length,
      totalSales,
      walletBalance: users.length > 0 ? parseFloat(users[0].walletBalance) : 0,
    };
  }
}

export default Vendor;
