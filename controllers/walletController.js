import WalletTransaction, { PLATFORM_FEE_PERCENT } from '../models/WalletTransactionModel.js';

// @desc    Get vendor wallet summary + transactions
export const getMyWallet = async (req, res, next) => {
  try {
    const summary = await WalletTransaction.getWalletSummary(req.user._id);
    const transactions = await WalletTransaction.getTransactions(req.user._id);

    res.json({
      wallet: {
        ...summary,
        platformFeePercent: PLATFORM_FEE_PERCENT,
      },
      transactions,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Request a withdrawal
export const withdrawWallet = async (req, res, next) => {
  try {
    const { amount, bankName, accountNumber, accountName } = req.body;
    const amt = parseFloat(amount);

    if (!amt || amt <= 0) {
      res.status(400);
      return next(new Error('Invalid withdrawal amount'));
    }
    if (!bankName || !accountNumber || !accountName) {
      res.status(400);
      return next(new Error('Please provide complete bank details'));
    }

    const { newBalance } = await WalletTransaction.processWithdrawal(
      req.user._id,
      amt,
      { bankName, accountNumber, accountName }
    );

    res.json({
      message: 'Withdrawal request submitted successfully',
      newBalance,
    });
  } catch (err) {
    if (err.message.includes('Insufficient')) res.status(400);
    next(err);
  }
};

// @desc    Create escrow when buyer pays (called internally from order flow)
export const createEscrow = async (vendorId, orderId, totalPrice) => {
  await WalletTransaction.createEscrow(vendorId, orderId, totalPrice);
};

// @desc    Release escrow when order is delivered
export const releaseEscrow = async (vendorId, orderId) => {
  return await WalletTransaction.releaseEscrow(vendorId, orderId);
};
