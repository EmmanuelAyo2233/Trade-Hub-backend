import { pool } from '../config/db.js';

class Admin {
  static async getAllNonAdmins() {
    const [users] = await pool.query(`
      SELECT u.id, u.email, u.role, u.isActive,
             bp.name as buyerName,
             vp.name as vendorName, vp.storeName, vp.isApproved, vp.isVerified, vp.verificationStatus,
             vp.fullName, vp.phoneNumber, vp.residentialAddress, vp.businessAddress,
             vp.businessName, vp.businessCategory, vp.businessDescription,
             vp.cacNumber, vp.taxIdentificationNumber, vp.idDocument, vp.selfiePhoto, vp.rejectionReason
      FROM Users u
      LEFT JOIN BuyerProfiles bp ON u.id = bp.userId
      LEFT JOIN VendorProfiles vp ON u.id = vp.userId
      WHERE u.role != 'admin'
    `);
    return users;
  }

  static async updateUserStatus(userId, isActive) {
    await pool.query('UPDATE Users SET isActive = ? WHERE id = ?', [isActive ? 1 : 0, userId]);
  }

  static async updateVendorApproval(userId, isApproved) {
    const status = isApproved ? 'approved' : 'unsubmitted';
    await pool.query(`
      UPDATE VendorProfiles SET 
        isApproved = ?, 
        isVerified = ?, 
        verificationStatus = ? 
      WHERE userId = ?
    `, [isApproved ? 1 : 0, isApproved ? 1 : 0, status, userId]);
  }
}

export default Admin;
