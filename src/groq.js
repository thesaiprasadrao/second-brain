import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a personal second brain assistant. Classify every user message into exactly one intent and return ONLY valid JSON — no markdown, no explanation.

INTENTS:
- capture_note     : ideas, thoughts, things to remember
- capture_thought  : reflections, journal-style musings
- add_task         : todos, things to do by a deadline
- add_list_item    : adding to a named list (groceries, books, etc.)
- create_event     : calendar events, meetings
- set_reminder     : reminders at a specific time
- recall           : asking to find/retrieve something saved earlier
- query_schedule   : asking about upcoming events or free time
- converse         : casual chat, questions, no storage needed

RESPONSE SCHEMA (always):
{
  "intent": "<one of the intents above>",
  "entities": {
    "title": "<short title or null>",
    "body": "<full content or null>",
    "tags": ["<tag>"] or [],
    "datetime": "<ISO 8601 or null>",
    "list_name": "<list name or null>"
  },
  "response": "<short confirmation or answer to send back to user>"
}

Rules:
- Never deviate from this schema.
- datetime must be ISO 8601 or null.
- For recall/query_schedule/converse, body holds the user query.
- Keep response under 2 sentences.`;

export async function classify(userText, history = [], notionDbContext = '') {
  const messages = [
    {
      role: 'system',
      content: SYSTEM_PROMPT + (notionDbContext ? `\n\nAVAILABLE NOTION DATABASES:\n${notionDbContext}` : ''),
    },
    ...history.map(({ role, content }) => ({ role, content })),
    { role: 'user', content: userText },
  ];

  const res = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const raw = res.choices[0]?.message?.content;
  return JSON.parse(raw);
}
