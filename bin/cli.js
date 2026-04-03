#!/usr/bin/env node
import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { existsSync } from 'fs';
import { pipeline } from '../src/pipeline.js';
import { saveMessage } from '../src/db.js';
import { log } from '../src/logger.js';
import { showDashboard } from '../src/dashboard.js';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'setup') {
  const { setup } = await import('../src/setup.js');
  await setup();
} else if (command === 'send') {
  const text = args.slice(1).join(' ').trim();
  if (!text) {
    console.log('Usage: second-brain send <message>');
    process.exit(1);
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!token || !chatId) {
    console.log('Error: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID required in .env');
    process.exit(1);
  }

  const bot = new TelegramBot(token, { polling: false });

  try {
    // Save user message
    saveMessage('user', text);
    log.info(`CLI in: ${text}`);
    console.log(`→ ${text}`);

    // Process through pipeline
    const reply = await pipeline({ message: { conversation: text } });
    
    if (reply) {
      // Save assistant response
      saveMessage('assistant', reply);
      log.info(`CLI out: ${reply}`);
      
      // Send to Telegram
      await bot.sendMessage(chatId, reply);
      console.log(`← ${reply}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    log.error(`CLI error: ${err.message}`);
    try {
      await bot.sendMessage(chatId, 'Something went wrong. Try again.');
    } catch (sendErr) {
      log.error(`CLI send failed: ${sendErr.message}`);
    }
    process.exit(1);
  }
} else if (command === 'dashboard' || !command) {
  // Check if configured
  if (!existsSync('.env')) {
    console.log('\n🚀 Welcome to Second Brain!\n');
    console.log('Let\'s get you set up. Run:\n');
    console.log('   npm run setup\n');
    process.exit(0);
  }
  
  // Show dashboard
  await showDashboard();
  
  // Start server
  await import('../src/index.js');
} else {
  await import('../src/index.js');
}
