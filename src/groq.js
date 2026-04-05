import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const CLASSIFY_PROMPT = `You are a personal assistant. Classify every user message into ONE or MORE intents and return ONLY valid JSON.

TODAY'S DATE: ${new Date().toISOString().split('T')[0]}

INTENTS:
- add_task         : todos, things to do by a deadline
- add_list_item    : adding to a named list (groceries, books, etc.)
- create_event     : calendar events, meetings
- set_reminder     : reminders at a specific time
- query_schedule   : asking about upcoming events or free time
- recall           : asking to retrieve or summarize past notes or ideas (what did I save, what was that about X?)
- capture          : ideas, tools, links, notes, thoughts to save
- converse         : greetings, casual chat, questions not meant to be saved, general knowledge questions

Rules:
- Greetings and small talk are "converse"
- General knowledge questions (weather, cooking, math, etc.) are "converse" 
- Only use "recall" for questions about things the user previously saved
- "How is the weather?" = converse, "What did I save about react?" = recall
- Use "capture" for statements or fragments meant to be saved (ideas, links, etc.)
- If a message contains MULTIPLE distinct actions (e.g., "save X and remind me at Y"), return MULTIPLE intents in the "intents" array
- For each intent, extract its specific entities
- For recall, set "query" to the user's information need
- For add_list_item, extract both the item (as title) and list name
- For datetime, use YYYY-MM-DD format only (no time), or leave null if no date given
- Calculate relative dates (e.g., "friday", "tomorrow", "next week") based on TODAY'S DATE

RESPONSE SCHEMA:
{
  "intents": [
    {
      "intent": "<one of the intents above>",
      "entities": {
        "title": "<item name for list_item, task name for task, or event name for events>",
        "body": "<full content or null>",
        "datetime": "<YYYY-MM-DD only, no time component or null>",
        "list_name": "<list name or null>"
      },
      "query": "<recall query or null, only for recall>"
    }
  ],
  "response": "<short reply under 2 sentences acknowledging all intents>"
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
    model: 'llama-3.3-70b-versatile',
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
    model: 'llama-3.3-70b-versatile',
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
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.2
  });

  return res.choices[0]?.message?.content?.trim() ?? null;
}
