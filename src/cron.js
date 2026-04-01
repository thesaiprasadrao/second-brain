import cron from 'node-cron';
import { getTodayEvents } from './actions/gcal.js';
import { getOverdueTasks } from './actions/gtasks.js';
import { getCapturesSince } from './db.js';

const [briefingHour, briefingMinute] = (process.env.BRIEFING_TIME ?? '08:00').split(':');

export function startCron(sock) {
  // Morning briefing
  cron.schedule(`${briefingMinute} ${briefingHour} * * *`, () => sendBriefing(sock));

  // Weekly nudge — Monday 9am
  cron.schedule('0 9 * * 1', () => sendWeeklyNudge(sock));

  // Weekly idea digest — Sunday 6pm
  cron.schedule('0 18 * * 0', () => sendIdeaDigest(sock));
}

async function sendBriefing(sock) {
  const jid = getTargetJid();
  if (!jid) return;

  const [events, overdue] = await Promise.all([getTodayEvents(), getOverdueTasks()]);

  const lines = ['*Good morning. Here\'s your day:*\n'];

  if (events.length) {
    lines.push('*Today\'s events:*');
    events.forEach((e) => lines.push(`• ${e.summary} — ${formatTime(e.start.dateTime ?? e.start.date)}`));
  } else {
    lines.push('No events today.');
  }

  if (overdue.length) {
    lines.push('\n*Overdue tasks:*');
    overdue.forEach((t) => lines.push(`• ${t.title} (${t.listTitle})`));
  }

  await sock.sendMessage(jid, { text: lines.join('\n') });
}

async function sendWeeklyNudge(sock) {
  const jid = getTargetJid();
  if (!jid) return;

  const overdue = await getOverdueTasks();
  if (!overdue.length) return;

  const lines = ['*Weekly nudge — unresolved tasks:*\n'];
  overdue.forEach((t) => lines.push(`• ${t.title} (${t.listTitle})`));

  await sock.sendMessage(jid, { text: lines.join('\n') });
}

async function sendIdeaDigest(sock) {
  const jid = getTargetJid();
  if (!jid) return;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const captures = getCapturesSince(since);
  if (!captures.length) return;

  const top = captures.slice(0, 5);
  const lines = ['*Idea digest — last 7 days:*\n'];

  top.forEach((c) => {
    const summary = c.body ? ` — ${c.body}` : '';
    lines.push(`• ${c.title}${summary} (${c.category})`);
  });

  if (captures.length > top.length) {
    lines.push(`\n${captures.length - top.length} more ideas captured.`);
  }

  await sock.sendMessage(jid, { text: lines.join('\n') });
}

function getTargetJid() {
  if ((process.env.CHANNEL ?? 'whatsapp') === 'telegram') {
    return process.env.TELEGRAM_CHAT_ID ?? null;
  }
  return process.env.SELF_CHAT_JID ?? null;
}


function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
