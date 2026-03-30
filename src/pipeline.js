import { preprocess } from './preprocessor.js';
import { buildContext } from './context.js';
import { classify, categorize } from './groq.js';
import { route } from './router.js';
import { savePending, getPending, updatePendingToCustom, clearPending, saveMessage } from './db.js';

const CAPTURE_INTENTS = new Set(['capture', 'converse']);
const DIRECT_INTENTS = new Set(['add_task', 'add_list_item', 'create_event', 'set_reminder', 'query_schedule']);

function getStorage() {
  const backend = process.env.STORAGE_BACKEND ?? 'docs';
  return backend === 'keep'
    ? import('./actions/gkeep.js')
    : import('./actions/gdocs.js');
}

function today() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function saveCapture(category, title, body) {
  const { saveCapture: save } = await getStorage();
  await save(category, title, body, today());
}

export async function pipeline(msg) {
  const text = await preprocess(msg);
  if (!text) return null;

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

  // No pending — classify the message
  const { history } = buildContext();
  const result = await classify(text, history);
  const { intent, entities, response } = result;

  if (DIRECT_INTENTS.has(intent)) {
    return await route(intent, entities) ?? response;
  }

  // Capture flow — ask user to categorize
  const cat = await categorize(text, history);
  savePending({ title: cat.title, body: cat.body, options: cat.options });
  return cat.question;
}
