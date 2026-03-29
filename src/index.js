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

function startTUI(sock, selfJid) {
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
  const sock = makeWASocket({ auth: state, logger, version });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log('Scan the QR code above with WhatsApp.');
    }

    if (connection === 'close') {
      const shouldReconnect =
        new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      log.info(`Connection closed. Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) connect();
      else { log.error('Logged out. Delete auth/ and restart.'); process.exit(1); }
    }

    if (connection === 'open') {
      log.info('WhatsApp connected.');
      startCron(sock);
      const selfJid = sock.user?.id?.replace(/:.*@/, '@');
      startTUI(sock, selfJid);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.key.fromMe) continue;
      const jid = msg.key.remoteJid;
      if (!jid?.endsWith('@s.whatsapp.net')) continue;
      const selfJid = sock.user?.id?.replace(/:.*@/, '@');
      if (jid !== selfJid) continue;

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
        const reply = await pipeline(msg, sock);
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
