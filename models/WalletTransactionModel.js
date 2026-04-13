import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/sequelize.js';

const WalletTransaction = sequelize.define('WalletTransaction', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('escrow_in', 'escrow_release', 'commission', 'withdrawal', 'refund'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'completed',
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  fee: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  netAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  bankName: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  accountNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  accountName: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'WalletTransactions',
  timestamps: true,
  updatedAt: false,
});

// ── Constants ──
const PLATFORM_FEE_PERCENT = 10;

// ── Static methods ──

// Get wallet summary for a vendor
WalletTransaction.getWalletSummary = async function (userId) {
  const [result] = await sequelize.query(`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'escrow_in' AND status = 'pending' THEN netAmount ELSE 0 END), 0) as pendingBalance,
      COALESCE(SUM(CASE WHEN type = 'escrow_release' AND status = 'completed' THEN netAmount ELSE 0 END), 0) as totalReleased,
      COALESCE(SUM(CASE WHEN type = 'commission' AND status = 'completed' THEN amount ELSE 0 END), 0) as totalCommission,
      COALESCE(SUM(CASE WHEN type = 'withdrawal' AND status = 'completed' THEN amount ELSE 0 END), 0) as totalWithdrawn,
      COALESCE(SUM(CASE WHEN type = 'refund' AND status = 'completed' THEN amount ELSE 0 END), 0) as totalRefunded
    FROM WalletTransactions
    WHERE userId = ?
  `, { replacements: [userId], type: sequelize.QueryTypes.SELECT });

  const data = result || {};
  const totalReleased = parseFloat(data.totalReleased) || 0;
  const totalWithdrawn = parseFloat(data.totalWithdrawn) || 0;
  const totalRefunded = parseFloat(data.totalRefunded) || 0;
  const pendingBalance = parseFloat(data.pendingBalance) || 0;
  const totalCommission = parseFloat(data.totalCommission) || 0;

  const availableBalance = totalReleased - totalWithdrawn;
  const totalEarned = totalReleased;

  return {
    availableBalance: Math.max(0, availableBalance),
    pendingBalance,
    totalEarned,
    totalWithdrawn,
    totalCommission,
    totalRefunded,
  };
};

// Get transactions list for a vendor
WalletTransaction.getTransactions = async function (userId, limit = 50) {
  const txns = await this.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit,
    raw: true,
  });

  return txns.map(tx => ({
    _id: tx.id,
    type: tx.type,
    status: tx.status,
    amount: parseFloat(tx.amount),
    fee: parseFloat(tx.fee),
    netAmount: parseFloat(tx.netAmount),
    balanceAfter: parseFloat(tx.balanceAfter),
    description: tx.description,
    orderId: tx.orderId,
    bankName: tx.bankName,
    accountNumber: tx.accountNumber,
    accountName: tx.accountName,
    createdAt: tx.createdAt,
  }));
};

// When buyer pays → create escrow_in (pending) for vendor
WalletTransaction.createEscrow = async function (vendorId, orderId, totalPrice, description) {
  const amount = parseFloat(totalPrice);
  const fee = Math.round((amount * PLATFORM_FEE_PERCENT / 100) * 100) / 100;
  const netAmount = amount - fee;

  await this.create({
    userId: vendorId,
    orderId,
    type: 'escrow_in',
    status: 'pending',
    amount,
    fee,
    netAmount,
    description: description || `Payment for Order #${orderId} (held in escrow)`,
  });
};

// When order is delivered → release escrow to vendor wallet
WalletTransaction.releaseEscrow = async function (vendorId, orderId) {
  // Find the pending escrow
  const escrow = await this.findOne({
    where: { userId: vendorId, orderId, type: 'escrow_in', status: 'pending' },
  });
  if (!escrow) return null;

  const amount = parseFloat(escrow.amount);
  const fee = parseFloat(escrow.fee);
  const netAmount = parseFloat(escrow.netAmount);

  // Get current summary for balance
  const summary = await this.getWalletSummary(vendorId);
  const newBalance = summary.availableBalance + netAmount;

  // Mark escrow as completed
  await escrow.update({ status: 'completed' });

  // Create commission record
  await this.create({
    userId: vendorId,
    orderId,
    type: 'commission',
    status: 'completed',
    amount: fee,
    fee: 0,
    netAmount: fee,
    description: `Platform fee (${PLATFORM_FEE_PERCENT}%) for Order #${orderId}`,
  });

  // Create release record
  await this.create({
    userId: vendorId,
    orderId,
    type: 'escrow_release',
    status: 'completed',
    amount,
    fee,
    netAmount,
    balanceAfter: newBalance,
    description: `Payment released for Order #${orderId}`,
  });

  return { netAmount, newBalance };
};

// Process withdrawal
WalletTransaction.processWithdrawal = async function (userId, amount, bankDetails) {
  const summary = await this.getWalletSummary(userId);
  if (amount > summary.availableBalance) {
    throw new Error('Insufficient available balance');
  }

  const newBalance = summary.availableBalance - amount;

  await this.create({
    userId,
    type: 'withdrawal',
    status: 'completed',
    amount,
    fee: 0,
    netAmount: amount,
    balanceAfter: newBalance,
    description: `Withdrawal to ${bankDetails.bankName} - ${bankDetails.accountNumber}`,
    bankName: bankDetails.bankName,
    accountNumber: bankDetails.accountNumber,
    accountName: bankDetails.accountName,
  });

  return { newBalance };
};

export { PLATFORM_FEE_PERCENT };
export default WalletTransaction;
