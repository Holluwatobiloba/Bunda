import mongoose from 'mongoose';
import { config } from './env';
import logger from '../utils/logger';

export const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    logger.info('✅ MongoDB Connected');
  } catch (error) {
    logger.error(error, '❌ MongoDB Connection Failed');
    process.exit(1);
  }
};