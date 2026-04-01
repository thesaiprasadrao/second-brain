import { preprocess } from './preprocessor.js';
import { buildContext, buildRecallContext } from './context.js';
import { classify, categorize, answerRecall } from './groq.js';
import { route } from './router.js';
import {
  savePending,
  getPending,
  updatePendingToCustom,
  clearPending,
  saveCaptureRecord,
  saveCaptureEmbedding,
  getRecentMessages
} from './db.js';
import { embed } from './embeddings.js';

const DIRECT_INTENTS = new Set(['add_task', 'add_list_item', 'create_event', 'set_reminder', 'query_schedule']);
const SKIP_ENRICH = new Set(['skip', 'no', 'nah', 'n']);
const MERGE_WINDOW_MS = 2 * 60 * 1000;
const GREETINGS = new Set(['hi', 'hey', 'hello', 'yo', 'sup']);
const CATEGORY_OVERRIDE = [
  /^add (it )?to (.+)$/i,
  /^save (it )?to (.+)$/i,
  /^put (it )?in (.+)$/i,
  /^move (it )?to (.+)$/i
];

function getStorage() {
  const backend = process.env.STORAGE_BACKEND ?? 'docs';
  return backend === 'keep'
    ? import('./actions/gkeep.js')
    : import('./actions/gdocs.js');
}

function today() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function saveCapture(category, title, body, source = 'chat') {
  const { saveCapture: save } = await getStorage();
  await save(category, title, body, today());
  const captureId = saveCaptureRecord({ title, body, category, source });
  try {
    const vector = await embed(`${title}\n${body ?? ''}`.trim());
    saveCaptureEmbedding(captureId, vector);
  } catch {
    // Embedding failures should not block capture
  }
}

export async function pipeline(msg) {
  const text = await preprocess(msg);
  if (!text) return null;

  if (isGreeting(text)) {
    clearPending();
    return 'Hey! How can I help?';
  }

  // Check pending state first
  const pending = getPending();

  if (pending?.step === 'awaiting_category') {
    const num = parseInt(text.trim(), 10);

    if (num >= 1 && num <= 3) {
      const category = pending.options[num - 1];
      await saveCapture(category, pending.title, pending.body);
      clearPending();
      return `Saved — ${category}: ${pending.title} (${today()})`;
    }

    if (num === 4) {
      updatePendingToCustom(pending.id);
      return 'What is it? Describe in a few words.';
    }

    // Non-numeric reply — treat as new message, clear pending
    clearPending();
  }

  if (pending?.step === 'awaiting_custom') {
    const category = text.trim();
    await saveCapture(category, pending.title, pending.body);
    clearPending();
    return `Saved — ${category}: ${pending.title} (${today()})`;
  }

  if (pending?.step === 'awaiting_enrichment') {
    const reply = text.trim();
    const category = pending.options?.[0] ?? 'Inbox';

    if (SKIP_ENRICH.has(reply.toLowerCase())) {
      clearPending();
      return 'Got it.';
    }

    const override = extractCategoryOverride(reply);
    if (override) {
      await saveCapture(override, pending.title, pending.body);
      clearPending();
      return `Saved — ${override}: ${pending.title} (${today()}).`;
    }

    if (/^\d+\./.test(reply)) {
      clearPending();
    } else {
      await saveCapture(category, `Follow-up: ${pending.title}`, reply);
      clearPending();
      return `Added context for ${pending.title}.`;
    }
  }

  // No pending — classify the message
  const mergedText = mergeWithRecent(text);
  const { history } = buildContext();
  const result = await classify(mergedText, history);
  const { intent, entities, response, query } = result;

  if (text.trim().endsWith('?') && intent === 'capture') {
    return response ?? null;
  }

  if (intent === 'capture' && text.trim().split(/\s+/).length <= 2) {
    const lower = text.trim().toLowerCase();
    if (['hi', 'hey', 'hello', 'yo', 'sup'].includes(lower)) {
      return response ?? null;
    }
  }

  if (intent === 'recall') {
    const recallQuery = query ?? mergedText;
    const recallContext = await buildRecallContext(recallQuery, 5);
    if (!recallContext.recall.length) {
      return "I couldn't find anything related yet.";
    }

    const answer = await answerRecall(recallQuery, recallContext.recall, history);
    return answer ?? "I couldn't find anything related yet.";
  }

  if (intent === 'converse') {
    return response ?? null;
  }

  if (DIRECT_INTENTS.has(intent)) {
    return await route(intent, entities) ?? response;
  }

  // Capture flow — ask user to categorize
  const cat = await categorize(mergedText, history);
  const category = cat.options?.[0] ?? 'Inbox';
  await saveCapture(category, cat.title, cat.body);
  savePending({ title: cat.title, body: cat.body, options: [category], step: 'awaiting_enrichment' });
  return `Saved — ${category}: ${cat.title} (${today()}). Add why it matters or a next step? (reply "skip" to ignore)`;
}

function mergeWithRecent(text) {
  const trimmed = text.trim();
  if (!trimmed) return text;
  if (/^\d+$/.test(trimmed)) return text;
  if (SKIP_ENRICH.has(trimmed.toLowerCase())) return text;

  const recent = getRecentMessages(5);
  if (recent.length < 2) return text;

  const lastUser = [...recent].reverse().find((m) => m.role === 'user');
  if (!lastUser) return text;
  if (lastUser.content === trimmed) return text;

  const lastTime = parseMessageTime(lastUser.created_at);

  const prevUser = [...recent].reverse().slice(1).find((m) => m.role === 'user');
  if (!prevUser) return text;
  const prevTime = parseMessageTime(prevUser.created_at);
  if (!lastTime || !prevTime) return text;
  if (lastTime - prevTime > MERGE_WINDOW_MS) return text;

  if (trimmed.split(/\s+/).length > 6 && trimmed.length > 60) return text;

  return `${prevUser.content} ${trimmed}`.trim();
}

function parseMessageTime(ts) {
  if (!ts) return null;
  const normalized = ts.replace(' ', 'T');
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function extractCategoryOverride(text) {
  const cleaned = text.trim().replace(/[.?!]+$/g, '');
  for (const pattern of CATEGORY_OVERRIDE) {
    const match = cleaned.match(pattern);
    if (match?.[2]) {
      const category = match[2].trim();
      if (!category) return null;
      return category
        .replace(/^the\s+/i, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }
  }
  return null;
}

function isGreeting(text) {
  const cleaned = text.trim().toLowerCase().replace(/[!?.,]+$/g, '');
  if (!cleaned) return false;
  const words = cleaned.split(/\s+/);
  if (words.length > 2) return false;
  return GREETINGS.has(words[0]) || GREETINGS.has(cleaned);
}
