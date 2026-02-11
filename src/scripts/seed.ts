import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { config } from '../config/env';

dotenv.config();

const ghosts = [
  { firstName: 'Sarah', age: 23, gender: 'Female', manualLocationText: 'Lagos, Lekki', bio: 'Loves beach vibes 🌊' },
  { firstName: 'Chinedu', age: 28, gender: 'Male', manualLocationText: 'Abuja, Central', bio: 'Crypto & Gym 💪' },
  { firstName: 'Amaka', age: 25, gender: 'Female', manualLocationText: 'Lagos, Ikeja', bio: 'Looking for something serious ❤️' },
  { firstName: 'Tunde', age: 30, gender: 'Male', manualLocationText: 'Ibadan', bio: 'Tech bro 🖥️' },
  { firstName: 'Jessica', age: 22, gender: 'Female', manualLocationText: 'Port Harcourt', bio: 'Student nurse 💉' },
  { firstName: 'Zainab', age: 24, gender: 'Female', manualLocationText: 'Kano', bio: 'Fashion designer 👗' },
  { firstName: 'Emeka', age: 27, gender: 'Male', manualLocationText: 'Enugu', bio: 'Business man 💼' },
  { firstName: 'Biodun', age: 29, gender: 'Male', manualLocationText: 'Lagos, Yaba', bio: 'Music lover 🎵' },
  { firstName: 'Fola', age: 26, gender: 'Female', manualLocationText: 'Lagos, VI', bio: 'Foodie 🍔' },
  { firstName: 'David', age: 31, gender: 'Male', manualLocationText: 'Abuja, Gwarinpa', bio: 'Real estate 🏠' }
];

const seed = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Delete old ghosts to clean up
    await User.deleteMany({ isGhost: true });
    console.log('🧹 Old ghosts removed.');

    // 2. Add new ghosts
    for (const g of ghosts) {
      await User.create({
        telegramId: Math.floor(Math.random() * 1000000000), // Fake ID
        ...g,
        locationMode: 'MANUAL',
        videoFileId: 'dummy_video_id', // This triggers the photo fallback in the bot
        verificationStatus: 'APPROVED',
        walletBalance: 50,
        isGhost: true,
        lastActive: new Date()
      });
    }

    console.log(`🎉 Successfully added ${ghosts.length} new users!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed Failed:', error);
    process.exit(1);
  }
};

seed();