import { Context, Middleware } from 'telegraf';
import { User } from '../../models/User';

export const authMiddleware: Middleware<Context> = async (ctx, next) => {
  if (!ctx.from) return;
  const user = await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { username: ctx.from.username, firstName: ctx.from.first_name, lastActive: new Date() },
    { upsert: true, new: true }
  );
  (ctx as any).dbUser = user;
  return next();
};