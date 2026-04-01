import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const CLASSIFY_PROMPT = `You are a personal assistant. Classify every user message into exactly one intent and return ONLY valid JSON.

INTENTS:
- add_task         : todos, things to do by a deadline
- add_list_item    : adding to a named list (groceries, books, etc.)
- create_event     : calendar events, meetings
- set_reminder     : reminders at a specific time
- query_schedule   : asking about upcoming events or free time
- recall           : asking to retrieve or summarize past notes or ideas
- capture          : ideas, tools, links, notes, thoughts to save
- converse         : greetings, casual chat, questions not meant to be saved

Rules:
- Greetings and small talk are "converse"
- Questions are "converse" unless clearly about schedule or recall
- Use "capture" for statements or fragments meant to be saved
- For recall, set "query" to the user's information need

RESPONSE SCHEMA:
{
  "intent": "<one of the intents above>",
  "entities": {
    "title": "<short title or null>",
    "body": "<full content or null>",
    "datetime": "<ISO 8601 or null>",
    "list_name": "<list name or null>"
  },
  "response": "<short reply under 2 sentences>",
  "query": "<recall query or null, only for recall>"
}`;

const CATEGORIZE_PROMPT = `You are a personal second brain assistant. The user sent you something to save. Suggest the 3 most likely categories.

Return ONLY valid JSON in this exact schema:
{
  "title": "<short extracted title — the core thing being saved>",
  "body": "<full original content, or null if just a title/link>",
  "options": ["<category 1>", "<category 2>", "<category 3>"],
  "question": "What is this?\\n\\n1. <category 1>\\n2. <category 2>\\n3. <category 3>\\n4. Something else"
}

Rules:
- options must be exactly 3 short labels (2-4 words each), most probable first
- options should be specific and not generic greetings or chat labels
- title should be clean and concise
- question must match the options exactly in order`;

const RECALL_PROMPT = `You are a personal second brain assistant. Use the provided notes to answer the user's question.

Rules:
- Only use the provided notes
- If the notes don't contain the answer, say you couldn't find it
- Keep the answer under 4 sentences`;

export async function classify(userText, history = []) {
  const messages = [
    { role: 'system', content: CLASSIFY_PROMPT },
    ...history.map(({ role, content }) => ({ role, content })),
    { role: 'user', content: userText },
  ];

  const res = await groq.chat.completions.create({
    model: 'llama-3.1-70b-instruct',
    messages,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(res.choices[0]?.message?.content);
}

export async function categorize(userText, history = []) {
  const messages = [
    { role: 'system', content: CATEGORIZE_PROMPT },
    ...history.map(({ role, content }) => ({ role, content })),
    { role: 'user', content: userText },
  ];

  const res = await groq.chat.completions.create({
    model: 'llama-3.1-70b-instruct',
    messages,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(res.choices[0]?.message?.content);
}

export async function answerRecall(query, notes = [], history = []) {
  const messages = [
    { role: 'system', content: RECALL_PROMPT },
    ...history.map(({ role, content }) => ({ role, content })),
    { role: 'system', content: `Notes:\n${JSON.stringify(notes)}` },
    { role: 'user', content: query }
  ];

  const res = await groq.chat.completions.create({
    model: 'llama-3.1-70b-instruct',
    messages,
    temperature: 0.2
  });

  return res.choices[0]?.message?.content?.trim() ?? null;
}
