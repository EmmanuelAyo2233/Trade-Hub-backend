import Admin from '../models/Admin.js';
import { pool } from '../config/db.js';
import WalletTransaction from '../models/WalletTransactionModel.js';
import sequelize from '../config/sequelize.js';

// @desc    Get all non-admin users
export const getUsers = async (req, res, next) => {
  try {
    const users = await Admin.getAllNonAdmins();
    
    const mapped = users.map(u => ({
      _id: u.id,
      email: u.email,
      role: u.role,
      isActive: u.isActive === 1,
      name: u.role === 'vendor' ? u.vendorName : u.buyerName,
      storeName: u.storeName,
      isApproved: u.isVerified === 1,
      isVerified: u.isVerified === 1,
      verificationStatus: u.verificationStatus || 'unsubmitted',
      fullName: u.fullName,
      phoneNumber: u.phoneNumber,
      residentialAddress: u.residentialAddress,
      businessAddress: u.businessAddress,
      businessName: u.businessName,
      businessCategory: u.businessCategory,
      businessDescription: u.businessDescription,
      cacNumber: u.cacNumber,
      taxIdentificationNumber: u.taxIdentificationNumber,
      idDocument: u.idDocument,
      selfiePhoto: u.selfiePhoto,
      rejectionReason: u.rejectionReason
    }));
    
    res.json(mapped);
  } catch(e) {
    next(e);
  }
};

// @desc    Ban or Reactivate a user
export const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    await Admin.updateUserStatus(id, isActive);
    res.json({ message: 'User status updated successfully' });
  } catch(e) {
    next(e);
  }
};

// @desc    Approve or Disapprove a Vendor
export const toggleVendorApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;
    await Admin.updateVendorApproval(id, isApproved);
    res.json({ message: 'Vendor approval successfully verified' });
  } catch(e) {
    next(e);
  }
};

// @desc    Get platform-wide stats
export const platformStats = async (req, res, next) => {
  try {
    const [[counts]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM Users WHERE role='buyer') as totalBuyers,
        (SELECT COUNT(*) FROM Users WHERE role='vendor') as totalVendors,
        (SELECT COUNT(*) FROM Orders) as totalOrders,
        (SELECT COALESCE(SUM(totalPrice),0) FROM Orders WHERE isPaid=1) as totalRevenue,
        (SELECT COUNT(*) FROM Orders WHERE status='pending') as pendingOrders,
        (SELECT COUNT(*) FROM Orders WHERE status='delivered') as deliveredOrders,
        (SELECT COUNT(*) FROM Products) as totalProducts
    `);

    // Platform commission from WalletTransactions
    const [commResult] = await sequelize.query(`
      SELECT COALESCE(SUM(amount),0) as totalCommission
      FROM WalletTransactions WHERE type='commission' AND status='completed'
    `, { type: sequelize.QueryTypes.SELECT });

    const [escrowResult] = await sequelize.query(`
      SELECT COALESCE(SUM(netAmount),0) as totalEscrow
      FROM WalletTransactions WHERE type='escrow_in' AND status='pending'
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({
      ...counts,
      totalCommission: parseFloat(commResult?.totalCommission) || 0,
      totalEscrow: parseFloat(escrowResult?.totalEscrow) || 0,
    });
  } catch(e) {
    next(e);
  }
};

// @desc    Get platform wallet (all commission transactions)
export const platformWallet = async (req, res, next) => {
  try {
    const txns = await WalletTransaction.findAll({
      where: { type: 'commission' },
      order: [['createdAt', 'DESC']],
      limit: 100,
      raw: true,
    });

    const [summary] = await sequelize.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type='commission' AND status='completed' THEN amount ELSE 0 END),0) as totalCommission,
        COALESCE(SUM(CASE WHEN type='escrow_in' AND status='pending' THEN netAmount ELSE 0 END),0) as totalEscrowPending,
        COALESCE(SUM(CASE WHEN type='escrow_release' AND status='completed' THEN netAmount ELSE 0 END),0) as totalReleased
      FROM WalletTransactions
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({
      wallet: {
        totalCommission: parseFloat(summary?.totalCommission) || 0,
        totalEscrowPending: parseFloat(summary?.totalEscrowPending) || 0,
        totalReleased: parseFloat(summary?.totalReleased) || 0,
      },
      transactions: txns.map(tx => ({
        _id: tx.id,
        type: tx.type,
        amount: parseFloat(tx.amount),
        orderId: tx.orderId,
        userId: tx.userId,
        description: tx.description,
        createdAt: tx.createdAt,
      })),
    });
  } catch(e) {
    next(e);
  }
};

// @desc    Get all vendors
export const getVendors = async (req, res, next) => {
  try {
    const [vendors] = await pool.query(`
      SELECT u.id as userId, u.email as userEmail, u.createdAt as userCreatedAt, u.isActive,
             vp.*,
             (SELECT COUNT(*) FROM Products WHERE vendorId = u.id) as productCount,
             (SELECT COUNT(*) FROM Orders WHERE vendorId = u.id) as orderCount
      FROM Users u
      JOIN VendorProfiles vp ON u.id = vp.userId
      WHERE u.role = 'vendor'
      ORDER BY u.createdAt DESC
    `);
    res.json(vendors.map(v => ({ 
      ...v, 
      _id: v.userId, 
      email: v.userEmail, 
      kycEmail: v.email,
      isActive: v.isActive === 1, 
      isVerified: v.isVerified === 1,
      isApproved: v.isVerified === 1 
    })));
  } catch(e) {
    next(e);
  }
};

// @desc    Approve or Reject a Vendor KYC Verification
export const reviewVendorKYC = async (req, res, next) => {
  try {
    const { id } = req.params; // userId of the vendor
    const { action, rejectionReason } = req.body; // action: 'approve' | 'reject'
    
    if (!action || !['approve', 'reject'].includes(action)) {
      res.status(400);
      return next(new Error('Invalid review action. Must be approve or reject.'));
    }
    
    const adminId = req.user._id;
    const isVerified = action === 'approve';
    const verificationStatus = action === 'approve' ? 'approved' : 'rejected';
    const reason = action === 'reject' ? (rejectionReason || 'No reason provided') : null;
    const verifiedAt = new Date();

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Update VendorProfiles
      await connection.query(`
        UPDATE VendorProfiles SET
          isVerified = ?,
          isApproved = ?,
          verificationStatus = ?,
          rejectionReason = ?,
          verifiedAt = ?,
          verifiedBy = ?
        WHERE userId = ?
      `, [isVerified ? 1 : 0, isVerified ? 1 : 0, verificationStatus, reason, verifiedAt, adminId, id]);

      await connection.commit();
      res.json({ message: `Vendor KYC has been successfully ${verificationStatus}.` });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (e) {
    next(e);
  }
};

// @desc    Get all buyers
export const getBuyers = async (req, res, next) => {
  try {
    const [buyers] = await pool.query(`
      SELECT u.id, u.email, u.createdAt, u.isActive,
             bp.name, bp.location, bp.avatar,
             (SELECT COUNT(*) FROM Orders WHERE buyerId = u.id) as orderCount
      FROM Users u
      JOIN BuyerProfiles bp ON u.id = bp.userId
      WHERE u.role = 'buyer'
      ORDER BY u.createdAt DESC
    `);
    res.json(buyers.map(b => ({ ...b, _id: b.id, isActive: b.isActive === 1 })));
  } catch(e) {
    next(e);
  }
};
