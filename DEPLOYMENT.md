# 🚀 Deployment Guide

Deploy Second Brain on different platforms.

---

## Local Machine (Development)

Best for: Testing, personal use, learning

```bash
npm install
npm run setup
npm start
```

**Pros:** Full control, no costs
**Cons:** Only works when your computer is on

---

## Docker (Any Platform)

Best for: Easy setup, reproducible environments

```bash
docker-compose up --build
```

**For remote servers, add to docker-compose.yml:**
```yaml
ports:
  - "4242:4242"  # For OAuth callback
```

---

## Heroku (Deprecated - Use Alternatives)

Heroku killed free tier. Use Railway instead (better anyway).

---

## Railway.app

Best for: One-click deployment, free tier available

1. Create account at https://railway.app
2. Connect GitHub repo
3. Set environment variables:
   - GROQ_API_KEY
   - TELEGRAM_BOT_TOKEN
   - TELEGRAM_CHAT_ID
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - GOOGLE_REFRESH_TOKEN
4. Deploy!

**Cost:** Free tier $5/month credit, then $0.50/hour

---

## Replit

Best for: Quick experiments, tutorials

1. Go to https://replit.com
2. Create new Repl from GitHub repo
3. Set secrets (Replit equivalent of env vars)
4. Run: `npm start`

**Cost:** Free with ads, Pro $7/month

---

## DigitalOcean App Platform

Best for: Simple app deployment

```bash
# Create app.yaml in repo root
name: second-brain
services:
- name: api
  github:
    repo: your-username/second-brain
    branch: main
  build_command: npm install
  run_command: npm start
  http_port: 3000
envs:
- key: GROQ_API_KEY
  scope: RUN_TIME
- key: TELEGRAM_BOT_TOKEN
  scope: RUN_TIME
```

Then in DigitalOcean console: "Create App" → Connect GitHub → Select repo

**Cost:** $5-12/month

---

## AWS EC2 (More Control)

Best for: Production, scaling, custom needs

1. Launch Ubuntu 22.04 t3.micro instance
2. SSH in
3. Run deployment script:

```bash
#!/bin/bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
git clone https://github.com/anomalyco/second-brain.git
cd second-brain
npm install
npm install -g pm2
pm2 start src/index.js --name "second-brain"
pm2 startup
pm2 save
```

**Cost:** Free tier eligible, then $3-9/month for t3.micro

---

## Raspberry Pi (Always-On Server)

Best for: Low cost, always running, home network

```bash
# On Pi:
sudo apt update && sudo apt upgrade
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
git clone https://github.com/anomalyco/second-brain.git
cd second-brain
npm install
npm install -g pm2
pm2 start src/index.js
pm2 startup
pm2 save

# From another computer:
ssh pi@your_pi_ip
```

**Cost:** ~$40-80 one-time (Pi 4 with accessories)

---

## Cron Job Setup (Always Running)

For development/testing, keep running even after restart:

**Linux/Mac:**
```bash
# Edit crontab
crontab -e

# Add:
@reboot cd ~/second-brain && npm start >> ~/second-brain.log 2>&1
```

**Mac only (LaunchAgent):**
```bash
cat > ~/Library/LaunchAgents/com.secondbrain.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.secondbrain</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/Users/YOU/second-brain/src/index.js</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.secondbrain.plist
```

---

## PM2 (Process Manager)

Best for: Keep app running, auto-restart on crash

```bash
npm install -g pm2

# Start
pm2 start src/index.js --name "second-brain"

# Auto-restart on boot
pm2 startup
pm2 save

# View status
pm2 status
pm2 logs second-brain
pm2 monit
```

---

## Systemd Service (Linux)

Create `/etc/systemd/system/second-brain.service`:

```ini
[Unit]
Description=Second Brain AI
After=network.target

[Service]
Type=simple
User=nobody
WorkingDirectory=/opt/second-brain
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable second-brain
sudo systemctl start second-brain
sudo systemctl status second-brain
```

---

## Custom VPS (DigitalOcean, Linode, Vultr, etc)

### Quick Setup Script

Save as `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying Second Brain..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone app
sudo git clone https://github.com/anomalyco/second-brain.git /opt/second-brain
cd /opt/second-brain
npm install --production

# Setup PM2
sudo npm install -g pm2
sudo pm2 start src/index.js --name "second-brain"
sudo pm2 startup systemd -u root --hp /root
sudo pm2 save

echo "✅ Done! Run: npm run setup"
```

Then:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Environment Variables

Key variables for deployment:

```env
# Required
GROQ_API_KEY=gsk_...
TELEGRAM_BOT_TOKEN=123:ABC...
TELEGRAM_CHAT_ID=987654321
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...

# Optional
STORAGE_BACKEND=docs         # or: keep
CHANNEL=telegram             # or: whatsapp
BRIEFING_TIME=08:00         # 24-hour format

# Deployment
NODE_ENV=production
```

---

## Health Checks

For monitoring/alerting:

```bash
# Simple health check
curl http://localhost:4242/health 2>/dev/null || echo "Down"

# PM2 monitoring
pm2 plus  # Cloud monitoring

# Log rotation
pm2 install pm2-auto-pull
```

---

## Backup Strategy

```bash
# Backup captures (runs daily)
0 2 * * * tar -czf ~/backups/second-brain-$(date +\%Y\%m\%d).tar.gz ~/second-brain/memory.db

# Backup to cloud
# Consider: AWS S3, Google Drive, Backblaze
```

---

## Troubleshooting Deployment

### "Connection refused"
- Check firewall rules
- Verify port binding
- Check network connectivity

### "Out of memory"
- Increase swap: `sudo fallocate -l 2G /swapfile`
- Or upgrade instance size
- Monitor with: `free -h`

### "Permission denied"
- Check user ownership: `chown -R user:user /app`
- Verify file permissions: `chmod -R 755 /app`

### "Can't connect to Google APIs"
- Verify API keys
- Check quotas in Google Cloud Console
- Try re-running setup

### "Telegram not responding"
- Check token validity
- Verify chat ID is correct
- Ensure internet connectivity

---

## Monitoring & Alerts

### Uptime Monitoring
- UptimeRobot (free): https://uptimerobot.com
- Set to check every 5 minutes

### Error Logging
- Loggly (free tier): https://www.loggly.com
- Sentry (free): https://sentry.io

### Performance Monitoring
- PM2 Plus: https://pm2.io/
- New Relic: https://newrelic.com/

---

## Cost Comparison

| Platform | Cost | Best For |
|----------|------|----------|
| Local PC | $0 | Development |
| Raspberry Pi | $40-80 | Home server |
| DigitalOcean | $5/mo | Budget VPS |
| Railway | $5/mo free credit | Beginners |
| AWS EC2 | Free tier + $3/mo | Scale up |
| Heroku | Deprecated | N/A |

---

Need help? Open issue on [GitHub](https://github.com/anomalyco/second-brain/issues)
