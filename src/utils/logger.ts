import pino from 'pino';
import { config } from '../config/env';

const logger = pino({
  level: config.LOG_LEVEL,
  transport: config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  base: { pid: false },
});

export default logger;