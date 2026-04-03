# 🎯 Global CLI Guide for Second Brain

## Installation

### Option 1: One-liner (Recommended)
```bash
curl -fsSL https://raw.githubusercontent.com/thesaiprasadrao/second-brain/main/install.sh | bash
```

This will:
- ✓ Check Node.js version (requires 20+)
- ✓ Clone/update the repository
- ✓ Install dependencies
- ✓ Create global `2nd-brain` command

### Option 2: Global npm Package
```bash
npm install -g second-brain
```

### Option 3: Manual Installation
```bash
git clone https://github.com/thesaiprasadrao/second-brain.git
cd second-brain
npm install
```

Then use: `node bin/cli.js <command>` or create a symlink:
```bash
ln -s /path/to/second-brain/bin/cli.js /usr/local/bin/2nd-brain
chmod +x /usr/local/bin/2nd-brain
```

---

## Available Commands

### Setup
```bash
2nd-brain setup
```
Configure your brain: API keys, Telegram/WhatsApp, storage backend.

### Start Server
```bash
2nd-brain start
```
Start the server as a daemon (background process). Runs until you stop it.

### Stop Server
```bash
2nd-brain stop
```
Gracefully stop the running daemon.

### Restart Server
```bash
2nd-brain restart
```
Restart the daemon (useful after config changes).

### Server Status
```bash
2nd-brain status
```
Shows:
- PID (process ID)
- Status (online/stopped)
- Uptime
- Restart count
- Memory usage

### View Logs
```bash
2nd-brain logs [N]
```
Show last N lines of server logs (default: 50)

Examples:
```bash
2nd-brain logs           # Last 50 lines
2nd-brain logs 100       # Last 100 lines
2nd-brain logs 10        # Last 10 lines
```

### Send Quick Message
```bash
2nd-brain send "your message here"
```
Send a message without starting the dashboard. Processes through the LLM pipeline and saves to database.

### Help
```bash
2nd-brain help
```
Show all available commands.

---

## Quick Workflow

### First Time Setup
```bash
# 1. Install
curl -fsSL https://raw.githubusercontent.com/thesaiprasadrao/second-brain/main/install.sh | bash

# 2. Configure (interactively)
2nd-brain setup

# 3. Start the server
2nd-brain start

# 4. Check status
2nd-brain status
```

### Daily Usage
```bash
# Start server (if not already running)
2nd-brain start

# Use Telegram to send messages to your brain
# The server stays running...

# Check logs if needed
2nd-brain logs

# Stop when done
2nd-brain stop
```

### Troubleshooting
```bash
# View full logs
2nd-brain logs 100

# Restart if something broke
2nd-brain restart

# Check if running
2nd-brain status

# Stop and debug
2nd-brain stop
# Check logs...
2nd-brain start
```

---

## Daemon Features (via PM2)

The server runs as a **persistent daemon** which means:

✓ **Stays Running**: Runs in background until you explicitly stop it
✓ **Auto-Restart**: Automatically restarts if it crashes
✓ **No Console Blocking**: Your terminal is free to use for other commands
✓ **Log Management**: Logs are saved to `second-brain.log`
✓ **Process Monitoring**: Easy to check status and resource usage

---

## Environment Variables

Configure via `2nd-brain setup` or edit `.env` manually:

```env
# Groq API
GROQ_API_KEY=your_key_here

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URL=http://localhost:3000/auth/callback

# Features
STORAGE_BACKEND=docs    # or 'keep'
MESSAGE_PROVIDER=telegram   # or 'whatsapp'
```

---

## npm Compatibility

If you prefer npm scripts instead of global commands:

```bash
npm start              # Start server
npm stop               # Stop server
npm restart            # Restart server
npm run status         # Check status
npm run logs           # View logs
npm run send "msg"     # Send message
npm run setup          # Setup wizard
```

---

## Tips & Tricks

### Keep Server Running Across Sessions
```bash
# Start once
2nd-brain start

# Server keeps running even if you close terminal
# Check status from any terminal
2nd-brain status
```

### Monitor in Real-time
```bash
# Watch logs in real-time
watch 2nd-brain logs
```

### Run Multiple Instances
```bash
# Create second instance (advanced)
# Edit install path and modify APP_NAME in daemon.js
# Then run another setup with different config
```

### View Detailed Status
```bash
pm2 status              # If pm2 is installed globally
pm2 logs 2nd-brain      # Live logs
```

---

## Support

Need help? Check:
- 📖 [README.md](README.md) - Feature overview
- 🛠 [INSTALL.md](INSTALL.md) - Deployment options
- 🐛 [GitHub Issues](https://github.com/thesaiprasadrao/second-brain/issues)

Happy capturing! 🧠
