import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  MONGO_URI: z.string().url(),
  BOT_TOKEN: z.string().min(10),
  OFFICIAL_CHANNEL_ID: z.string(), 
  ADMIN_IDS: z.string().transform((str) => str.split(',').map(Number)),
  PAYSTACK_SECRET_KEY: z.string().startsWith('sk_'),
  TOKEN_PRICE_NGN: z.string().transform(Number).default('100'),
  HEARTBEAT_INTERVAL_MIN: z.string().transform(Number).default('30'),
  JANITOR_INTERVAL_MIN: z.string().transform(Number).default('60'),
  EXPIRATION_HOURS: z.string().transform(Number).default('72'),
});

export const config = envSchema.parse(process.env);