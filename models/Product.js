import { pool } from '../config/db.js';

class Product {
  static async findAll({ search, category, minPrice, maxPrice, sort }) {
    let query = `
      SELECT p.id as _id, p.name, p.description, p.price, p.image, p.category, p.countInStock, p.isActive,
             COALESCE(vp.storeName, 'Anonymous Store') as vendorName, vp.storeSlug as vendorSlug
      FROM Products p
      LEFT JOIN VendorProfiles vp ON p.vendorId = vp.userId
      WHERE p.isActive = 1
    `;
    const params = [];

    if (search) {
      query += ` AND p.name LIKE ?`;
      params.push(`%${search}%`);
    }
    
    if (category) {
      query += ` AND p.category = ?`;
      params.push(category);
    }
    
    if (minPrice) {
      query += ` AND p.price >= ?`;
      params.push(parseFloat(minPrice));
    }
    
    if (maxPrice) {
      query += ` AND p.price <= ?`;
      params.push(parseFloat(maxPrice));
    }

    if (sort === 'price_asc') {
      query += ` ORDER BY p.price ASC`;
    } else if (sort === 'price_desc') {
      query += ` ORDER BY p.price DESC`;
    } else {
      query += ` ORDER BY p.id DESC`;
    }

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query(`
      SELECT p.id as _id, p.vendorId, p.name, p.description, p.price, p.image, p.category, p.countInStock, p.isActive, p.createdAt,
             vp.storeName as vendorName, vp.storeSlug as vendorSlug
      FROM Products p
      LEFT JOIN VendorProfiles vp ON p.vendorId = vp.userId
      WHERE p.id = ?
    `, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async findRawById(id) {
    const [rows] = await pool.query('SELECT * FROM Products WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async findByIds(idsArray) {
    const [rows] = await pool.query(`
      SELECT p.id as _id, p.name, p.description, p.price, p.image, p.category, p.countInStock, p.isActive,
             vp.storeName as vendorName, vp.storeSlug as vendorSlug
      FROM Products p
      JOIN VendorProfiles vp ON p.vendorId = vp.userId
      WHERE p.id IN (?)
    `, [idsArray]);
    return rows;
  }

  static async create({ vendorId, name, description, price, image, category, countInStock }) {
    const [result] = await pool.query(
      'INSERT INTO Products (vendorId, name, description, price, image, category, countInStock) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [vendorId, name, description, price, image, category, countInStock]
    );
    return result.insertId;
  }

  static async updateById(id, { name, price, description, category, countInStock, image }) {
    await pool.query(
      'UPDATE Products SET name = ?, price = ?, description = ?, category = ?, countInStock = ?, image = ? WHERE id = ?',
      [name, price, description, category, countInStock, image, id]
    );
  }

  static async deleteById(id) {
    await pool.query('DELETE FROM Products WHERE id = ?', [id]);
  }

  static async findByVendorId(vendorId) {
    const [rows] = await pool.query(`
      SELECT p.id as _id, p.name, p.description, p.price, p.image, p.category, p.countInStock, p.isActive
      FROM Products p
      WHERE p.vendorId = ?
    `, [vendorId]);
    return rows;
  }
}

export default Product;
