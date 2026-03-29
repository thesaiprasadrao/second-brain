import 'dotenv/config';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { saveMessage } from './db.js';
import { pipeline } from './pipeline.js';
import { startCron } from './cron.js';

const logger = pino({ level: 'silent' });

const log = {
  info: (msg) => console.log(`[${new Date().toISOString()}] INFO  ${msg}`),
  error: (msg) => console.error(`[${new Date().toISOString()}] ERROR ${msg}`),
};

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({ auth: state, logger, version });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrcode.generate(qr, { small: true });
      log.info('Scan the QR code above with WhatsApp.');
    }

    if (connection === 'close') {
      const shouldReconnect =
        new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      log.info(`Connection closed. Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) connect();
      else log.error('Logged out. Delete auth/ and restart.');
    }

    if (connection === 'open') {
      log.info('WhatsApp connected.');
      startCron(sock);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      // Only process messages sent from self to self (self-chat)
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

// Keep process alive
process.stdin.resume();
