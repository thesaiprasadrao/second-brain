# 📖 Installation Guide

Choose your preferred method below.

---

## Option 1: Local Installation (Recommended for Beginners)

### Step 1: Install Node.js

Download and install from https://nodejs.org (choose LTS version 20+)

**Verify installation:**
```bash
node --version  # Should show v20.x.x or higher
```

### Step 2: Download Second Brain

```bash
git clone https://github.com/anomalyco/second-brain.git
cd second-brain
npm install
```

**Or download zip** from GitHub → Extract → `npm install` in folder

### Step 3: Create API Keys

**Groq API Key (free):**
1. Go to https://console.groq.com
2. Sign up or login
3. Copy your API key

**Telegram Bot (if using Telegram):**
1. Open Telegram
2. Search for `@BotFather`
3. Send `/newbot`
4. Follow prompts, save the token
5. Send `/start` to your new bot
6. Copy the chat ID (visible in the dialog)

**Google Account (for saving notes):**
- Just sign in during setup

### Step 4: Run Setup

```bash
npm run setup
```

Follow the interactive wizard:
- Choose Telegram or WhatsApp
- Enter API keys when prompted
- Choose where to save (Google Docs or Keep)
- Grant Google permissions when browser opens

### Step 5: Start!

```bash
npm start
```

Done! 🎉

---

## Option 2: Docker Installation

### Prerequisites
- Install Docker: https://docker.com
- Install Docker Compose

### Steps

```bash
# 1. Clone repo
git clone https://github.com/anomalyco/second-brain.git
cd second-brain

# 2. Create data folder
mkdir -p data

# 3. Start
docker-compose up --build

# 4. Complete setup when prompted
# (Enter API keys, choose options)

# 5. In another terminal, send test message:
docker-compose exec second-brain npm run send "hello"
```

**For remote server (AWS, DigitalOcean, etc):**

```bash
# SSH into server first
ssh user@your.server.com

# Then run above docker commands
```

### Stop/Restart

```bash
# Stop
docker-compose down

# Restart
docker-compose up

# View logs
docker-compose logs -f
```

---

## Option 3: Cloud VPS Installation

Great for always-on setup (Telegram notifications at any time)

### Popular Providers
- **DigitalOcean**: $5/month (cheapest)
- **Linode**: $5/month
- **AWS**: Free tier available
- **Hetzner**: €3/month (Europe)
- **Vultr**: $2.5/month

### Steps (Example: DigitalOcean)

1. **Create droplet**
   - OS: Ubuntu 22.04
   - Size: Basic ($5/month)

2. **SSH into server**
   ```bash
   ssh root@your_ip_address
   ```

3. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

4. **Clone and setup**
   ```bash
   git clone https://github.com/anomalyco/second-brain.git
   cd second-brain
   npm install
   npm run setup
   ```

5. **Keep running (use PM2)**
   ```bash
   npm install -g pm2
   pm2 start src/index.js --name "second-brain"
   pm2 startup
   pm2 save
   ```

6. **Check status**
   ```bash
   pm2 status
   pm2 logs second-brain
   ```

---

## Option 4: Raspberry Pi Installation

### Prerequisites
- Raspberry Pi 4 (2GB+ RAM recommended)
- Power supply
- SD card with Raspberry Pi OS

### Steps

```bash
# 1. SSH into Pi
ssh pi@raspberrypi.local

# 2. Update system
sudo apt update && sudo apt upgrade -y

# 3. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Clone Second Brain
git clone https://github.com/anomalyco/second-brain.git
cd second-brain
npm install

# 5. Setup (will guide you)
npm run setup

# 6. Keep running with PM2
npm install -g pm2
pm2 start src/index.js --name "second-brain"
pm2 startup
pm2 save

# Done!
```

### Access from anywhere
```bash
# Get Pi's IP
hostname -I

# SSH from another computer
ssh pi@192.168.x.x
```

---

## Troubleshooting Installation

### "npm: command not found"
- Install Node.js from https://nodejs.org
- Restart terminal

### "Cannot find module"
```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

### "Permission denied" on Linux/Mac
```bash
# Make executable
chmod +x bin/cli.js
```

### "Setup crashes at Google login"
```bash
# Try again, it may have been network issue
npm run setup

# If problem persists, check internet connection
```

### "Can't connect to Telegram"
1. Double-check token and chat ID
2. Make sure bot is public (not restricted)
3. Try: `curl https://api.telegram.org/botYOUR_TOKEN/getMe`

### "Google Docs API errors"
```bash
# Re-authorize Google
rm .env
npm run setup
```

---

## Getting Help

- 📚 **Main Docs**: [README.md](../README.md)
- 🐛 **Issues**: https://github.com/anomalyco/second-brain/issues
- 💬 **Discussions**: https://github.com/anomalyco/second-brain/discussions

---

## Next Steps

✅ Installation done? Now:

1. **Test it**: Open Telegram and say "hi"
2. **Capture something**: Send a link or idea
3. **Check dashboard**: See stats and recent captures
4. **Read usage guide**: Learn all the commands
5. **Customize settings**: Edit `.env` if needed

Enjoy your Second Brain! 🧠
