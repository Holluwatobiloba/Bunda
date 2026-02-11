import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/env';
import { connectDB } from './config/db';
import { bot } from './bot';
import logger from './utils/logger';
import { LedgerService } from './services/ledger.service';
import crypto from 'crypto';
import './jobs/heartbeat.job';
import './jobs/janitor.job';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }));

app.post('/webhooks/paystack', async (req, res) => {
  const hash = crypto.createHmac('sha512', config.PAYSTACK_SECRET_KEY).update(JSON.stringify(req.body)).digest('hex');
  if (hash !== req.headers['x-paystack-signature']) return res.status(401).send('Invalid Signature');
  
  const event = req.body;
  if (event.event === 'charge.success') {
    const { reference, metadata, amount } = event.data;
    const userId = metadata?.telegramId;
    const tokens = Math.floor((amount / 100) / config.TOKEN_PRICE_NGN);
    if (userId && tokens > 0) {
      await LedgerService.processTransaction(parseInt(userId), tokens, 'PAYSTACK_CREDIT', reference);
    }
  }
  res.sendStatus(200);
});

const start = async () => {
  await connectDB();
  if (config.NODE_ENV === 'production') {
    app.use(bot.webhookCallback(`/telegraf/${config.BOT_TOKEN}`));
  } else {
    bot.launch(() => logger.info('🤖 Bot Polling Started'));
  }
  app.listen(config.PORT, () => logger.info(`🚀 Server running on port ${config.PORT}`));
};

start();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));