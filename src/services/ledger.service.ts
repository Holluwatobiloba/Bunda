import mongoose from 'mongoose';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import logger from '../utils/logger';

export class LedgerService {
  static async processTransaction(
    userId: number,
    amount: number,
    reason: string,
    idempotencyKey: string,
    metadata: any = {}
  ): Promise<{ success: boolean; error?: string }> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const existingTx = await Transaction.findOne({ idempotencyKey }).session(session);
      if (existingTx) { await session.abortTransaction(); return { success: true }; }

      const user = await User.findOne({ telegramId: userId }).session(session);
      if (!user) throw new Error('User not found');

      if (amount < 0 && user.walletBalance + amount < 0) { throw new Error('Insufficient funds'); }

      user.walletBalance += amount;
      await user.save({ session });

      await Transaction.create([{
        userId,
        type: amount > 0 ? 'CREDIT' : 'DEBIT',
        amount: Math.abs(amount),
        reason,
        idempotencyKey,
        metadata
      }], { session });

      await session.commitTransaction();
      logger.info(`💰 Tx Success: ${userId} | ${amount}`);
      return { success: true };

    } catch (error: any) {
      await session.abortTransaction();
      logger.error(`Tx Failed: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      session.endSession();
    }
  }
}