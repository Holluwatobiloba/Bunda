import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  userId: number;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  reason: string;
  idempotencyKey: string;
  metadata?: any;
}

const TransactionSchema = new Schema<ITransaction>({
  userId: { type: Number, required: true, index: true },
  type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  idempotencyKey: { type: String, required: true, unique: true },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);