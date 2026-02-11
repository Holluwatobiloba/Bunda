import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  firstName: String,
  username: String,
  age: Number,
  gender: { type: String, enum: ['Male', 'Female'] },
  interestedIn: { type: String, enum: ['Male', 'Female', 'Both'], default: 'Both' },
  locationMode: { type: String, enum: ['GPS', 'MANUAL'] },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  },
  manualLocationText: String,
  
  // NEW: Photo Field
  photoFileId: String, 
  
  videoFileId: String,
  bio: String,
  verificationStatus: { type: String, default: 'PENDING' },
  walletBalance: { type: Number, default: 0 },
  chatPartnerId: Number,
  isGhost: { type: Boolean, default: false },
  
  // NEW: Referral System Fields
  referredBy: Number, 
  isReferralRewarded: { type: Boolean, default: false },
  
  lastActive: Date
});

export const User = mongoose.model('User', userSchema);