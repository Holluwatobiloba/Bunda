import { Context, Scenes, Telegraf, session } from 'telegraf';
import { env } from '../config/env';
import { registerScene } from './scenes/register.scene';
import { editScene } from './scenes/edit.scene';

// 1. The Fix: Explicitly define session and scene so TypeScript is happy
interface MyContext extends Context {
  session: any;
  scene: Scenes.SceneContextScene<MyContext, Scenes.SceneSessionData>;
}

// 2. Initialize the bot with the new Context type
const bot = new Telegraf<MyContext>(env.BOT_TOKEN);

// 3. Create the Stage to manage your scenes
const stage = new Scenes.Stage<MyContext>([registerScene, editScene]);

// 4. Important Middleware order
bot.use(session()); // Session MUST come before Stage
bot.use(stage.middleware());

// --- YOUR EXISTING BOT LOGIC START ---
bot.start((ctx) => {
  ctx.reply('Welcome to Bunda! Use /register to get started.');
});

bot.command('register', (ctx) => ctx.scene.enter('register_scene'));
bot.command('edit', (ctx) => ctx.scene.enter('edit_scene'));
// --- YOUR EXISTING BOT LOGIC END ---

export default bot;