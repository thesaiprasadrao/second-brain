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

function startTUI(sock, selfJid) {
  if (tuiStarted) return;
  tuiStarted = true;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\nSecond Brain is running. Type a message and press Enter (Ctrl+C to exit).\n');

  const prompt = () => rl.question('> ', async (input) => {
    const text = input.trim();
    if (!text) return prompt();
    await sock.sendMessage(selfJid, { text });
    prompt();
  });

  prompt();
}

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();
  
  const sock = makeWASocket({ 
    auth: state, 
    logger, 
    version,
    // Add connection stability options
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    markOnlineOnConnect: false
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
      const backoffDelay = Math.min(2000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts++;
      
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
      // Debug logging
      log.info(`Message received - fromMe: ${msg.key.fromMe}, jid: ${msg.key.remoteJid}, type: ${type}`);
      
      if (!msg.key.fromMe) continue;
      const jid = msg.key.remoteJid;
      const selfJid = sock.user?.id?.replace(/:.*@/, '@');
      
      log.info(`JID check - jid: ${jid}, selfJid: ${selfJid}, match: ${jid === selfJid}`);
      
      // Handle both @s.whatsapp.net and @lid formats for self-messages
      const isDirectChat = jid?.endsWith('@s.whatsapp.net');
      const isSelfLinkedDevice = jid?.endsWith('@lid');
      
      if (!isDirectChat && !isSelfLinkedDevice) continue;
      
      // For linked device messages (@lid), they're automatically self-messages when fromMe=true
      // For direct chats (@s.whatsapp.net), check if it matches our JID
      if (isDirectChat && jid !== selfJid) continue;

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

      saveMessage('user', text ?? `[${mediaType}]`);
      log.info(`MSG  in: ${text ?? `[${mediaType}]`}`);

      try {
        const reply = await pipeline(msg);
        if (reply) {
          await sock.sendMessage(jid, { text: reply });
          saveMessage('assistant', reply);
          log.info(`MSG out: ${reply}`);
          console.log(`\n← ${reply}\n> `);
        }
      } catch (err) {
        log.error(`Pipeline: ${err.message}`);
        await sock.sendMessage(jid, { text: 'Something went wrong. Try again.' });
      }
    }
  });

  return sock;
}

connect().catch((err) => {
  log.error(`Fatal: ${err.message}`);
  process.exit(1);
});
