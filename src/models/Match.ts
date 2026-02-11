import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
    requesterId: { type: Number, required: true },
    targetId: { type: Number, required: true },
    status: { type: String, default: 'PENDING', enum: ['PENDING', 'MATCHED', 'REJECTED'] },
    type: { type: String, default: 'NORMAL' }
}, { timestamps: true });

export const Match = mongoose.models.Match || mongoose.model('Match', matchSchema);