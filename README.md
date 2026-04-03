# 🧠 Second Brain

Your personal AI second brain that captures ideas, tasks, and memories. Self-hosted, end-to-end encrypted, zero data sharing.

## ✨ Features

- 📸 **Capture Everything**: Ideas, links, notes, tasks in natural language
- 🔍 **Smart Recall**: "What did I save about React?" — instantly find related captures
- 🚀 **Intent Routing**: Automatically categorizes captures, creates tasks, sets reminders
- 💬 **Conversational**: Chat naturally, it understands context
- 📱 **Telegram/WhatsApp**: Use your preferred messaging app
- 🏠 **Self-Hosted**: Run on your own machine, nothing leaves your device
- 🔐 **Private**: No cloud, no tracking, no data sharing
- 📊 **Dashboard**: Beautiful TUI to manage everything

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** ([download](https://nodejs.org))
- **Telegram Bot** (optional, or use WhatsApp)
- **Groq API Key** ([free here](https://console.groq.com))
- **Google Account** (for saving docs/tasks/calendar)

### 1️⃣ Installation

```bash
# Clone or download
git clone https://github.com/anomalyco/second-brain.git
cd second-brain

# Install dependencies
npm install
```

### 2️⃣ Setup (2 minutes)

```bash
npm run setup
```

You'll be guided through:
- Choose Telegram or WhatsApp
- Enter your Groq API key
- Choose where to save notes (Google Docs or Keep)
- Grant Google permissions

### 3️⃣ Start Using

```bash
npm start
```

The dashboard opens. Choose "Start Second Brain" or just start typing in the terminal.

---

## 📖 Usage

### Quick Commands

```
💡 CAPTURE IDEAS:
"check this: https://nextjs.org"
"cool library for building state machines"

✅ CREATE TASKS:
"todo: finish quarterly report by friday"
"remind me to call mom at 3pm"

📝 ADD TO LISTS:
"add coffee to shopping list"

🔎 RECALL MEMORIES:
"what did I save about react?"
"show me my web development notes"

💬 JUST CHAT:
"tell me a joke"
"how is the weather?"
```

### Advanced Features

**Category Override During Confirmation:**
```
You: "cool website: https://example.com"
Bot: "Save as 'Web Development: Example'?"
You: "add to frontend tools"
Bot: "Saved to 'frontend tools'"
```

**Short Message Stitching:**
Send rapid-fire messages, they auto-merge:
```
You: "next.js"
You: "it's awesome"
→ Captured as "next.js it's awesome"
```

---

## 🛠 Commands

```bash
npm start              # Start dashboard & server
npm run dev            # Run server directly (skip dashboard)
npm run setup          # Reconfigure settings
npm run send "msg"     # Send a quick message
npm run logs           # View live logs
npm run clean          # Reset database & config
```

---

## 🔧 Configuration

Edit `.env` file to customize:

```env
# Channel: telegram or whatsapp
CHANNEL=telegram

# Storage backend: docs or keep
STORAGE_BACKEND=docs

# Briefing time (HH:MM format)
BRIEFING_TIME=08:00

# API Keys
GROQ_API_KEY=gsk_...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

---

## 📊 Dashboard Features

- **Quick Stats**: Total captures, today's count, message history
- **Recent Captures**: Last 5 notes at a glance
- **System Status**: Check configuration and database health
- **Export Data**: Download captures as JSON, CSV, or Markdown
- **Settings**: Reconfigure or reset database
- **Help**: Built-in documentation

---

## 🔐 Privacy & Security

✅ **Zero Cloud**
- Everything runs on your machine
- No data ever leaves your device

✅ **Encrypted**
- Telegram messages are end-to-end encrypted
- WhatsApp messages are encrypted by default

✅ **No Tracking**
- No analytics, no telemetry, no ads
- You own your data completely

---

## 🧠 How It Works

1. **Message arrives** via Telegram/WhatsApp or terminal
2. **LLM analyzes** intent (capture, task, conversation, etc.)
3. **Smart routing** handles each type differently
4. **Semantic search** finds related past captures
5. **Actions execute** (save doc, create task, set reminder)
6. **History saved** for future recall

---

## 📚 Storage Options

### Google Docs (Recommended)
- One document per category
- Entries appended chronologically
- Easy to share/export later

### Google Keep
- Quick notes in Keep
- Better for personal use
- Note: May not work for all accounts

---

## 🐛 Troubleshooting

### "Setup wizard crashes"
```bash
# Start over
npm run clean
npm run setup
```

### "Messages not appearing in Telegram"
1. Check `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env`
2. Make sure bot has message permission
3. Restart with `npm start`

### "Groq API errors"
1. Verify your API key at https://console.groq.com
2. Check rate limits (free tier: 30 requests/minute)
3. Check internet connection

### "Google Docs not being created"
1. Re-run `npm run setup` to refresh Google permissions
2. Check if your Google account allows API access
3. Verify drive isn't full

### Database corruption
```bash
# Reset database (clears all data!)
npm run clean
npm start
```

---

## 🌐 API Docs

### Groq
- Free LLM API with great performance
- https://console.groq.com

### Telegram
- Create bot: https://t.me/botfather
- Send `/start` to get chat ID

### Google APIs
- Enable Drive, Docs, Tasks, Calendar APIs
- Create OAuth credentials

---

## 📦 Deployment Options

### Docker (Coming Soon)
```bash
docker run -it second-brain npm start
```

### Cloud VPS
1. Rent small VPS (e.g., Linode $5/month)
2. Install Node.js
3. Clone repo and run `npm start`
4. Keep running with PM2

### Raspberry Pi
Works great on Pi 4 (2GB RAM+)
```bash
# SSH into Pi, then
npm start
```

---

## 🤝 Contributing

Found a bug? Have an idea?
- Open issue: https://github.com/anomalyco/second-brain/issues
- Submit PR: https://github.com/anomalyco/second-brain/pulls

---

## 📜 License

MIT - Use however you want!

---

## ❓ FAQ

**Q: Is my data really private?**
A: Yes! Everything stays on your machine. Check the code yourself.

**Q: Can I run this on my phone?**
A: Not directly, but you can run on a Raspberry Pi or cloud server and access via Telegram.

**Q: What if I lose my laptop?**
A: Your captures are in Google Docs/Keep. Export regularly as backup.

**Q: Can I share captures with others?**
A: Yes! Export to Google Docs and share the link.

**Q: Does it work offline?**
A: LLM processing needs internet. Telegram/WhatsApp messages queue when offline.

---

## 🙏 Support

Love Second Brain? Consider:
- ⭐ Star on GitHub
- 📢 Share with friends
- 🐛 Report bugs
- 💡 Suggest features

---

**Made with ❤️ for people who think a lot**
