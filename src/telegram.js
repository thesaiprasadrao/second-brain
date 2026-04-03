import TelegramBot from 'node-telegram-bot-api';
import readline from 'readline';
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
  startTelegramTUI(bot, allowChatId);

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
    console.log(`\n→ ${text}\n> `);

    try {
      const reply = await pipeline({ message: { conversation: text } });
      if (!reply) return;

      await bot.sendMessage(chatId, reply);
      saveMessage('assistant', reply);
      log.info(`Telegram out: ${reply}`);
      console.log(`\n← ${reply}\n> `);
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

function startTelegramTUI(bot, chatId) {
  if (!chatId) return;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\nTelegram bridge active. Type a message and press Enter.\n');

  const prompt = () => rl.question('> ', async (input) => {
    const text = input.trim();
    if (!text) return prompt();

    try {
      await bot.sendMessage(chatId, text);
      log.info(`Telegram TUI out: ${text}`);
    } catch (err) {
      log.error(`Telegram TUI send failed: ${err.message}`);
    }
    prompt();
  });

  prompt();
}
