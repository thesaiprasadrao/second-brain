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
  
  // Start the TUI for local terminal interaction
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

    await handleIncomingMessage(text, bot, chatId);
  });

  return bot;
}

async function handleIncomingMessage(text, bot, chatId) {
  // Don't process messages from TUI - they'll be handled locally
  if (process.env.SKIP_TELEGRAM_ECHO === 'true') return;

  saveMessage('user', text);
  log.info(`Telegram in: ${text}`);
  console.log(`\n→ ${text}`);

  try {
    const reply = await pipeline({ message: { conversation: text } });
    if (!reply) return;

    await bot.sendMessage(chatId, reply);
    saveMessage('assistant', reply);
    log.info(`Telegram out: ${reply}`);
    console.log(`← ${reply}\n> `);
  } catch (err) {
    log.error(`Telegram pipeline: ${err.message}`);
    try {
      await bot.sendMessage(chatId, 'Something went wrong. Try again.');
    } catch (sendErr) {
      log.error(`Telegram send failed: ${sendErr.message}`);
    }
  }
}

function startTelegramTUI(bot, chatId) {
  if (!chatId) {
    log.warn('TELEGRAM_CHAT_ID not set - TUI disabled');
    return;
  }

  const rl = readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout,
    prompt: '> '
  });

  console.log('\n📱 Telegram bridge active. Type messages here and they sync with Telegram.\n');
  rl.prompt();

  rl.on('line', async (input) => {
    const text = input.trim();
    if (!text) {
      rl.prompt();
      return;
    }

    saveMessage('user', text);
    log.info(`TUI in: ${text}`);
    console.log(`  → ${text}`);

    try {
      // Send to Telegram so it appears in the chat
      await bot.sendMessage(chatId, text);
      
      // Process through pipeline
      const reply = await pipeline({ message: { conversation: text } });
      
      if (reply) {
        // Save and send reply
        saveMessage('assistant', reply);
        log.info(`TUI out: ${reply}`);
        
        await bot.sendMessage(chatId, reply);
        console.log(`  ← ${reply}`);
      }
    } catch (err) {
      log.error(`TUI error: ${err.message}`);
      console.log(`  ⚠️  Error: ${err.message}`);
    }
    
    rl.prompt();
  });

  rl.on('close', () => {
    log.info('TUI closed');
    process.exit(0);
  });
}
