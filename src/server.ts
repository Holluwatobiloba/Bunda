import express from 'express';
import { bot } from './bot';
import { env } from './config/env';
import { connectDB } from './config/db';

const app = express();

const startServer = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');
    
    bot.launch();
    console.log('Bunda is Live on Telegram!');

    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();