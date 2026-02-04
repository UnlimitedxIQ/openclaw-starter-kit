# Mac Mini Migration Guide

Complete guide for migrating OpenClaw from Windows to a 24/7 Mac Mini with local Ollama models.

## Pre-Migration Checklist

### On Windows (Source Machine)

- [ ] All changes committed to git
- [ ] Secrets redacted from config files
- [ ] `.gitignore` properly configured
- [ ] Private git repository created
- [ ] Configuration pushed to remote

### Information Needed

- [ ] Anthropic API key
- [ ] Telegram bot token (if using)
- [ ] Other service API keys (Notion, OpenAI, etc.)
- [ ] Mac Mini IP address or hostname
- [ ] GitHub SSH key configured on Mac

## Phase 1: Prepare Windows Repository

### 1. Update Git Configuration

```bash
cd /c/agent/openclaw-workspace

# Review what will be committed
git status

# Add all tracked files
git add .

# Commit changes
git commit -m "Prepare for Mac Mini migration with Ollama background workers"
```

### 2. Create Private GitHub Repository

```bash
# Using GitHub CLI (if installed)
gh repo create openclaw-config --private --description "OpenClaw configuration and workspace"

# Or create manually on GitHub.com, then add remote:
git remote add origin git@github.com:UnlimitedxIQ/openclaw-config.git

# Push to remote
git push -u origin master
```

### 3. Setup Agent Config Repository

```bash
cd C:\Users\bryso\.openclaw\agents\main\agent

# Initialize if not already a repo
git init

# Create .gitignore to exclude secrets
cat > .gitignore << EOF
auth-profiles.json
*.env
credentials/
EOF

# Commit and push
git add .
git commit -m "Initial agent configuration"
git remote add origin git@github.com:UnlimitedxIQ/openclaw-agent-config.git
git push -u origin master
```

## Phase 2: Mac Mini Setup

### 1. Initial System Setup

```bash
# SSH into Mac Mini or use directly
ssh user@mac-mini.local

# Update Homebrew
brew update

# Clone repositories
mkdir -p ~/openclaw
cd ~/openclaw
git clone git@github.com:UnlimitedxIQ/openclaw-config.git workspace
git clone git@github.com:UnlimitedxIQ/openclaw-agent-config.git agent-config
```

### 2. Run Setup Script

```bash
cd ~/openclaw/workspace
chmod +x setup-mac.sh
./setup-mac.sh
```

The script will:
- Install Homebrew (if needed)
- Install system dependencies (poppler, libreoffice, node, python)
- Install Ollama
- Pull all required models (~10GB download)
- Install OpenClaw globally
- Run initial setup

### 3. Configure API Keys

```bash
# Set Anthropic API key
export ANTHROPIC_API_KEY="sk-ant-api03-xxxxx"

# Persist to shell profile
echo 'export ANTHROPIC_API_KEY="sk-ant-api03-xxxxx"' >> ~/.zshrc
source ~/.zshrc

# Verify it's set
echo $ANTHROPIC_API_KEY
```

### 4. Copy Agent Configuration

```bash
# Create agent directory structure
mkdir -p ~/.openclaw/agents/main

# Copy agent config
cp -r ~/openclaw/agent-config/* ~/.openclaw/agents/main/agent/

# Create auth-profiles.json
cat > ~/.openclaw/agents/main/agent/auth-profiles.json << 'EOF'
{
  "anthropic:default": {
    "provider": "anthropic",
    "mode": "api_key",
    "apiKey": "$ANTHROPIC_API_KEY"
  }
}
EOF
```

### 5. Setup Workspace Symlink

```bash
# Create agent directory
mkdir -p ~/agent

# Create symlink to workspace
ln -s ~/openclaw/workspace ~/agent/openclaw-workspace

# Verify
ls -la ~/agent/openclaw-workspace
```

### 6. Copy OpenClaw Configuration

```bash
# Copy example config
cp ~/openclaw/workspace/openclaw.json.example ~/.openclaw/openclaw.json

# Edit to set correct paths (Mac uses forward slashes)
# Change: C:\agent\openclaw-workspace
# To: /Users/$(whoami)/agent/openclaw-workspace
sed -i '' 's|C:\\\\agent\\\\openclaw-workspace|/Users/'$(whoami)'/agent/openclaw-workspace|g' ~/.openclaw/openclaw.json

# Set API keys in config
# Edit manually or use sed to replace placeholders
nano ~/.openclaw/openclaw.json
```

### 7. Copy Cron Jobs Configuration

```bash
# Copy example cron jobs
mkdir -p ~/.openclaw/cron
cp ~/openclaw/workspace/cron-jobs.json.example ~/.openclaw/cron/jobs.json

# Update paths for macOS
sed -i '' 's|C:\\\\agent\\\\openclaw-workspace|/Users/'$(whoami)'/agent/openclaw-workspace|g' ~/.openclaw/cron/jobs.json
sed -i '' 's|C:\\\\Users\\\\bryso|/Users/'$(whoami)'|g' ~/.openclaw/cron/jobs.json
```

## Phase 3: Verification

### 1. Test Ollama

```bash
# Check Ollama is running
ollama list

# Test each model
ollama run llama3.2:3b "Hello, respond with 'OK' if you're working"
ollama run llama3.1:8b "Summarize: OpenClaw is an AI automation platform"
ollama run mistral:7b "Generate one creative project idea"
ollama run deepseek-coder-v2:16b "Review this code: def hello(): print('hi')"
```

Expected: Each model responds appropriately in 1-15 seconds.

### 2. Test OpenClaw

```bash
# Start OpenClaw gateway
openclaw gateway &

# Wait for startup
sleep 5

# Test agent communication
openclaw agent --message "test: respond if online"

# Check status
openclaw status
```

Expected: Gateway starts on port 18789, agent responds to test message.

### 3. Test Cron Jobs

```bash
# List all cron jobs
openclaw cron list

# Manually trigger heartbeat job
openclaw cron run <heartbeat-job-id>

# View recent runs
openclaw cron runs

# Monitor logs
openclaw logs --follow
```

Expected: All enabled jobs listed, manual trigger succeeds, logs show execution.

### 4. Test Background Workers

```bash
# Check code analysis worker (if enabled)
openclaw cron run code-analysis-worker

# Check memory compaction (if enabled)
openclaw cron run daily-memory-compaction

# View logs for each
openclaw logs | grep "Code Analysis"
openclaw logs | grep "Memory Compaction"
```

Expected: Workers execute successfully using Ollama models, no Anthropic API calls.

### 5. Test Homebrew Dependencies

```bash
# Test poppler (PDF rendering)
pdftoppm -v

# Test LibreOffice (document conversion)
/Applications/LibreOffice.app/Contents/MacOS/soffice --version

# Test in OpenClaw (if pdf skill installed)
openclaw agent --message "use pdf skill to check if dependencies work"
```

Expected: Commands show version info, pdf skill works if sample PDF available.

## Phase 4: Running as a Service

### Option A: LaunchAgent (macOS native)

```bash
# Create plist file
cat > ~/Library/LaunchAgents/com.openclaw.gateway.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
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
    <string>/Users/YOUR_USERNAME/openclaw/logs/gateway.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/YOUR_USERNAME/openclaw/logs/gateway-error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>ANTHROPIC_API_KEY</key>
        <string>YOUR_API_KEY_HERE</string>
    </dict>
</dict>
</plist>
EOF

# Load the service
launchctl load ~/Library/LaunchAgents/com.openclaw.gateway.plist

# Start the service
launchctl start com.openclaw.gateway

# Check status
launchctl list | grep openclaw
```

### Option B: Screen Session (simpler)

```bash
# Start in a screen session
screen -S openclaw

# Start OpenClaw
openclaw gateway

# Detach: Ctrl+A, then D

# Reattach later
screen -r openclaw
```

### Option C: tmux Session

```bash
# Start in tmux
tmux new -s openclaw

# Start OpenClaw
openclaw gateway

# Detach: Ctrl+B, then D

# Reattach later
tmux attach -t openclaw
```

## Phase 5: Monitoring & Maintenance

### Daily Checks

```bash
# Check service status
openclaw status

# View recent logs
openclaw logs --tail 50

# Check cron job executions
openclaw cron runs --limit 20

# Check Ollama status
brew services list | grep ollama
ollama list
```

### Weekly Checks

```bash
# Pull latest configuration from git
cd ~/openclaw/workspace
git pull

# Restart OpenClaw to apply changes
openclaw restart

# Check for OpenClaw updates
npm list -g openclaw
npm update -g openclaw
```

### Monthly Checks

```bash
# Update system
brew update && brew upgrade

# Update Ollama
brew upgrade ollama

# Re-pull models (if updated)
ollama pull llama3.2:3b
ollama pull llama3.1:8b
ollama pull mistral:7b
ollama pull deepseek-coder-v2:16b

# Review disk usage
du -sh ~/openclaw
du -sh ~/.openclaw
du -sh ~/.ollama
```

## Troubleshooting

### Ollama Not Starting

```bash
# Check service status
brew services list

# Check logs
tail -f /opt/homebrew/var/log/ollama.log

# Restart service
brew services restart ollama

# Test manually
ollama serve
```

### OpenClaw Can't Connect to Ollama

```bash
# Check if Ollama is listening
lsof -i :11434

# Test with curl
curl http://localhost:11434/api/tags

# Check OpenClaw config
cat ~/.openclaw/openclaw.json | grep ollama
```

### Cron Jobs Not Running

```bash
# Check job status
openclaw cron list

# Check for errors
openclaw logs | grep ERROR

# Check agent auth
cat ~/.openclaw/agents/main/agent/auth-profiles.json

# Manually trigger job
openclaw cron run <job-id>
```

### High CPU/Memory Usage

```bash
# Check running processes
top -o cpu
top -o mem

# Check Ollama models loaded
ollama ps

# Unload unused models
ollama stop llama3.1:8b

# Restart OpenClaw
openclaw restart
```

### Authentication Errors

```bash
# Verify API key is set
echo $ANTHROPIC_API_KEY

# Check auth profiles
cat ~/.openclaw/agents/main/agent/auth-profiles.json

# Test API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "content-type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-haiku-4-5","messages":[{"role":"user","content":"test"}],"max_tokens":10}'
```

## Cost Tracking

### View OpenClaw Usage

```bash
# View agent metrics
openclaw status --detailed

# View API call history
openclaw logs | grep "anthropic"

# Count Ollama vs Anthropic calls
openclaw logs | grep -c "ollama"
openclaw logs | grep -c "anthropic"
```

### Expected Monthly Costs

**Before (Windows, All Anthropic):**
- Heartbeats: ~1440 calls × $0.001 = $1.44
- Research: ~120 calls × $0.01 = $1.20
- User interactions: ~$50
- **Total: ~$52.64/month**

**After (Mac Mini, Ollama + Anthropic):**
- Heartbeats: FREE (Ollama)
- Background workers: FREE (Ollama)
- User interactions: ~$30 (drafts → Ollama, final → Claude)
- **Total: ~$30/month**

**Savings: ~$22.64/month (~$272/year)**

## Rollback Plan

If migration fails or issues arise:

### Quick Rollback to Windows

```bash
# On Windows machine
cd /c/agent/openclaw-workspace

# Pull latest (if you pushed changes from Mac)
git pull

# Restart OpenClaw
openclaw restart

# Re-enable all original cron jobs
openclaw cron enable <job-id>
```

### Keep Both Running Temporarily

You can run both Windows and Mac simultaneously:
- Windows: Primary user-facing
- Mac: Background workers only

Disable overlapping cron jobs on one machine to avoid duplication.

## Success Criteria

- [ ] Mac Mini accessible 24/7
- [ ] Ollama running with all 5 models
- [ ] OpenClaw gateway running
- [ ] All enabled cron jobs executing successfully
- [ ] No authentication errors in logs
- [ ] Background tasks using Ollama (free)
- [ ] User interactions using Claude (paid but cheaper)
- [ ] Heartbeat running hourly via Ollama
- [ ] Cost reduced by ~40% vs Windows setup
- [ ] Stable for 7+ days continuous operation

## Next Steps

After successful migration:

1. **Optimize Background Workers**
   - Fine-tune cron schedules
   - Adjust model parameters
   - Add new automation workflows

2. **Monitor Performance**
   - Track API costs weekly
   - Measure task completion times
   - Identify optimization opportunities

3. **Expand Capabilities**
   - Add more Ollama-powered workers
   - Implement new skills
   - Explore additional automation

4. **Document Learnings**
   - Update MEMORY.md with migration notes
   - Document any issues encountered
   - Share best practices
