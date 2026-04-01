import TelegramBot from 'node-telegram-bot-api';
import { pipeline } from './pipeline.js';
import { saveMessage } from './db.js';
import { log } from './logger.js';

function normalizeText(msg) {
  if (msg?.text) return msg.text.trim();
  if (msg?.caption) return msg.caption.trim();
  return null;
}

export function startTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    log.error('TELEGRAM_BOT_TOKEN not configured in .env');
    return null;
  }

  const allowChatId = process.env.TELEGRAM_CHAT_ID;
  const bot = new TelegramBot(token, { polling: true });

  bot.on('message', async (msg) => {
    const chatId = msg.chat?.id?.toString();
    if (!chatId) return;

    if (msg.chat?.type && msg.chat.type !== 'private') {
      log.info(`Telegram non-private chat ignored: ${chatId}`);
      return;
    }

    if (allowChatId && chatId !== allowChatId) {
      log.info(`Telegram message ignored from chat ${chatId}`);
      return;
    }

    const text = normalizeText(msg);
    if (!text) return;

    saveMessage('user', text);
    log.info(`Telegram in: ${text}`);

    try {
      const reply = await pipeline({ message: { conversation: text } });
      if (!reply) return;

      await bot.sendMessage(chatId, reply);
      saveMessage('assistant', reply);
      log.info(`Telegram out: ${reply}`);
    } catch (err) {
      log.error(`Telegram pipeline: ${err.message}`);
      try {
        await bot.sendMessage(chatId, 'Something went wrong. Try again.');
      } catch (sendErr) {
        log.error(`Telegram send failed: ${sendErr.message}`);
      }
    }
  });

  return bot;
}
