import cron from 'node-cron';
import { Match } from '../models/Match';
import { bot } from '../bot';
import logger from '../utils/logger';
import { config } from '../config/env';
import { safeSendMessage } from '../utils/telegramSafe';

cron.schedule(`0 */1 * * *`, async () => {
  const expiryDate = new Date(Date.now() - config.EXPIRATION_HOURS * 60 * 60 * 1000);
  const staleMatches = await Match.find({ status: 'PENDING', createdAt: { $lte: expiryDate } });

  for (const match of staleMatches) {
    match.status = 'EXPIRED';
    await match.save();
    await safeSendMessage(bot.telegram, match.requesterId, '⌛ <b>Request Expired</b>\nThe user did not respond.');
  }
  logger.info(`🧹 Janitor: Expired ${staleMatches.length} matches`);
});