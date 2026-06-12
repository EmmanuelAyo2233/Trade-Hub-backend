import { pool } from '../config/db.js';

class Order {
  static async createOrder(orderData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [orderResult] = await connection.query(`
        INSERT INTO Orders (buyerId, vendorId, paymentMethod, itemsPrice, taxPrice, shippingPrice, totalPrice, shippingAddress, shippingCity, shippingPostalCode, shippingCountry)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderData.buyerId, orderData.vendorId, orderData.paymentMethod, orderData.itemsPrice,
        orderData.taxPrice, orderData.shippingPrice, orderData.totalPrice, orderData.shippingAddress,
        orderData.shippingCity, orderData.shippingPostalCode, orderData.shippingCountry
      ]);

      const orderId = orderResult.insertId;

      for (const item of orderData.orderItems) {
        await connection.query(`
          INSERT INTO OrderItems (orderId, productId, name, qty, image, price)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [orderId, item.product, item.name, item.qty, item.image, item.price]);

        // Reduce stock
        await connection.query(`
          UPDATE Products 
          SET countInStock = GREATEST(0, countInStock - ?) 
          WHERE id = ?
        `, [item.qty, item.product]);

        // Notify vendor if out of stock
        const [prodRows] = await connection.query(`SELECT name, countInStock, vendorId FROM Products WHERE id = ?`, [item.product]);
        if (prodRows.length > 0 && prodRows[0].countInStock === 0) {
          const Notification = (await import('./NotificationModel.js')).default;
          await Notification.createNotification({
            userId: prodRows[0].vendorId,
            type: 'system',
            title: 'Product Out of Stock',
            text: `Your product "${prodRows[0].name}" is now out of stock.`,
            link: '/vendor/products',
          });
        }
      }

      await connection.commit();
      
      const createdOrder = await this.getOrderByIdInternal(orderId, connection);
      return createdOrder;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getOrderByIdInternal(id, connectionInstance = pool) {
    const [orders] = await connectionInstance.query(`
      SELECT o.*, 
             bu.email as buyerEmail, bp.name as buyerName,
             vu.email as vendorEmail, vp.storeName as vendorName, vp.storeSlug as vendorSlug
      FROM Orders o
      JOIN Users bu ON o.buyerId = bu.id
      LEFT JOIN BuyerProfiles bp ON bu.id = bp.userId
      JOIN Users vu ON o.vendorId = vu.id
      JOIN VendorProfiles vp ON vu.id = vp.userId
      WHERE o.id = ?
    `, [id]);

    if (orders.length === 0) return null;

    const [items] = await connectionInstance.query(`
      SELECT oi.*, 
             (SELECT id FROM Reviews r WHERE r.orderId = oi.orderId AND r.productId = oi.productId) as reviewId,
             (SELECT rating FROM Reviews r WHERE r.orderId = oi.orderId AND r.productId = oi.productId) as reviewRating
      FROM OrderItems oi 
      WHERE oi.orderId = ?
    `, [id]);
    
    const o = orders[0];
    return {
      _id: o.id,
      buyer: { _id: o.buyerId, name: o.buyerName, email: o.buyerEmail },
      vendor: { _id: o.vendorId, name: o.vendorName, email: o.vendorEmail, vendorSlug: o.vendorSlug },
      orderItems: items,
      items: items,
      shippingAddress: o.shippingAddress,
      paymentMethod: o.paymentMethod,
      itemsPrice: o.itemsPrice,
      taxPrice: o.taxPrice,
      shippingPrice: o.shippingPrice,
      totalPrice: o.totalPrice,
      totalAmount: parseFloat(o.totalPrice),
      isPaid: o.isPaid === 1,
      paidAt: o.paidAt,
      isShipped: o.isShipped === 1,
      shippedAt: o.shippedAt,
      isDelivered: o.isDelivered === 1,
      deliveredAt: o.deliveredAt,
      confirmedAt: o.deliveredAt,
      status: o.status,
      shippingCity: o.shippingCity,
      shippingPostalCode: o.shippingPostalCode,
      shippingCountry: o.shippingCountry,
      createdAt: o.createdAt
    };
  }

  static async getOrderById(id) {
    return this.getOrderByIdInternal(id);
  }

  static async findBuyerOrders(buyerId) {
    const [orders] = await pool.query(`
      SELECT o.*, COALESCE(vp.name, 'Unknown Vendor') as vendorName,
             (SELECT image FROM OrderItems oi WHERE oi.orderId = o.id LIMIT 1) as firstItemImage,
             (SELECT SUM(qty) FROM OrderItems oi WHERE oi.orderId = o.id) as totalItems
      FROM Orders o
      LEFT JOIN VendorProfiles vp ON o.vendorId = vp.userId
      WHERE o.buyerId = ?
      ORDER BY o.createdAt DESC
    `, [buyerId]);

    return orders.map(o => ({
      ...o,
      _id: o.id,
      totalAmount: parseFloat(o.totalPrice),
      vendor: { _id: o.vendorId, name: o.vendorName },
      isPaid: o.isPaid === 1,
      isShipped: o.isShipped === 1,
      isDelivered: o.isDelivered === 1
    }));
  }

  static async findVendorOrders(vendorId) {
    const [orders] = await pool.query(`
      SELECT o.*, COALESCE(bp.name, bu.email) as buyerName,
             (SELECT image FROM OrderItems oi WHERE oi.orderId = o.id LIMIT 1) as firstItemImage,
             (SELECT SUM(qty) FROM OrderItems oi WHERE oi.orderId = o.id) as totalItems
      FROM Orders o
      JOIN Users bu ON o.buyerId = bu.id
      LEFT JOIN BuyerProfiles bp ON bu.id = bp.userId
      WHERE o.vendorId = ?
      ORDER BY o.createdAt DESC
    `, [vendorId]);

    return orders.map(o => ({
      ...o,
      _id: o.id,
      totalAmount: parseFloat(o.totalPrice),
      buyer: { _id: o.buyerId, name: o.buyerName },
      isPaid: o.isPaid === 1,
      isShipped: o.isShipped === 1,
      isDelivered: o.isDelivered === 1
    }));
  }

  static async findLastUnpaidOrder(buyerId) {
    const [orders] = await pool.query(`
      SELECT id FROM Orders
      WHERE buyerId = ? AND isPaid = 0
      ORDER BY createdAt DESC LIMIT 1
    `, [buyerId]);

    if (orders.length > 0) {
      return this.getOrderById(orders[0].id);
    }
    return null;
  }

  static async markShipped(id) {
    await pool.query('UPDATE Orders SET isShipped = 1, shippedAt = NOW(), status = "shipped" WHERE id = ?', [id]);
    return this.getOrderById(id);
  }

  static async markDelivered(id) {
    await pool.query('UPDATE Orders SET isDelivered = 1, deliveredAt = NOW(), status = "delivered" WHERE id = ?', [id]);
    return this.getOrderById(id);
  }

  static async markPaid(id, paymentResult) {
    await pool.query(`
      UPDATE Orders 
      SET isPaid = 1, paidAt = NOW(), status = "paid",
          paymentResultId = ?, paymentResultStatus = ?, paymentResultUpdateTime = ?, paymentResultEmailAddress = ?
      WHERE id = ?
    `, [
      paymentResult.id,
      paymentResult.status,
      paymentResult.update_time,
      paymentResult.email_address,
      id
    ]);
    return this.getOrderById(id);
  }

  static async updateOrderStatus(id, status) {
    await pool.query('UPDATE Orders SET status = ? WHERE id = ?', [status, id]);
    return this.getOrderById(id);
  }
}

export default Order;
