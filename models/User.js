import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';

class User {
  static async getFullProfile(userId) {
    const [users] = await pool.query('SELECT * FROM Users WHERE id = ?', [userId]);
    if (users.length === 0) return null;
    const user = users[0];
    delete user.password;
    
    if (user.role === 'vendor') {
        const [profiles] = await pool.query('SELECT name, storeName, storeSlug, storeDescription, location, avatar, isApproved FROM VendorProfiles WHERE userId = ?', [userId]);
        return { ...user, _id: user.id, ...(profiles[0] || {}), isApproved: profiles[0]?.isApproved === 1 };
    } else if (user.role === 'buyer') {
        const [profiles] = await pool.query('SELECT name, location, avatar FROM BuyerProfiles WHERE userId = ?', [userId]);
        return { ...user, _id: user.id, ...(profiles[0] || {}) };
    } else {
        return { ...user, _id: user.id, name: 'Super Admin' };
    }
  }

  static async findByEmail(email) {
    const [users] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
    return users.length > 0 ? users[0] : null;
  }

  static async findById(id) {
    const [users] = await pool.query('SELECT * FROM Users WHERE id = ?', [id]);
    return users.length > 0 ? users[0] : null;
  }

  static async createWithProfile({ email, password, role, name, vendorSlug, vendorDescription }) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userRole = role || 'buyer';

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const [result] = await connection.query(
          'INSERT INTO Users (email, password, role) VALUES (?, ?, ?)',
          [email, hashedPassword, userRole]
        );
        const userId = result.insertId;

        if (userRole === 'vendor') {
            await connection.query(
                'INSERT INTO VendorProfiles (userId, name, storeName, storeSlug, storeDescription) VALUES (?, ?, ?, ?, ?)',
                [userId, name, name, vendorSlug, vendorDescription]
            );
        } else {
            await connection.query(
                'INSERT INTO BuyerProfiles (userId, name) VALUES (?, ?)',
                [userId, name]
            );
        }

        await connection.commit();
        return userId;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
  }

  static async getPasswordForUpdate(userId) {
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.query('SELECT password FROM Users WHERE id = ? FOR UPDATE', [userId]);
      return users[0]?.password;
    } finally {
      connection.release();
    }
  }

  static async updateProfile(userId, { user, reqBody, avatarPath }) {
    const { name, email, location, storeName, storeDescription, currentPassword, newPassword } = reqBody;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      if (newPassword) {
         if (!currentPassword) {
              throw new Error('Please provide your current password to set a new one');
         }
         const [users] = await connection.query('SELECT password FROM Users WHERE id = ? FOR UPDATE', [userId]);
         const isMatch = await bcrypt.compare(currentPassword, users[0].password);
         if (!isMatch) {
              const err = new Error('Current password is incorrect');
              err.status = 401;
              throw err;
         }
         const salt = await bcrypt.genSalt(10);
         const hashedPassword = await bcrypt.hash(newPassword, salt);
         await connection.query('UPDATE Users SET password = ? WHERE id = ?', [hashedPassword, userId]);
      }

      if (email) {
        await connection.query('UPDATE Users SET email = ? WHERE id = ?', [email, userId]);
      }

      if (user.role === 'vendor') {
        await connection.query(
            'UPDATE VendorProfiles SET name = ?, location = ?, storeName = ?, storeDescription = ?, avatar = ? WHERE userId = ?',
            [name || user.name, location || user.location, storeName || user.storeName, storeDescription || user.storeDescription, avatarPath, userId]
        );
      } else if (user.role === 'buyer') {
        await connection.query(
            'UPDATE BuyerProfiles SET name = ?, location = ?, avatar = ? WHERE userId = ?',
            [name || user.name, location || user.location, avatarPath, userId]
        );
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  static async updateWalletBalance(userId, newBalance) {
    await pool.query('UPDATE Users SET walletBalance = ? WHERE id = ?', [newBalance, userId]);
  }
}

export default User;
