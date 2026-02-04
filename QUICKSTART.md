# Quick Start Guide - Mac Mini Migration

**Status:** Ready to push to GitHub and deploy to Mac Mini

## Current Status

✅ **Phase 1 Complete:** All files committed and ready
- Configuration files created
- Documentation complete
- Setup automation ready
- Secrets protected
- 93 files committed to git

## Next: Push to GitHub (5 minutes)

### Step 1: Create Private GitHub Repository

```bash
# On Windows, in the workspace directory
cd /c/agent/openclaw-workspace

# Option A: Using GitHub CLI (recommended)
gh repo create openclaw-config --private --description "OpenClaw Mac Mini configuration with Ollama automation"

# Option B: Manual (create on github.com first, then):
# 1. Go to https://github.com/new
# 2. Name: openclaw-config
# 3. Private: YES
# 4. Don't add README (already exists)
# 5. Create repository
```

### Step 2: Add Remote and Push

```bash
# Add GitHub as remote
git remote add origin git@github.com:UnlimitedxIQ/openclaw-config.git

# Or if using HTTPS:
# git remote add origin https://github.com/UnlimitedxIQ/openclaw-config.git

# Push all commits
git push -u origin master
```

### Step 3: Setup Agent Config Repository (Optional but Recommended)

```bash
# Navigate to agent config
cd C:\Users\bryso\.openclaw\agents\main\agent

# Initialize git if not already
git init

# Create .gitignore
echo "auth-profiles.json" > .gitignore
echo "*.env" >> .gitignore
echo "credentials/" >> .gitignore

# Commit all files
git add .
git commit -m "Initial agent configuration for Mac Mini"

# Create private repo
gh repo create openclaw-agent-config --private --description "OpenClaw agent configuration"

# Add remote and push
git remote add origin git@github.com:UnlimitedxIQ/openclaw-agent-config.git
git push -u origin master
```

## On Mac Mini: Full Setup (1 hour)

### Prerequisites
- Mac Mini with macOS 12+
- Internet connection
- GitHub SSH key configured

### One-Command Setup

```bash
# 1. Clone and setup everything
mkdir -p ~/openclaw && cd ~/openclaw && \
git clone git@github.com:UnlimitedxIQ/openclaw-config.git workspace && \
git clone git@github.com:UnlimitedxIQ/openclaw-agent-config.git agent-config && \
cd workspace && chmod +x setup-mac.sh && ./setup-mac.sh

# 2. Set API key
export ANTHROPIC_API_KEY="your-key-here"
echo 'export ANTHROPIC_API_KEY="your-key-here"' >> ~/.zshrc

# 3. Copy agent config
mkdir -p ~/.openclaw/agents/main
cp -r ~/openclaw/agent-config/* ~/.openclaw/agents/main/agent/

# 4. Create workspace symlink
mkdir -p ~/agent
ln -s ~/openclaw/workspace ~/agent/openclaw-workspace

# 5. Copy and configure OpenClaw config
cp ~/openclaw/workspace/openclaw.json.example ~/.openclaw/openclaw.json
sed -i '' 's|/path/to/openclaw-workspace|/Users/'$(whoami)'/agent/openclaw-workspace|g' ~/.openclaw/openclaw.json

# 6. Copy and configure cron jobs
mkdir -p ~/.openclaw/cron
cp ~/openclaw/workspace/cron-jobs.json.example ~/.openclaw/cron/jobs.json
sed -i '' 's|C:\\\\agent\\\\openclaw-workspace|/Users/'$(whoami)'/agent/openclaw-workspace|g' ~/.openclaw/cron/jobs.json

# 7. Start OpenClaw
openclaw gateway
```

### Verification

```bash
# In another terminal:

# Check Ollama
ollama list

# Test models
ollama run llama3.2:3b "test"

# Check OpenClaw status
openclaw status

# List cron jobs
openclaw cron list

# Watch logs
openclaw logs --follow
```

## Enable Background Workers (5 minutes)

Once verified working:

```bash
# Enable new Ollama workers
openclaw cron enable code-analysis-worker
openclaw cron enable daily-memory-compaction
openclaw cron enable research-queue-processor
openclaw cron enable project-idea-generator

# Verify enabled
openclaw cron list

# Watch them run
openclaw cron runs --follow
```

## Run as 24/7 Service

### Option 1: LaunchAgent (Recommended for Mac)

```bash
# Create LaunchAgent plist
cat > ~/Library/LaunchAgents/com.openclaw.gateway.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openclaw.gateway</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/openclaw</string>
        <string>gateway</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HOME/openclaw/logs/gateway.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/openclaw/logs/gateway-error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>ANTHROPIC_API_KEY</key>
        <string>YOUR_API_KEY_HERE</string>
    </dict>
</dict>
</plist>
EOF

# Create logs directory
mkdir -p ~/openclaw/logs

# Load and start
launchctl load ~/Library/LaunchAgents/com.openclaw.gateway.plist
launchctl start com.openclaw.gateway

# Check status
launchctl list | grep openclaw
```

### Option 2: Screen Session (Simpler)

```bash
# Start in background
screen -dmS openclaw openclaw gateway

# Check it's running
screen -ls

# Attach to view
screen -r openclaw

# Detach: Ctrl+A then D
```

## Daily Monitoring (2 minutes)

```bash
# Quick health check
openclaw status && \
openclaw cron runs --limit 10 && \
tail -20 ~/openclaw/logs/gateway.log
```

## Weekly Maintenance (5 minutes)

```bash
# Update configuration
cd ~/openclaw/workspace
git pull

# Update OpenClaw
npm update -g openclaw

# Restart service
openclaw restart

# Or if using LaunchAgent:
launchctl stop com.openclaw.gateway
launchctl start com.openclaw.gateway
```

## Troubleshooting

### Ollama not responding
```bash
brew services restart ollama
ollama list
```

### OpenClaw won't start
```bash
# Check logs
openclaw logs | tail -50

# Check API key
echo $ANTHROPIC_API_KEY

# Test manually
openclaw agent --message "test"
```

### Cron jobs not running
```bash
# Check enabled status
openclaw cron list

# Check recent runs
openclaw cron runs

# Try manual trigger
openclaw cron run heartbeat
```

## Cost Tracking

```bash
# Monitor API usage
openclaw logs | grep anthropic | wc -l  # Anthropic calls
openclaw logs | grep ollama | wc -l     # Ollama calls (free)

# Expected ratio: ~70% Ollama, ~30% Anthropic
```

## Success Checklist

- [ ] Git pushed to GitHub
- [ ] Mac Mini setup complete
- [ ] Ollama running with 5 models
- [ ] OpenClaw gateway running
- [ ] Heartbeat executing hourly
- [ ] New background workers enabled
- [ ] No auth errors in logs
- [ ] Running as service (24/7)
- [ ] Stable for 24+ hours
- [ ] Cost tracking shows ~$30/month

## Support

- **Detailed migration guide:** `MIGRATION_GUIDE.md`
- **Full documentation:** `README.md`
- **Implementation status:** `IMPLEMENTATION_STATUS.md`
- **Configuration examples:** `openclaw.json.example`, `cron-jobs.json.example`

## Files to Reference

| File | Purpose |
|------|---------|
| `QUICKSTART.md` | This file - quick commands |
| `README.md` | Complete documentation |
| `MIGRATION_GUIDE.md` | Detailed step-by-step guide |
| `IMPLEMENTATION_STATUS.md` | Current status and checklist |
| `setup-mac.sh` | Automated Mac setup script |
| `openclaw.json.example` | Configuration template |
| `cron-jobs.json.example` | Cron jobs template |
| `.env.example` | API keys template |

---

**Time Estimates:**
- Push to GitHub: 5 minutes
- Mac Mini setup: 1 hour
- Verification: 30 minutes
- Enable workers: 5 minutes
- Service setup: 10 minutes
- **Total: ~2 hours**

**Current Phase:** Ready to push to GitHub (Step 1 above)
