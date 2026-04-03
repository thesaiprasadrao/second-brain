import 'dotenv/config';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import readline from 'readline';
import { saveMessage } from './db.js';
import { pipeline } from './pipeline.js';
import { startCron } from './cron.js';
import { log } from './logger.js';
import { startTelegram } from './telegram.js';

const logger = pino({ level: 'fatal' });

// Suppress libsignal noise
const NOISE = ['Bad MAC', 'Failed to decrypt', 'Closing open session', 'Closing session:'];
const _stdoutWrite = process.stdout.write.bind(process.stdout);
const _stderrWrite = process.stderr.write.bind(process.stderr);
const isNoise = (chunk) => typeof chunk === 'string' && NOISE.some((n) => chunk.includes(n));
process.stdout.write = (chunk, ...args) => isNoise(chunk) ? true : _stdoutWrite(chunk, ...args);
process.stderr.write = (chunk, ...args) => isNoise(chunk) ? true : _stderrWrite(chunk, ...args);

let tuiStarted = false;
let cronStarted = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
const processedMessages = new Set();
const MAX_PROCESSED = 500;
const lastSeen = new Map();
const DEDUPE_WINDOW_MS = 2000;
const MAX_SEEN = 500;

function isWhatsAppEnabled() {
  return (process.env.CHANNEL ?? 'whatsapp') === 'whatsapp';
}

function startTUI(sock, selfJid) {
  if (tuiStarted) return;
  tuiStarted = true;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\nSecond Brain is running. Type a message and press Enter (Ctrl+C to exit).\n');
  console.log('Use /send <message> to send to WhatsApp. Default is local TUI processing.\n');

  const prompt = () => rl.question('> ', async (input) => {
    const text = input.trim();
    if (!text) return prompt();

    if (text.startsWith('/send ')) {
      const message = text.slice(6).trim();
      if (!message) return prompt();
      await sock.sendMessage(selfJid, { text: message });
      return prompt();
    }

    await handleLocalMessage(text, sock, selfJid);
    prompt();
  });

  prompt();
}

async function handleLocalMessage(text, sock, selfJid) {
  saveMessage('user', text);
  log.info(`TUI in: ${text}`);

  try {
    const reply = await pipeline({ message: { conversation: text } });
    if (reply) {
      saveMessage('assistant', reply);
      log.info(`TUI out: ${reply}`);
      console.log(`\n← ${reply}\n> `);
    }
  } catch (err) {
    log.error(`TUI pipeline: ${err.message}`);
    try {
      await sock.sendMessage(selfJid, { text: 'Something went wrong. Try again.' });
    } catch (sendErr) {
      log.error(`TUI error send failed: ${sendErr.message}`);
    }
  }
}

async function connect() {
  if (!isWhatsAppEnabled()) return null;
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();
  
  const sock = makeWASocket({ 
    auth: state, 
    logger, 
    version,
    // Improved connection stability settings
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    markOnlineOnConnect: false,
    getMessage: async (key) => {
      // Return empty message to avoid conflicts
      return { conversation: "" };
    },
    // Add browser info to reduce disconnections
    browser: ['SecondBrain', 'Desktop', '1.0.0'],
    // Reduce message retry frequency
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 3
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log('Scan the QR code above with WhatsApp.');
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      log.info(`Connection closed (${code}). Reconnecting: ${shouldReconnect}`);

      if (!shouldReconnect) {
        log.error('Logged out. Delete auth/ and restart.');
        process.exit(1);
      }

      // Add exponential backoff for reconnection stability
      if (reconnectTimer) return;
      const backoffDelay = Math.min(5000 * Math.pow(2, reconnectAttempts), 60000);
      reconnectAttempts++;
      
      log.info(`Waiting ${backoffDelay}ms before reconnect (attempt ${reconnectAttempts})`);
      
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, backoffDelay);
    }

    if (connection === 'open') {
      log.info('WhatsApp connected.');
      reconnectAttempts = 0; // Reset on successful connection
      if (!cronStarted) { startCron(sock); cronStarted = true; }
      const selfJid = sock.user?.id?.replace(/:.*@/, '@');
      startTUI(sock, selfJid);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.key.fromMe) continue;
      
      const jid = msg.key.remoteJid;
      
      // Use configured SELF_CHAT_JID from .env
      const selfJid = process.env.SELF_CHAT_JID;
      
      if (!selfJid) {
        log.error('SELF_CHAT_JID not configured in .env - run setup or add manually');
        continue;
      }
      
      // Process self-chat and linked-device self messages
      const isSelfChat = jid === selfJid || (jid?.endsWith('@lid') && msg.key.fromMe);
      
      log.info(`Message check - jid: ${jid}, selfJid: ${selfJid}, isSelfChat: ${isSelfChat}`);
      
      if (!isSelfChat) continue;

      const msgId = msg.key?.id;
      if (msgId && processedMessages.has(msgId)) continue;

      if (msgId) {
        processedMessages.add(msgId);
        if (processedMessages.size > MAX_PROCESSED) {
          const oldest = processedMessages.values().next().value;
          processedMessages.delete(oldest);
        }
      }

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        null;

      const mediaType = msg.message?.audioMessage
        ? 'audio'
        : msg.message?.imageMessage
        ? 'image'
        : null;

      if (!text && !mediaType) continue;

      const dedupeKey = `${jid}:${text ?? `[${mediaType}]`}`;
      const now = Date.now();
      const last = lastSeen.get(dedupeKey);
      if (last && now - last < DEDUPE_WINDOW_MS) continue;
      lastSeen.set(dedupeKey, now);
      if (lastSeen.size > MAX_SEEN) {
        const oldest = lastSeen.keys().next().value;
        lastSeen.delete(oldest);
      }

      saveMessage('user', text ?? `[${mediaType}]`);
      log.info(`MSG  in: ${text ?? `[${mediaType}]`}`);

      try {
        const reply = await pipeline(msg);
        if (reply) {
          log.info(`Generated reply: ${reply}`);
          try {
            log.info(`Attempting to send to JID: ${jid}`);
            const result = await sock.sendMessage(jid, { text: reply });
            log.info(`Send result: ${JSON.stringify(result)}`);
            saveMessage('assistant', reply);
            log.info(`MSG out: ${reply}`);
            console.log(`\n← ${reply}\n> `);
          } catch (sendErr) {
            log.error(`Send failed: ${sendErr.message}`);
            log.error(`Send error stack: ${sendErr.stack}`);
            console.log(`\nFailed to send: ${reply}\nError: ${sendErr.message}\n> `);
          }
        } else {
          log.info(`Pipeline returned null/empty reply`);
        }
      } catch (err) {
        log.error(`Pipeline: ${err.message}`);
        log.error(`Pipeline error stack: ${err.stack}`);
        try {
          await sock.sendMessage(jid, { text: 'Something went wrong. Try again.' });
        } catch (sendErr) {
          log.error(`Error message send failed: ${sendErr.message}`);
        }
      }
    }
  });

  return sock;
}

const channel = (process.env.CHANNEL ?? 'whatsapp').toLowerCase();

if (channel === 'telegram') {
  const bot = startTelegram();
  if (!bot) process.exit(1);
  if (!cronStarted) {
    startCron({
      sendMessage: async (_jid, message) => {
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!chatId) return;
        await bot.sendMessage(chatId, message.text ?? '');
      }
    });
    cronStarted = true;
  }
} else {
  connect().catch((err) => {
    log.error(`Fatal: ${err.message}`);
    process.exit(1);
  });
}
