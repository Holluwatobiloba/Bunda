import cron from 'node-cron';
import { User } from '../models/User';
import logger from '../utils/logger';
import { config } from '../config/env';

cron.schedule(`*/${config.HEARTBEAT_INTERVAL_MIN} * * * *`, async () => {
  try {
    const ghosts = await User.find({ isGhost: true });
    for (const ghost of ghosts) {
      if (Math.random() > 0.7) { ghost.lastActive = new Date(); await ghost.save(); }
    }
    logger.info('💓 Heartbeat Updated');
  } catch (e) { logger.error(e, 'Heartbeat Failed'); }
});