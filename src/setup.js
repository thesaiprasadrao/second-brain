import 'dotenv/config';
import * as p from '@clack/prompts';
import { writeFileSync, existsSync, readFileSync, rmSync } from 'fs';
import { createServer } from 'http';
import { spawn } from 'child_process';
import { google } from 'googleapis';
import open from 'open';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

const ENV_PATH = '.env';

const GOOGLE_SCOPES = {
  keep: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/keep',
  ],
  docs: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive.file',
  ],
};

function readEnv() {
  if (!existsSync(ENV_PATH)) return {};
  return Object.fromEntries(
    readFileSync(ENV_PATH, 'utf8')
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => l.split('=').map((s) => s.trim()))
  );
}

function writeEnv(vars) {
  const existing = readEnv();
  const merged = { ...existing, ...vars };
  writeFileSync(
    ENV_PATH,
    Object.entries(merged).map(([k, v]) => `${k}=${v}`).join('\n') + '\n'
  );
}

async function connectWhatsApp() {
  const s = p.spinner();
  for (let attempt = 0; attempt < 2; attempt++) {
    s.start('Connecting to WhatsApp…');

    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      version,
      browser: ['SecondBrain', 'Desktop', '1.0.0']
    });
    sock.ev.on('creds.update', saveCreds);

    try {
      await new Promise((resolve, reject) => {
        sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
          if (qr) {
            s.stop('Scan this QR code with WhatsApp:');
            qrcode.generate(qr, { small: true });
            s.start('Waiting for scan…');
          }
          if (connection === 'open') {
            s.stop('WhatsApp connected.');
            sock.end();
            resolve();
          }
          if (connection === 'close') {
            const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (code === DisconnectReason.loggedOut) {
              reject(new Error('WhatsApp logged out.'));
            }
          }
        });
      });
      return;
    } catch (err) {
      sock.end();
      if (err?.message !== 'WhatsApp logged out.' || attempt === 1) {
        s.stop(err?.message || 'WhatsApp connection failed.');
        throw err;
      }

      s.stop('Logged out. Clearing auth and retrying…');
      rmSync('auth', { recursive: true, force: true });
    }
  }
}

async function googleOAuth(clientId, clientSecret, backend) {
  const scopes = GOOGLE_SCOPES[backend];
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost:4242/callback');
  const authUrl = oauth2.generateAuthUrl({ access_type: 'offline', scope: scopes });

  p.log.info('Opening browser for Google OAuth…');
  await open(authUrl);

  const code = await new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost:4242');
      const c = url.searchParams.get('code');
      res.end('Done. Return to terminal.');
      server.close();
      resolve(c);
    });
    server.listen(4242);
  });

  const { tokens } = await oauth2.getToken(code);
  return tokens.refresh_token;
}

export async function setup() {
  p.intro('Welcome to Second Brain');

  const channel = await p.select({
    message: 'Which channel should Second Brain use?',
    options: [
      { value: 'whatsapp', label: 'WhatsApp', hint: 'message yourself' },
      { value: 'telegram', label: 'Telegram', hint: 'bot + private chat' }
    ]
  });
  if (p.isCancel(channel)) process.exit(0);

  let selfChatJid = '';
  let telegramToken = '';
  let telegramChatId = '';

  if (channel === 'whatsapp') {
    await connectWhatsApp();

    const phoneNumber = await p.text({
      message: 'Your WhatsApp phone number (with country code, e.g. 919876543210)',
      validate: (v) => {
        if (!v || !/^\d{10,15}$/.test(v)) return 'Enter digits only, 10-15 characters (e.g. 919876543210)';
      }
    });
    if (p.isCancel(phoneNumber)) process.exit(0);

    selfChatJid = `${phoneNumber}@s.whatsapp.net`;
  } else {
    telegramToken = await p.password({ message: 'Telegram bot token' });
    if (p.isCancel(telegramToken)) process.exit(0);

    telegramChatId = await p.text({
      message: 'Telegram chat ID (send /start to your bot, then paste the chat ID)',
      placeholder: '123456789',
      validate: (v) => {
        if (!v || !/^-?\d+$/.test(v)) return 'Enter a numeric chat ID (e.g. 123456789)';
      }
    });
    if (p.isCancel(telegramChatId)) process.exit(0);
  }

  const groqKey = await p.password({ message: 'Groq API key' });
  if (p.isCancel(groqKey)) process.exit(0);

  const backend = await p.select({
    message: 'Where should notes be saved?',
    options: [
      { value: 'keep', label: 'Google Keep', hint: 'one note per entry' },
      { value: 'docs', label: 'Google Docs', hint: 'one doc per category, entries appended' },
    ],
  });
  if (p.isCancel(backend)) process.exit(0);

  const googleClientId = await p.text({ message: 'Google OAuth Client ID' });
  if (p.isCancel(googleClientId)) process.exit(0);

  const googleClientSecret = await p.password({ message: 'Google OAuth Client Secret' });
  if (p.isCancel(googleClientSecret)) process.exit(0);

  const refreshToken = await googleOAuth(googleClientId, googleClientSecret, backend);

  writeEnv({
    GROQ_API_KEY: groqKey,
    STORAGE_BACKEND: backend,
    GOOGLE_CLIENT_ID: googleClientId,
    GOOGLE_CLIENT_SECRET: googleClientSecret,
    GOOGLE_REFRESH_TOKEN: refreshToken,
    BRIEFING_TIME: '08:00',
    CHANNEL: channel,
    SELF_CHAT_JID: selfChatJid,
    TELEGRAM_BOT_TOKEN: telegramToken,
    TELEGRAM_CHAT_ID: telegramChatId,
  });

  p.outro('All done. Starting Second Brain in the background…');

  const child = spawn(process.execPath, ['src/index.js'], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });
  child.unref();
}

// Run setup when this file is executed directly
setup().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
