import { Telegraf, Scenes, session, Markup } from 'telegraf';
import { config } from '../config/env';
import { authMiddleware } from './middlewares/auth.middleware';
import { registerScene } from './scenes/register.scene';
import { editScene } from './scenes/edit.scene';
import { User } from '../models/User';
import { MatchService } from '../services/match.service';
import { Match } from '../models/Match'; 

export const bot = new Telegraf(config.BOT_TOKEN);
const stage = new Scenes.Stage<any>([registerScene, editScene]);

bot.use(session());
bot.use(stage.middleware());
bot.use(authMiddleware);

bot.command('start', async (ctx) => {
  const user: any = (ctx as any).dbUser;
  const payload = (ctx as any).startPayload; 
  if (payload && payload.startsWith('ref_')) {
      const referrerId = parseInt(payload.replace('ref_', ''));
      if (!isNaN(referrerId)) ctx.session.referrerId = referrerId;
  }
  if (!user || !user.photoFileId || !user.interestedIn) return ctx.scene.enter('REGISTER_SCENE');
  ctx.reply(`👋 Welcome Back, ${user.firstName}!\n💰 Balance: ${user.walletBalance}`, Markup.keyboard([['🚀 Feed', '👤 Profile'], ['💳 Wallet', '🆘 Help']]).resize());
});

bot.command('reset', async (ctx) => {
    try {
        await User.deleteOne({ telegramId: ctx.from.id });
        ctx.session = undefined; 
        await ctx.reply('🔄 <b>Account Reset Successful!</b>\n\nType /start to register again.', { parse_mode: 'HTML' });
    } catch (e) { ctx.reply('⚠️ Error resetting account.'); }
});

bot.command('clearmatches', async (ctx) => {
    try {
        await Match.deleteMany({});
        await ctx.reply('🧹 All match history wiped clean! You can test afresh now.');
    } catch (e) { ctx.reply('⚠️ Error clearing matches.'); }
});

bot.hears('🚀 Feed', async (ctx) => { await showNextProfile(ctx); });

async function showNextProfile(ctx: any) {
  try {
    const user: any = ctx.dbUser;
    let genderFilter = {};
    if (user.interestedIn === 'Male') genderFilter = { gender: 'Male' };
    else if (user.interestedIn === 'Female') genderFilter = { gender: 'Female' };

    const candidates = await User.aggregate([
      { $match: { telegramId: { $ne: user.telegramId }, verificationStatus: { $in: ['APPROVED', 'PENDING'] }, ...genderFilter } },
      { $sample: { size: 1 } }
    ]);

    const candidate = candidates[0];
    if (!candidate) return ctx.reply('🔍 No new matches found. Try changing your filters!');

    let locText = candidate.manualLocationText || 'Nigeria';
    if (locText.includes('Enter')) locText = 'Hidden Location'; 

    const caption = `<b>${candidate.firstName}, ${candidate.age}</b>\n📍 ${locText}\n\n<i>${candidate.bio || 'Ready to chat...'}</i>`;
    const buttons = Markup.inlineKeyboard([[Markup.button.callback('👎 Pass', 'next_user'), Markup.button.callback('❤️ Connect (1 Token)', `req_${candidate.telegramId}`)]]);

    if (candidate.photoFileId) await ctx.replyWithPhoto(candidate.photoFileId, { caption, parse_mode: 'HTML', ...buttons });
    else if (candidate.videoFileId && candidate.videoFileId !== 'dummy_video_id') await ctx.replyWithVideo(candidate.videoFileId, { caption, parse_mode: 'HTML', ...buttons });
    else await ctx.replyWithPhoto('https://cdn-icons-png.flaticon.com/512/149/149071.png', { caption, parse_mode: 'HTML', ...buttons });
  } catch (e) { ctx.reply('⚠️ Error loading profile.'); }
}

bot.action('next_user', async (ctx) => {
  try { await ctx.answerCbQuery('Skipped 👎'); await showNextProfile(ctx); } catch (e) {}
});

bot.action(/req_(\d+)/, async (ctx) => {
  try {
      const targetId = Number(ctx.match[1]);
      const myId = Number(ctx.from!.id);
      const res = await MatchService.createRequest(myId, targetId, 'NORMAL');
      
      if (!res.success) return ctx.answerCbQuery(res.error || 'Error');
      
      if (res.status === 'MATCHED') {
          await ctx.answerCbQuery('🎉 MATCH!');
          
          const targetUser = await User.findOne({ telegramId: targetId });
          const targetName = targetUser ? targetUser.firstName : 'your match';
          const targetUsername = targetUser && targetUser.username ? targetUser.username : null;

          const myName = ctx.from!.first_name;
          const myUsername = ctx.from!.username ? ctx.from!.username : null;

          const icebreaker = encodeURIComponent("Hello! We just matched on Bunda 🧡");

          const myLinkToTarget = targetUsername 
              ? `https://t.me/${targetUsername}?text=${icebreaker}` 
              : `tg://user?id=${targetId}`;
              
          const targetLinkToMe = myUsername 
              ? `https://t.me/${myUsername}?text=${icebreaker}` 
              : `tg://user?id=${myId}`;

          const targetHandle = targetUsername ? `(@${targetUsername})` : '';
          const myHandle = myUsername ? `(@${myUsername})` : '';

          await ctx.reply(`🎉 <b>IT'S A MATCH!</b>\n\nYou and <b>${targetName}</b> ${targetHandle} liked each other!\n\n👇 Click below to send a DM.`, { 
              parse_mode: 'HTML',
              ...Markup.inlineKeyboard([[Markup.button.url(`💬 Chat with ${targetName}`, myLinkToTarget)]])
          });

          try { 
              await bot.telegram.sendMessage(targetId, `🎉 <b>IT'S A MATCH!</b>\n\n<b>${myName}</b> ${myHandle} just liked you back!\n\n👇 Click below to send a DM.`, { 
                  parse_mode: 'HTML',
                  ...Markup.inlineKeyboard([[Markup.button.url(`💬 Chat with ${myName}`, targetLinkToMe)]])
              }); 
          } catch (e) {}

      } else {
          await ctx.answerCbQuery('❤️ Request Sent!');
          await ctx.reply('✅ Request Sent! Loading next profile...');
          try { await bot.telegram.sendMessage(targetId, `❤️ <b>New Like!</b>\n\nSomeone just liked your profile! Open Feed to find them.`, { parse_mode: 'HTML' }); } catch (e) {}
      }
      await showNextProfile(ctx);
  } catch (e) { console.log(e); }
});

bot.hears('💳 Wallet', async (ctx) => {
  const user: any = (ctx as any).dbUser;
  await ctx.reply(`💰 <b>Balance: ${user.walletBalance} Tokens</b>`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('⭐ Buy 50 Tokens', 'buy_stars')], [Markup.button.callback('💸 Buy with Cash', 'buy_cash')], [Markup.button.callback('🚀 Invite Friends (+5 Tokens)', 'earn_tasks')]]) });
});

bot.action('earn_tasks', async (ctx) => {
    const user: any = (ctx as any).dbUser || await User.findOne({ telegramId: ctx.from.id });
    const refLink = `https://t.me/${ctx.botInfo.username}?start=ref_${user.telegramId}`;
    await ctx.reply(`💰 <b>Referral Link:</b>\n<code>${refLink}</code>`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.url('🚀 Share Now', `https://t.me/share/url?url=${refLink}&text=Join%20Bunda%20Dating!%20${refLink}`)]]) });
});

bot.action('buy_stars', (ctx) => ctx.replyWithInvoice({ title: '50 Bunda Tokens', description: 'Top up', payload: 'tokens_50_package', currency: 'XTR', prices: [{ label: '50 Tokens', amount: 50 }], provider_token: "" }));
bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));
bot.on('successful_payment', async (ctx) => {
    if (ctx.message.successful_payment.invoice_payload === 'tokens_50_package') { await User.updateOne({ telegramId: ctx.from.id }, { $inc: { walletBalance: 50 } }); ctx.reply('🎉 Payment Successful! 50 Tokens added.'); }
});
bot.action('buy_cash', (ctx) => ctx.reply('💸 Paystack Link: https://paystack.com/pay/test-bunda'));

bot.hears('👤 Profile', async (ctx) => {
  const user: any = (ctx as any).dbUser;
  const txt = `<b>👤 Name:</b> ${user.firstName}\n<b>🎂 Age:</b> ${user.age}\n<b>📍 Location:</b> ${user.manualLocationText || "Not Set"}\n\n<b>📝 Bio:</b> <i>${user.bio || "No bio set."}</i>\n<b>❤️ Interest:</b> ${user.interestedIn}`;
  const buttons = Markup.inlineKeyboard([[Markup.button.callback('✏️ Edit Details', 'enter_edit_mode')]]);
  if (user.photoFileId) await ctx.replyWithPhoto(user.photoFileId, { caption: txt, parse_mode: 'HTML', ...buttons });
  else await ctx.reply(txt, { parse_mode: 'HTML', ...buttons });
});

bot.action('enter_edit_mode', (ctx) => ctx.scene.enter('EDIT_SCENE'));
bot.hears('🆘 Help', (ctx) => ctx.reply('Support: @Bundabot_admin'));
bot.on('text', async (ctx) => {});
export default bot;