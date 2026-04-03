# ⚡ Quick Start (5 minutes)

## 1. Install

### Option A: One-liner (Recommended)
```bash
curl -fsSL https://raw.githubusercontent.com/thesaiprasadrao/second-brain/main/install.sh | bash
```

### Option B: Manual
```bash
git clone https://github.com/thesaiprasadrao/second-brain.git
cd second-brain
npm install
```

### Option C: Global npm
```bash
npm install -g second-brain
```

## 2. Setup

```bash
2nd-brain setup
```

Fill in:
- Telegram bot token (get from @BotFather)
- Groq API key (free from https://console.groq.com)
- Google permissions (automatic)

## 3. Start

```bash
2nd-brain start
```

Server runs in background! To check status:
```bash
2nd-brain status
2nd-brain logs
```

## 4. Try It!

In Telegram (or terminal):

```
You: check this https://nextjs.org
Bot: Save as "Web Framework: Next.js"? (yes/no)
You: yes
Bot: Saved!

You: what did I save?
Bot: You saved Next.js framework...

You: remind me to code at 5pm
Bot: Reminder set!
```

Done! 🎉

---

### Available Commands

```bash
2nd-brain setup           # Configure (API keys, etc)
2nd-brain start           # Start server (daemon)
2nd-brain stop            # Stop server
2nd-brain restart         # Restart server
2nd-brain status          # Check server status
2nd-brain logs [N]        # View logs (last N lines)
2nd-brain send <message>  # Send quick message
2nd-brain help            # Show help
```

---

### Next Steps

- 📖 Read [README.md](README.md) for full features
- 🛠 Check [INSTALL.md](INSTALL.md) for other deployment options
- 🐛 Report issues on [GitHub](https://github.com/thesaiprasadrao/second-brain/issues)

---

Enjoy your Second Brain! 🧠
