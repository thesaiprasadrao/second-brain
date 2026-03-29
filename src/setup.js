import 'dotenv/config';
import * as p from '@clack/prompts';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { createServer } from 'http';
import { spawn } from 'child_process';
import { google } from 'googleapis';
import open from 'open';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { Client } from '@notionhq/client';

const ENV_PATH = '.env';

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
    Object.entries(merged)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n') + '\n'
  );
}

async function connectWhatsApp() {
  const s = p.spinner();
  s.start('Waiting for QR scan…');

  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), version });
  sock.ev.on('creds.update', saveCreds);

  return new Promise((resolve, reject) => {
    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        s.stop('Scan this QR code with WhatsApp:');
        qrcode.generate(qr, { small: true });
        s.start('Waiting for scan…');
      }
      if (connection === 'open') {
        const jid = sock.user?.id?.replace(/:.*@/, '@');
        s.stop('WhatsApp connected.');
        resolve({ sock, jid });
      }
      if (connection === 'close') {
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
        if (code !== DisconnectReason.loggedOut) return;
        s.stop('Connection closed.');
        reject(new Error('WhatsApp connection closed.'));
      }
    });
  });
}

async function googleOAuth(clientId, clientSecret) {
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost:4242/callback');
  const authUrl = oauth2.generateAuthUrl({ access_type: 'offline', scope: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/tasks'] });

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

async function seedNotionDbs(notionKey) {
  const notion = new Client({ auth: notionKey });
  const s = p.spinner();
  s.start('Setting up Notion workspace…');

  const root = await notion.search({ filter: { value: 'page', property: 'object' }, page_size: 1 });
  const parentId = root.results[0]?.id;
  if (!parentId) throw new Error('No Notion page found. Share at least one page with your integration.');

  const seeds = [
    { name: '📥 Inbox', desc: 'Unclassified captures and brain dumps' },
    { name: '💡 Ideas', desc: 'Ideas, startup thoughts, tools to try' },
    { name: '📓 Journal', desc: 'Reflections, thoughts, end-of-day notes' },
  ];

  const ids = {};
  for (const seed of seeds) {
    const db = await notion.databases.create({
      parent: { page_id: parentId },
      title: [{ text: { content: seed.name } }],
      properties: { Name: { title: {} }, Tags: { multi_select: {} } },
    });
    ids[seed.name] = db.id;
  }

  s.stop('Notion workspace ready.');
  return ids;
}

export async function setup() {
  p.intro('Welcome to Second Brain');

  // WhatsApp
  const { jid } = await connectWhatsApp();

  // API keys
  const groqKey = await p.password({ message: 'Groq API key' });
  if (p.isCancel(groqKey)) process.exit(0);

  const notionKey = await p.password({ message: 'Notion API key' });
  if (p.isCancel(notionKey)) process.exit(0);

  // Google OAuth
  const googleClientId = await p.text({ message: 'Google OAuth Client ID' });
  if (p.isCancel(googleClientId)) process.exit(0);

  const googleClientSecret = await p.password({ message: 'Google OAuth Client Secret' });
  if (p.isCancel(googleClientSecret)) process.exit(0);

  const refreshToken = await googleOAuth(googleClientId, googleClientSecret);

  // Seed Notion
  const dbIds = await seedNotionDbs(notionKey);

  // Write .env
  writeEnv({
    GROQ_API_KEY: groqKey,
    NOTION_API_KEY: notionKey,
    NOTION_INBOX_DB_ID: dbIds['📥 Inbox'],
    NOTION_IDEAS_DB_ID: dbIds['💡 Ideas'],
    NOTION_JOURNAL_DB_ID: dbIds['📓 Journal'],
    GOOGLE_CLIENT_ID: googleClientId,
    GOOGLE_CLIENT_SECRET: googleClientSecret,
    GOOGLE_REFRESH_TOKEN: refreshToken,
    BRIEFING_TIME: '08:00',
    SELF_CHAT_JID: jid,
  });

  p.outro('All done. Starting Second Brain in the background…');

  // Launch as background process — survives terminal close
  const child = spawn(process.execPath, ['src/index.js'], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });
  child.unref();
}
