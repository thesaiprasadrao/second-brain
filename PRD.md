# PRD: WhatsApp AI Second Brain

## Overview

A self-hosted, personal AI assistant that lives inside WhatsApp. You text yourself exactly as you always have — messy, unstructured, stream-of-consciousness — and the assistant silently organizes, stores, schedules, and recalls everything. No new app. No new behavior. Just your self-chat, made useful.

---

## Problem

People send themselves texts to remember things. These texts are messy, unstructured, and forgotten. No one opens Notion to log an idea at 11pm. Everyone opens WhatsApp.

---

## Solution

An always-on assistant running on your own number via Baileys. Every message you send to yourself is intercepted, understood by an LLM, and routed to the right place — Google Keep or Google Docs for notes and memory, Google Calendar for time-bound events, Google Tasks for todos and lists. You can ask it to recall anything in natural language, and it finds it.

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
| Notes / Memory | Google Keep or Google Docs API | Structured persistence, readable, user choice |
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
│ Keep/Docs│  GCal    │ GTasks   │ Recall │
│  notes   │  events  │  todos   │ search │
│  ideas   │  meetings│  lists   │        │
│  journal │  deadlines         │        │
└──────────┴──────────┴──────────┴────────┘
                 │
┌────────────────▼────────────────────────┐
│     Baileys — Reply to self-chat        │
│  confirmation + Keep/Docs link / answer │
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
| `capture` | "linear.app" | Categorize → Store in Keep/Docs |
| `add_task` | "submit report by friday" | Google Tasks |
| `add_list_item` | "add eggs to groceries" | Google Tasks (named list) |
| `create_event` | "meeting with john tomorrow 10am" | Google Calendar event |
| `set_reminder` | "remind me to call dentist friday 3pm" | Google Calendar event with alert |
| `query_schedule` | "am i free thursday afternoon" | Google Calendar read |
| `converse` | "what do you think about this idea" | LLM reply, no storage |

---

## Groq Prompt Contract

Every Groq call returns this JSON shape — no exceptions:

```json
{
  "intent": "capture",
  "entities": {
    "title": "Linear.app",
    "body": "Project management tool",
    "datetime": null,
    "list_name": null
  },
  "response": "What is this?\n\n1. Website to try\n2. Tool / product\n3. Reference link\n4. Something else"
}
```

The system prompt enforces this schema strictly. The action router reads `intent` and `entities`, never parses free text.

---

## Storage Backend Choice

Users choose their preferred storage backend during setup:

| Backend | Storage Method | Use Case |
|---|---|---|
| **Google Keep** | Individual notes per capture | Quick access, simple browsing |
| **Google Docs** | One doc per category | Structured organization, easy sharing |

Both backends store captures with format: `<Category>: <title>` with body and date footer.

---

## Clarification-First Flow

For capture intents, the assistant uses a two-step clarification process:

**Step 1: Category Selection**
```
User: "linear.app"
Bot:  "What is this?
       1. Website to try
       2. Tool / product  
       3. Reference link
       4. Something else"
```

**Step 2a: Direct Storage (options 1-3)**
```
User: "2"
Bot:  "Saved — Tool / product: linear.app (30 Mar 2026)"
```

**Step 2b: Custom Category (option 4)**
```
User: "4"
Bot:  "What is it? Describe in a few words."
User: "competitor analysis"  
Bot:  "Saved — Competitor analysis: linear.app (30 Mar 2026)"
```

This ensures user-confirmed categories while providing AI-suggested options for speed.

---

## Ambiguity Handling

The assistant uses the clarification-first flow for all capture intents. Groq suggests 3 most likely categories based on content analysis, with "Something else" as option 4 for custom labeling.

When users pick option 4, they provide their own category label in free text. This gives users full control while maintaining speed through suggested options.

This pattern is used consistently for all captures — ensuring every item gets a user-confirmed category.

---

## Semantic Recall

*Note: Semantic recall is planned for future implementation.*

```
query → all-MiniLM-L6-v2 → 384-dim vector
      → load all note embeddings from SQLite
      → cosine similarity against each
      → top 5 results → injected into context
      → Groq generates answer
```

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
│   ├── pipeline.js           # Main message processing pipeline
│   ├── actions/
│   │   ├── gkeep.js          # Google Keep API writes
│   │   ├── gdocs.js          # Google Docs API writes
│   │   ├── gcal.js           # Google Calendar reads/writes
│   │   └── gtasks.js         # Google Tasks reads/writes
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
STORAGE_BACKEND=keep           # 'keep' or 'docs'
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
BRIEFING_TIME=08:00           # Cron time for morning briefing
SELF_CHAT_JID=                # Your WhatsApp JID (auto-detected on first run)
```

---

## Setup Flow (First Run)

Run `npx second-brain` — the TUI handles everything:

1. QR code rendered in terminal → scan with WhatsApp
2. Enter Groq API key (masked)
3. Choose storage backend (Keep or Docs)
4. Google OAuth → opens browser → token saved locally
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
▶ Choose storage backend         [Keep or Docs selection]
▶ Connect Google Account         [opens browser → OAuth → token saved locally]
▶ All done. Text yourself to start.
```

- All inputs masked in terminal
- OAuth opens system browser, callback handled locally
- Credentials written to `.env` in current directory
- Storage backend choice persisted in environment
- Session persists — QR only scanned once

---

## Out of Scope (Explicit)

- Multi-user support
- Web dashboard / UI
- Semantic search / recall (planned for future)
- WhatsApp group support
- Any integrations beyond Google ecosystem

---

## Success Criteria

- A message sent to self is processed and stored in under 3 seconds
- Voice note transcription is accurate enough to be useful
- "What was that thing about X" returns the right note >80% of the time
- Morning briefing arrives reliably every day
- Setup takes under 15 minutes for a developer
- Zero messages are lost or misrouted silently (all errors reply with a human-readable failure message)
