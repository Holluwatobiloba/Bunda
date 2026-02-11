import { Context, Scenes, Telegraf, session } from 'telegraf';
import { env } from '../config/env';
import { registerScene } from './scenes/register.scene';
import { editScene } from './scenes/edit.scene';

interface MyContext extends Context {
  session: any;
  scene: Scenes.SceneContextScene<MyContext, Scenes.SceneSessionData>;
}

const bot = new Telegraf<MyContext>(env.BOT_TOKEN);
const stage = new Scenes.Stage<MyContext>([registerScene, editScene]);

bot.use(session());
bot.use(stage.middleware());

bot.start((ctx) => ctx.reply('Welcome to Bunda! Use /register to get started.'));
bot.command('register', (ctx) => ctx.scene.enter('register_scene'));
bot.command('edit', (ctx) => ctx.scene.enter('edit_scene'));

export { bot };
