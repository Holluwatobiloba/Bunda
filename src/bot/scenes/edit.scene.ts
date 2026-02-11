import { Scenes, Markup } from 'telegraf';
import { User } from '../../models/User';
import axios from 'axios';

export const editScene = new Scenes.BaseScene<any>('EDIT_SCENE');

const mainKeyboard = Markup.keyboard([['🚀 Feed', '👤 Profile'], ['💳 Wallet', '🆘 Help']]).resize();

// HELPER: Get City Name
async function getCityFromCoords(lat: number, lon: number) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
        const res = await axios.get(url, { headers: { 'User-Agent': 'BundaBot/1.0' }, timeout: 5000 });
        const addr = res.data.address;
        const city = addr.city || addr.town || addr.village || addr.county || 'Unknown City';
        return `${city}, ${addr.state || addr.country || ''}`;
    } catch (e) {
        return 'GPS Location';
    }
}

editScene.enter(async (ctx) => {
  const user: any = (ctx as any).dbUser;
  await ctx.reply('⚙️ Edit Mode Enabled', mainKeyboard);
  await sendEditMenu(ctx, user);
});

async function sendEditMenu(ctx: any, user: any) {
  const locDisplay = user.manualLocationText || "Not Set";
  const bioDisplay = user.bio || "No bio set";

  await ctx.reply(
    `📝 <b>Current Profile</b>\n\n` +
    `<b>Name:</b> ${user.firstName}\n` +
    `<b>Age:</b> ${user.age}\n` +
    `<b>Location:</b> ${locDisplay}\n` +
    `<b>Bio:</b> <i>${bioDisplay}</i>`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('👤 Name', 'edit_name'), Markup.button.callback('🎂 Age', 'edit_age')],
        [Markup.button.callback('🖼️ Photo', 'edit_photo'), Markup.button.callback('📍 Location', 'edit_loc')],
        [Markup.button.callback('📝 Edit Bio', 'edit_bio'), Markup.button.callback('🔙 Done / Exit', 'exit_edit')]
      ])
    }
  );
}

// Handlers
editScene.action('edit_name', (ctx) => { ctx.session.editStep = 'name'; ctx.reply('Type new Name:', mainKeyboard); });
editScene.action('edit_age', (ctx) => { ctx.session.editStep = 'age'; ctx.reply('Type new Age:', mainKeyboard); });
editScene.action('edit_photo', (ctx) => { ctx.session.editStep = 'photo'; ctx.reply('📸 Upload new Photo:', mainKeyboard); });
editScene.action('edit_bio', (ctx) => { ctx.session.editStep = 'bio'; ctx.reply('📝 Type a short Bio about yourself:', mainKeyboard); });

editScene.action('edit_loc', async (ctx) => {
  ctx.session.editStep = 'loc';
  await ctx.reply('📍 Share GPS or type city:', { ...Markup.keyboard([[Markup.button.locationRequest('📍 GPS')], ['🔙 Cancel']]).resize() });
});

editScene.action('exit_edit', (ctx) => { ctx.reply('✅ Saved.', mainKeyboard); return ctx.scene.leave(); });

// Handle GPS
editScene.on('location', async (ctx) => {
    if (ctx.session.editStep === 'loc') {
        const { latitude, longitude } = ctx.message.location;
        await ctx.reply('🔄 Detecting city...');
        const realAddress = await getCityFromCoords(latitude, longitude);

        await User.updateOne({ telegramId: ctx.from.id }, { 
            locationMode: 'GPS', 
            location: { type: 'Point', coordinates: [longitude, latitude] }, 
            manualLocationText: realAddress 
        });
        
        await ctx.reply(`✅ Location Updated: ${realAddress}`, mainKeyboard);
        ctx.session.editStep = null;
        const user = await User.findOne({ telegramId: ctx.from.id });
        await sendEditMenu(ctx, user);
    }
});

// Handle Photo
editScene.on('photo', async (ctx) => {
    if (ctx.session.editStep === 'photo') {
        const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        await User.updateOne({ telegramId: ctx.from.id }, { photoFileId: photoId });
        await ctx.reply('✅ Photo Updated!', mainKeyboard);
        ctx.session.editStep = null;
        const user = await User.findOne({ telegramId: ctx.from.id });
        await sendEditMenu(ctx, user);
    }
});

// Handle Text (Name, Age, Loc, Bio)
editScene.on('text', async (ctx) => {
  const txt = ctx.message.text;
  if (['🚀 Feed', '👤 Profile', '💳 Wallet', '🆘 Help'].includes(txt)) return ctx.scene.leave();
  if (txt === '🔙 Cancel') { ctx.session.editStep = null; return ctx.scene.reenter(); }
  
  const step = ctx.session.editStep;
  if (!step) return;

  if (step === 'name') await User.updateOne({ telegramId: ctx.from.id }, { firstName: txt });
  else if (step === 'age') await User.updateOne({ telegramId: ctx.from.id }, { age: parseInt(txt) });
  else if (step === 'loc') await User.updateOne({ telegramId: ctx.from.id }, { manualLocationText: txt });
  else if (step === 'bio') await User.updateOne({ telegramId: ctx.from.id }, { bio: txt });

  ctx.reply(`✅ Updated!`);
  ctx.session.editStep = null;
  const user = await User.findOne({ telegramId: ctx.from.id });
  await sendEditMenu(ctx, user);
});