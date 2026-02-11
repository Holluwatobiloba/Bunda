import { Scenes, Markup } from 'telegraf';
import { User } from '../../models/User';
import { bot } from '../index'; 
import axios from 'axios';

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

export const registerScene = new Scenes.WizardScene<any>(
  'REGISTER_SCENE',

  // 1. Ask Age
  async (ctx) => {
    await ctx.reply('Welcome to BUNDA! Let\'s verify you.\n\nFirst, what is your Age?', Markup.removeKeyboard());
    return ctx.wizard.next();
  },

  // 2. Save Age & Ask Gender
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return ctx.reply('Please type a number.');
    const age = parseInt(ctx.message.text);
    if (isNaN(age) || age < 18 || age > 99) return ctx.reply('Please enter a valid age (18+).');
    
    ctx.wizard.state.age = age;
    await ctx.reply('Select your gender:', Markup.keyboard([['Male', 'Female']]).oneTime().resize());
    return ctx.wizard.next();
  },

  // 3. Save Gender & Ask Interest
  async (ctx) => {
    const gender = ctx.message?.text;
    if (!['Male', 'Female'].includes(gender)) return ctx.reply('Please use the buttons.');
    ctx.wizard.state.gender = gender;
    await ctx.reply('Who are you interested in meeting?', Markup.keyboard([['Women (Female)', 'Men (Male)'], ['Both']]).oneTime().resize());
    return ctx.wizard.next();
  },

  // 4. Save Interest & Ask Location
  async (ctx) => {
    let interest = ctx.message?.text;
    if (interest.includes('Women')) interest = 'Female';
    else if (interest.includes('Men')) interest = 'Male';
    else interest = 'Both';

    ctx.wizard.state.interestedIn = interest;

    await ctx.reply('📍 Location Setup:', Markup.keyboard([
        [Markup.button.locationRequest('📍 Share GPS Location')],
        ['✍️ Enter City Manually']
    ]).oneTime().resize());
    return ctx.wizard.next();
  },

  // 5. Handle Location
  async (ctx) => {
    if (ctx.message?.text && ctx.message.text.includes('Manually')) {
        ctx.wizard.state.locationMode = 'MANUAL';
        await ctx.reply('Okay, please TYPE your city name now (e.g. Lagos, Ikeja):', Markup.removeKeyboard());
        return; 
    }

    if (ctx.message?.location) {
        ctx.wizard.state.locationMode = 'GPS';
        const { latitude, longitude } = ctx.message.location;
        await ctx.reply('🔄 Detecting city...');
        const realAddress = await getCityFromCoords(latitude, longitude);
        
        ctx.wizard.state.location = { type: 'Point', coordinates: [longitude, latitude] };
        ctx.wizard.state.manualLocationText = realAddress;
        
        await ctx.reply(`✅ Detected: ${realAddress}`);
    } else if (ctx.message?.text) {
        ctx.wizard.state.locationMode = 'MANUAL';
        if (ctx.message.text.includes('Enter City')) return; 
        ctx.wizard.state.manualLocationText = ctx.message.text;
    } else {
        return ctx.reply('Please share location or type city name.');
    }

    await ctx.reply('📸 <b>Upload a Profile Photo:</b>\n\nSend a clear photo of yourself.', { 
        parse_mode: 'HTML',
        ...Markup.removeKeyboard() 
    });
    return ctx.wizard.next();
  },

  // 6. Save Photo & Ask Video
  async (ctx) => {
      const photo = ctx.message?.photo;
      if (!photo) return ctx.reply('⚠️ Please upload a PHOTO.');
      ctx.wizard.state.photoFileId = photo[photo.length - 1].file_id;
      
      await ctx.reply('📹 <b>Final Step:</b>\n\nRecord a 3-second Video Note (hold camera icon) saying "I am Real".', { parse_mode: 'HTML' });
      return ctx.wizard.next();
  },

  // 7. Save All & SHOW MENU AUTOMATICALLY
  async (ctx) => {
    const msg = ctx.message as any;
    const videoId = msg?.video_note?.file_id || msg?.video?.file_id;
    if (!videoId) return ctx.reply('⚠️ Please record a Video Note.');
    
    const referrerId = ctx.session.referrerId || null;

    await User.updateOne({ telegramId: ctx.from.id }, {
      telegramId: ctx.from.id,
      firstName: ctx.from.first_name,
      username: ctx.from.username,
      age: ctx.wizard.state.age,
      gender: ctx.wizard.state.gender,
      interestedIn: ctx.wizard.state.interestedIn,
      locationMode: ctx.wizard.state.locationMode,
      location: ctx.wizard.state.location,
      manualLocationText: ctx.wizard.state.manualLocationText,
      photoFileId: ctx.wizard.state.photoFileId,
      videoFileId: videoId,
      verificationStatus: 'PENDING',
      walletBalance: 5,
      referredBy: referrerId,
      lastActive: new Date()
    }, { upsert: true });

    if (referrerId && referrerId !== ctx.from.id) {
        try {
            await User.updateOne({ telegramId: referrerId }, { $inc: { walletBalance: 5 } });
            await bot.telegram.sendMessage(referrerId, `🎉 New Referral! +5 Tokens added!`);
        } catch (e) {}
    }

    // FIX: Send the Main Keyboard immediately!
    const mainKeyboard = Markup.keyboard([
        ['🚀 Feed', '👤 Profile'], 
        ['💳 Wallet', '🆘 Help']
    ]).resize();

    await ctx.reply('✅ Profile Submitted! You got 5 free tokens.', mainKeyboard);
    return ctx.scene.leave();
  }
);