# PRD: WhatsApp AI Second Brain

## Overview

A self-hosted, personal AI assistant that lives inside WhatsApp. You text yourself exactly as you always have — messy, unstructured, stream-of-consciousness — and the assistant silently organizes, stores, schedules, and recalls everything. No new app. No new behavior. Just your self-chat, made useful.

---

## Problem

People send themselves texts to remember things. These texts are messy, unstructured, and forgotten. No one opens Notion to log an idea at 11pm. Everyone opens WhatsApp.

---

## Solution

An always-on assistant running on your own number via Baileys. Every message you send to yourself is intercepted, understood by an LLM, and routed to the right place — Notion for notes and memory, Google Calendar for time-bound events, Google Tasks for todos and lists. You can ask it to recall anything in natural language, and it finds it.

---

## Differentiators

- **Self-hosted** — runs on your machine, your number, your data
- **Free** — no subscriptions, no Twilio, no Meta approval
- **Zero behavior change** — users keep texting themselves exactly as they do now
- **Opinionated** — no config hell, sensible defaults that just work
- **Semantic recall** — "what was that idea about pricing" actually works

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| WhatsApp | Baileys (Node.js) | Unofficial, free, runs on personal number |
| Runtime | Node.js | Same language as Baileys |
| LLM + Vision | Groq — Llama 4 Scout | Fast, free tier, handles text + images natively |
| STT | Groq — Whisper Large v3 Turbo | Voice note transcription, same API |
| Notes / Memory | Notion API | Structured persistence, readable |
| Calendar | Google Calendar API | Native notifications, no scheduler needed |
| Tasks / Lists | Google Tasks API | Native reminders, no scheduler needed |
| Embeddings | @xenova/transformers — all-MiniLM-L6-v2 | Local, free, 23MB, fast after load |
| Vector Store | SQLite (blob columns + cosine sim) | Single user scale, zero infra |
| Conversation History | SQLite | Same DB, keeps it simple |
| Scheduler | node-cron | Morning briefings, proactive nudges |

---

## Architecture

```
┌─────────────────────────────────────────┐
│           WhatsApp (Baileys)            │
│  receives: text, voice, image          │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│           Message Preprocessor          │
│  text  → pass through                  │
│  voice → Groq Whisper → text           │
│  image → Groq Vision  → text           │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│           Context Builder               │
│  • last 15 messages from SQLite        │
│  • if intent = recall:                 │
│      embed query → cosine sim →        │
│      top 5 relevant notes from SQLite  │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Groq — Llama 4 Scout            │
│  system prompt defines intents +       │
│  returns structured JSON every time    │
│  { intent, entities, response }        │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│           Action Router                 │
├──────────┬──────────┬──────────┬────────┤
│  Notion  │  GCal    │ GTasks   │ Recall │
│  notes   │  events  │  todos   │ search │
│  ideas   │  meetings│  lists   │        │
│  journal │  deadlines         │        │
└──────────┴──────────┴──────────┴────────┘
                 │
┌────────────────▼────────────────────────┐
│     Baileys — Reply to self-chat        │
│  confirmation + Notion link / answer   │
└─────────────────────────────────────────┘

Separate cron process:
node-cron → morning briefing (daily 8am)
          → unresolved tasks nudge (weekly)
          → sends message via Baileys
```

---

## Intent Classification

Groq classifies every message into one of these intents:

| Intent | Example Input | Action |
|---|---|---|
| `capture_note` | "that idea about dynamic pricing" | Create Notion page |
| `capture_thought` | "i think the reason i procrastinate is..." | Create Notion page (journal) |
| `add_task` | "submit report by friday" | Google Tasks |
| `add_list_item` | "add eggs to groceries" | Google Tasks (named list) |
| `create_event` | "meeting with john tomorrow 10am" | Google Calendar event |
| `set_reminder` | "remind me to call dentist friday 3pm" | Google Calendar event with alert |
| `recall` | "what was that library i mentioned" | Embedding search → Notion |
| `query_schedule` | "am i free thursday afternoon" | Google Calendar read |
| `converse` | "what do you think about this idea" | LLM reply, no storage |

---

## Groq Prompt Contract

Every Groq call returns this JSON shape — no exceptions:

```json
{
  "intent": "capture_note",
  "entities": {
    "title": "Dynamic pricing idea",
    "body": "Adjust prices based on demand curves and competitor scraping",
    "tags": ["idea", "startup", "pricing"],
    "datetime": null,
    "list_name": null
  },
  "response": "Saved to Notion under Ideas ✓"
}
```

The system prompt enforces this schema strictly. The action router reads `intent` and `entities`, never parses free text.

---

## Notion Structure

Three seed databases created on first run. All others are created dynamically by the LLM based on usage:

| Database | Used For |
|---|---|
| `📥 Inbox` | Unclassified captures, brain dumps |
| `💡 Ideas` | Ideas, startup thoughts, tools to try |
| `📓 Journal` | Reflections, thoughts, end-of-day notes |

Google Tasks handles all todos and lists natively (no Notion tasks DB — avoids duplication with GCal/GTasks ecosystem).

---

## Dynamic Schema Creation

Groq decides where each item belongs by comparing it against existing databases. If no fit is found, it creates a new database and stores the item there.

**Fit check flow:**
```
incoming item
  → Groq receives lightweight DB context (names + one-line descriptions)
  → fit found   → store in that DB
  → no fit      → create new Notion DB with appropriate schema → store
```

**Lightweight DB context format** (passed with every message, not full schemas):
```
📥 Inbox — general captures
💡 Ideas — startup and product ideas
🎬 Reels — instagram reel links
🧰 Tools — dev tools and resources
```

This context is cached in SQLite and refreshed only when a database is created or renamed — not on every message.

New databases are created with sensible schemas based on content type (e.g., a Reels DB gets URL, platform, and notes properties; a Books DB gets title, author, and status).

---

## Ambiguity Handling

Groq only asks for clarification when it genuinely cannot determine intent — a bare link, an ambiguous name, a one-word message. For everything else it stores silently.

When ambiguous, the bot replies with numbered options:

```
Not sure where this belongs. Pick one:

1. Tool to try
2. Article to read
3. Resource / reference
4. Just bookmark it
```

User replies with a number → stored correctly. No follow-up needed.

This pattern is used sparingly — noisy clarifications defeat the purpose.

---

## Semantic Recall

Only triggered when `intent = recall`.

```
query → all-MiniLM-L6-v2 → 384-dim vector
      → load all note embeddings from SQLite
      → cosine similarity against each
      → top 5 results → injected into context
      → Groq generates answer
```

SQLite schema for notes:
```sql
CREATE TABLE notes (
  id INTEGER PRIMARY KEY,
  text TEXT,
  embedding BLOB,       -- Float32Array as binary blob
  notion_url TEXT,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Every note written to Notion is also embedded and stored here. Recall is local — no Notion search API needed for this.

---

## Conversation Context

Every Groq call includes the last 15 messages from SQLite:

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  role TEXT,            -- 'user' or 'assistant'
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

This enables multi-turn like:
> "that idea about pricing" → saved
> "add more to that" → knows which note to update

---

## Voice Note Flow

1. Baileys receives audio message (`.ogg`/`.mp4`)
2. Download buffer → send to Groq Whisper Large v3 Turbo
3. Whisper returns transcript text
4. Text enters the normal pipeline (context builder → Groq → router)
5. Reply confirms what was understood + stored

---

## Image / Vision Flow

1. Baileys receives image
2. Download buffer → send to Groq Llama 4 Scout (vision)
3. Prompt: "Extract all text and key information from this image. Describe what it contains."
4. Extracted text enters normal pipeline
5. Useful for: whiteboards, receipts, business cards, screenshots

---

## Proactive Messaging (node-cron)

| Job | Schedule | Content |
|---|---|---|
| Morning Briefing | Daily 8:00am | Today's GCal events + overdue GTasks |
| Weekly Nudge | Monday 9:00am | Unresolved tasks from last week |

Both jobs use Baileys to send a message to self — same chat, same thread.

---

## Notifications

**Reminders and events use Google Calendar natively** — no custom notification system. When the assistant creates a GCal event with an alert, Google handles the push notification. This is intentional — offloads the entire scheduling/notification problem.

---

## File Structure

```
/
├── src/
│   ├── index.js              # Entry point, Baileys init
│   ├── preprocessor.js       # Voice/image → text
│   ├── context.js            # Build context for each message
│   ├── groq.js               # LLM call + schema enforcement
│   ├── router.js             # Intent → action dispatch
│   ├── actions/
│   │   ├── notion.js         # Notion API writes
│   │   ├── gcal.js           # Google Calendar reads/writes
│   │   ├── gtasks.js         # Google Tasks reads/writes
│   │   └── recall.js         # Embedding search
│   ├── embeddings.js         # @xenova/transformers wrapper
│   ├── db.js                 # SQLite setup + queries
│   └── cron.js               # Morning briefing + weekly nudge
├── auth/                     # Baileys session creds (gitignored)
├── memory.db                 # SQLite database (gitignored)
├── .env                      # API keys (gitignored)
└── package.json
```

---

## Environment Variables

```env
GROQ_API_KEY=
NOTION_API_KEY=
NOTION_INBOX_DB_ID=
NOTION_IDEAS_DB_ID=
NOTION_JOURNAL_DB_ID=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
BRIEFING_TIME=08:00        # Cron time for morning briefing
SELF_CHAT_JID=             # Your WhatsApp JID (auto-detected on first run)
```

---

## Setup Flow (First Run)

Run `npx second-brain` — the TUI handles everything:

1. QR code rendered in terminal → scan with WhatsApp
2. Enter Groq + Notion API keys (masked)
3. Google OAuth → opens browser → token saved locally
4. Seed Notion databases auto-created
5. Ready — text yourself

---

## Distribution

Published as an npm package. No global install required:

```bash
npx second-brain
```

---

## Setup TUI

Built with `@clack/prompts`. Runs on first launch, never again unless explicitly re-run with `npx second-brain setup`.

```
Welcome to Second Brain

▶ Scan QR to connect WhatsApp    [QR rendered in terminal via qrcode-terminal]
▶ Enter Groq API key             [masked input]
▶ Enter Notion API key           [masked input]
▶ Connect Google Account         [opens browser → OAuth → token saved locally]
▶ Setting up Notion workspace... [spinner — creates seed databases]
▶ All done. Text yourself to start.
```

- All inputs masked in terminal
- OAuth opens system browser, callback handled locally
- Credentials written to `.env` in current directory
- Seed Notion databases created automatically
- Session persists — QR only scanned once

---

## Out of Scope (Explicit)

- Multi-user support
- Web dashboard / UI
- Notion AI features
- WhatsApp group support
- Any integrations beyond Notion + Google

---

## Success Criteria

- A message sent to self is processed and stored in under 3 seconds
- Voice note transcription is accurate enough to be useful
- "What was that thing about X" returns the right note >80% of the time
- Morning briefing arrives reliably every day
- Setup takes under 15 minutes for a developer
- Zero messages are lost or misrouted silently (all errors reply with a human-readable failure message)
