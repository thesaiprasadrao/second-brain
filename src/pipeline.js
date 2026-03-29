import { preprocess } from './preprocessor.js';
import { buildContext } from './context.js';
import { classify } from './groq.js';
import { route } from './router.js';

export async function pipeline(msg, sock) {
  const text = await preprocess(msg);
  if (!text) return null;

  // First pass — classify with no recall context to get intent
  const { history, notionDbContext } = await buildContext(text, null);
  const result = await classify(text, history, notionDbContext);

  const { intent, entities, response } = result;

  // Second pass — get recall context if needed
  const { relevantNotes } = await buildContext(text, intent);

  const reply = await route(intent, entities, relevantNotes);

  // For converse intent, fall back to Groq's own response
  return reply ?? response;
}
