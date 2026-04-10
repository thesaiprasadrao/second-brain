# 🧠 Second Brain

Your personal AI second brain that captures ideas, tasks, and memories. **Self-hosted, end-to-end encrypted, zero data sharing.**

## ✨ Features

- 📸 **Capture Everything**: Ideas, links, notes, tasks in natural language
- 🔍 **Smart Recall**: "What did I save about React?" — instantly find related captures
- 🚀 **Intent Routing**: Automatically categorizes captures, creates tasks, sets reminders
- 💬 **Conversational**: Chat naturally, it understands context
- 📱 **Telegram/WhatsApp**: Use your preferred messaging app
- 🏠 **Self-Hosted**: Run on your own machine, nothing leaves your device
- 🔐 **Private**: No cloud, no tracking, no data sharing
- 📊 **Dashboard**: Beautiful TUI to manage everything (coming soon)

---

## 🚀 Quick Start (5 minutes)

### Prerequisites

- **Node.js 20+** ([download](https://nodejs.org))
- **Telegram Bot** (get from @BotFather) or use WhatsApp
- **Groq API Key** ([free tier](https://console.groq.com))
- **Google Account** (for saving docs/tasks/calendar)

### Installation

**Option 1: One-liner (Recommended)**
```bash
curl -fsSL https://raw.githubusercontent.com/thesaiprasadrao/second-brain/main/install.sh | bash
```

**Option 2: Global npm**
```bash
npm install -g @saiprasadrao/2nd-brain
```

**Option 3: Manual**
```bash
git clone https://github.com/thesaiprasadrao/second-brain.git
cd second-brain && npm install
```

### Setup & Run

```bash
# 1. Configure (interactive wizard)
2nd-brain setup

# 2. Start the daemon (runs in background)
2nd-brain start

# 3. Check status anytime
2nd-brain status
```

Now use **Telegram** to send messages to your brain!

---

## 🎯 Commands

```bash
2nd-brain setup              # Interactive configuration
2nd-brain start              # Start server (daemon mode)
2nd-brain stop               # Stop the daemon
2nd-brain restart            # Restart server
2nd-brain status             # Show server status
2nd-brain logs [N]           # View logs (last N lines)
2nd-brain send <message>     # Send quick message
2nd-brain help               # Show help
```

**Or use npm:**
```bash
npm start              npm stop              npm restart
npm run setup          npm run status        npm run logs
npm run send "msg"
```

---

## 📖 Usage Examples

```
💡 CAPTURE:
"check this: https://nextjs.org"
"cool idea for building state machines"

✅ TASKS:
"todo: finish report by friday"
"remind me to code at 5pm"

📝 LISTS:
"add coffee to shopping list"

🔎 RECALL:
"what did I save about react?"
"show my web development notes"

💬 CHAT:
"tell me a joke"
"how is the weather?"
```

---

## 🔧 Configuration

After running `2nd-brain setup`, edit `.env` to customize:

```env
GROQ_API_KEY=gsk_...              # Groq LLM API
TELEGRAM_BOT_TOKEN=...            # Telegram bot token
TELEGRAM_CHAT_ID=...              # Your Telegram chat ID
STORAGE_BACKEND=docs              # docs or keep (Google storage)
BRIEFING_TIME=08:00               # Daily briefing time
```

**Get API Keys:**
- **Groq**: https://console.groq.com
- **Telegram**: Message @BotFather, create bot
- **Google**: Auto-configured during setup

---

## 📊 Dashboard Features

- **Stats**: Total captures, today's count, message history
- **Recent Captures**: Last 5 notes at a glance
- **System Status**: Configuration and database health
- **Export Data**: Download as JSON, CSV, or Markdown
- **Settings**: Reconfigure or reset database

---

## 🛠 Deployment Options

### Local Machine
```bash
2nd-brain start          # Runs in background
# Server stays running until you stop it
```

### Docker
```bash
docker-compose up --build
```

### Cloud VPS ($5/month)
- DigitalOcean, Linode, AWS, Hetzner, Vultr
- SSH in, install Node.js, run `2nd-brain setup && 2nd-brain start`
- Server keeps running with PM2

### Raspberry Pi
```bash
# SSH into Pi, then
2nd-brain setup && 2nd-brain start
```

---

## 🔐 Privacy & Security

✅ **Zero Cloud** — Everything runs on your machine  
✅ **Encrypted** — Telegram/WhatsApp are end-to-end encrypted by default  
✅ **No Tracking** — No analytics, telemetry, or ads  
✅ **You Own Your Data** — Export anytime as JSON, CSV, or Markdown

---

## 🧠 How It Works

1. **Message arrives** via Telegram/WhatsApp or CLI
2. **LLM analyzes** intent (capture, task, conversation, etc.)
3. **Smart routing** handles each type differently
4. **Semantic search** finds related past captures
5. **Actions execute** (save doc, create task, set reminder)
6. **History saved** for future recall

---

## 📚 Storage Options

| | **Google Docs** | **Google Keep** |
|--|---|---|
| **Recommended** | ✓ Yes | Optional |
| **Organization** | One doc per category | Quick notes |
| **Format** | Rich text, URLs | Simple notes |

---

## 🔧 Storage Backends

### Google Docs (Recommended)
- One document per category
- Entries appended chronologically
- Easy to share/export later

### Google Keep
- Quick notes in Keep app
- Better for personal use
- Simpler setup

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| **Setup crashes** | `2nd-brain stop && rm .env && 2nd-brain setup` |
| **No Telegram messages** | Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env` |
| **Groq API errors** | Check rate limits (free tier: 30 req/min) or verify API key |
| **Google Docs not created** | Re-run `2nd-brain setup` to refresh permissions |
| **Database corrupted** | `2nd-brain stop && rm memory.db* && 2nd-brain start` |

---

## ❓ FAQ

**Q: Is my data really private?**  
A: Yes! Everything stays on your machine. Open source — check the code yourself.

**Q: Can I run this on my phone?**  
A: Not directly, but run on Raspberry Pi or cloud server and access via Telegram.

**Q: What if I lose my laptop?**  
A: Captures are in Google Docs/Keep. Export regularly as backup.

**Q: Can I share captures with others?**  
A: Yes! Export to Google Docs and share the link.

**Q: Does it work offline?**  
A: LLM processing needs internet. Messages queue when offline.

---

## 📦 Requirements

- Node.js 20+
- Internet connection (for LLM and APIs)
- Optional: Docker, Telegram account, Google account

---

## 🌐 API References

- **Groq LLM**: https://console.groq.com (free API)
- **Telegram Bot**: https://t.me/botfather
- **Google APIs**: Drive, Docs, Tasks, Calendar (auto-setup)

---

## 🤝 Contributing

Found a bug? Have an idea?
- **Issues**: https://github.com/thesaiprasadrao/second-brain/issues
- **PRs**: https://github.com/thesaiprasadrao/second-brain/pulls

---

## 📜 License

MIT — Use however you want!

---

## 🙏 Support

Love Second Brain? Consider:
- ⭐ Star on GitHub
- 📢 Share with friends
- 🐛 Report bugs
- 💡 Suggest features

**Made with ❤️ for people who think a lot**
