import { Telegram } from 'telegraf';
import { User } from '../models/User';
import logger from './logger';

export async function safeSendMessage(telegram: Telegram, userId: number, text: string) {
  try {
    await telegram.sendMessage(userId, text, { parse_mode: 'HTML' });
    return true;
  } catch (error: any) {
    // 403 = Blocked, 400 = Not Found
    if (error.response && (error.response.error_code === 403 || error.response.error_code === 400)) {
      logger.warn(`⚠️ User ${userId} blocked the bot/not found. Marking inactive.`);
      await User.updateOne({ telegramId: userId }, { verificationStatus: 'REJECTED' }); 
      return false;
    }
    logger.error(`Failed to send to ${userId}: ${error.message}`);
    return false;
  }
}