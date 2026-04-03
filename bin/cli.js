#!/usr/bin/env node
import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { existsSync } from 'fs';
import { pipeline } from '../src/pipeline.js';
import { saveMessage } from '../src/db.js';
import { log } from '../src/logger.js';
import { showDashboard } from '../src/dashboard.js';
import {
  startDaemon,
  stopDaemon,
  deleteDaemon,
  restartDaemon,
  statusDaemon,
  logsDaemon,
} from '../src/daemon.js';

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
🧠 Second Brain CLI

Usage:
  2nd-brain setup           Start interactive setup
  2nd-brain start           Start the server (runs as daemon)
  2nd-brain stop            Stop the running server
  2nd-brain restart         Restart the server
  2nd-brain status          Show server status
  2nd-brain logs [N]        Show last N lines of logs (default: 50)
  2nd-brain send <message>  Send a message to your brain
  2nd-brain help            Show this help message
  `);
}

try {
  if (command === 'setup') {
    const { setup } = await import('../src/setup.js');
    await setup();
  } else if (command === 'start') {
    // Check if configured
    if (!existsSync('.env')) {
      console.log('❌ Not configured yet. Run: 2nd-brain setup');
      process.exit(1);
    }

    try {
      console.log('🚀 Starting Second Brain server...');
      await startDaemon();
      console.log('✓ Server started successfully!');
      console.log('\nUseful commands:');
      console.log('  2nd-brain status    - Check server status');
      console.log('  2nd-brain logs      - View server logs');
      console.log('  2nd-brain stop      - Stop the server');
      process.exit(0);
    } catch (err) {
      console.error(`❌ Failed to start server: ${err.message}`);
      process.exit(1);
    }
  } else if (command === 'stop') {
    try {
      console.log('🛑 Stopping Second Brain server...');
      await stopDaemon();
      console.log('✓ Server stopped successfully!');
      process.exit(0);
    } catch (err) {
      console.error(`❌ Failed to stop server: ${err.message}`);
      process.exit(1);
    }
  } else if (command === 'restart') {
    try {
      console.log('🔄 Restarting Second Brain server...');
      await restartDaemon();
      console.log('✓ Server restarted successfully!');
      process.exit(0);
    } catch (err) {
      console.error(`❌ Failed to restart server: ${err.message}`);
      process.exit(1);
    }
  } else if (command === 'status') {
    try {
      const status = await statusDaemon();
      if (!status) {
        console.log('❌ Server is not running');
        process.exit(1);
      }
      console.log('✓ Server Status:');
      console.log(`  Name: ${status.name}`);
      console.log(`  PID: ${status.pid}`);
      console.log(`  Status: ${status.pm2_env.status}`);
      console.log(`  Uptime: ${new Date(status.pm2_env.pm_uptime)}`);
      console.log(`  Restarts: ${status.pm2_env.restart_time}`);
      console.log(`  Memory: ${Math.round(status.monit.memory / 1024 / 1024)}MB`);
      process.exit(0);
    } catch (err) {
      console.error(`❌ Failed to get status: ${err.message}`);
      process.exit(1);
    }
  } else if (command === 'logs') {
    try {
      const lines = parseInt(args[1]) || 50;
      console.log(`📋 Last ${lines} lines of server logs:\n`);
      const logs = await logsDaemon(lines);
      console.log(logs);
      process.exit(0);
    } catch (err) {
      console.error(`❌ Failed to get logs: ${err.message}`);
      process.exit(1);
    }
  } else if (command === 'send') {
    const text = args.slice(1).join(' ').trim();
    if (!text) {
      console.log('Usage: 2nd-brain send <message>');
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
  } else if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  } else {
    // Default: show dashboard if no command
    // Check if configured
    if (!existsSync('.env')) {
      console.log('\n🚀 Welcome to Second Brain!\n');
      console.log('Let\'s get you set up. Run:\n');
      console.log('   2nd-brain setup\n');
      process.exit(0);
    }

    // Show dashboard
    await showDashboard();

    // Start server
    await import('../src/index.js');
  }
} catch (err) {
  console.error(`❌ Error: ${err.message}`);
  log.error(`CLI error: ${err.message}`);
  process.exit(1);
}
