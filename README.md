# OpenClaw Configuration - Mac Mini Migration

Private repository for OpenClaw configuration, workspace files, and automation setup.

## Overview

This repository contains the complete OpenClaw configuration for a 24/7 Mac Mini setup with local Ollama models handling background tasks.

**Key Features:**
- 🤖 Local Ollama models for free background processing
- 📊 Automated research, code analysis, and memory management
- 💰 ~40% cost savings vs cloud-only setup
- 🔄 24/7 operation with cron-based automation
- 🔒 Private git repository for easy deployment

## Architecture

### Model Routing Strategy

| Task Type | Model | Speed | Cost |
|-----------|-------|-------|------|
| Heartbeats & Check-ins | `ollama/llama3.2:3b` | ~1-2s | FREE |
| Research & Summarization | `ollama/llama3.1:8b` | ~3-5s | FREE |
| Code Analysis/Generation | `ollama/deepseek-coder-v2:16b` | ~8-12s | FREE |
| Quick Drafts/Ideas | `ollama/mistral:7b` | ~2-4s | FREE |
| User-facing responses | `claude-haiku-4-5` | ~2-3s | $$ |
| Complex reasoning | `claude-sonnet-4-5` | ~5-8s | $$$ |

### Background Workers

1. **Heartbeat Check** (every 1h) - `llama3.2:3b`
2. **Money Research Feeder** (every 6h) - `llama3.1:8b`
3. **Code Analysis Worker** (every 2h) - `deepseek-coder-v2:16b`
4. **Daily Memory Compaction** (daily 11pm) - `llama3.1:8b`
5. **Research Queue Processor** (every 30min) - `llama3.1:8b`
6. **Project Idea Generator** (every 6h) - `mistral:7b`

## Mac Mini Setup

### Prerequisites

- Mac Mini with macOS 12+ (Monterey or later)
- Internet connection
- Anthropic API key
- GitHub account with SSH key configured

### Quick Setup

```bash
# 1. Clone repositories
mkdir -p ~/openclaw
cd ~/openclaw
git clone git@github.com:UnlimitedxIQ/openclaw-config.git workspace
git clone git@github.com:UnlimitedxIQ/openclaw-agent-config.git agent-config

# 2. Run setup script
cd workspace
chmod +x setup-mac.sh
./setup-mac.sh

# 3. Set API key
export ANTHROPIC_API_KEY="your-key-here"
echo 'export ANTHROPIC_API_KEY="your-key-here"' >> ~/.zshrc

# 4. Copy agent config
mkdir -p ~/.openclaw/agents/main
cp -r ~/openclaw/agent-config/* ~/.openclaw/agents/main/agent/

# 5. Create workspace symlink
mkdir -p ~/agent
ln -s ~/openclaw/workspace ~/agent/openclaw-workspace

# 6. Start OpenClaw
openclaw gateway
```

### Verification Steps

```bash
# Test Ollama models
ollama list
ollama run llama3.2:3b "Hello, test response"

# Test OpenClaw
openclaw agent --message "test ollama integration"

# Check cron jobs
openclaw cron list

# Monitor logs
openclaw logs --follow
```

## Repository Structure

```
openclaw-workspace/
├── setup-mac.sh           # Mac setup automation
├── README.md             # This file
├── .gitignore            # Excludes secrets and runtime state
├── CONSTITUTION.md       # Core principles
├── SOUL.md              # Agent personality
├── USER.md              # User context
├── AGENTS.md            # Agent roster
├── TOOLS.md             # Tool usage guidelines
├── STARTUP.md           # Boot sequence
├── HEARTBEAT.md         # Heartbeat behavior
├── MEMORY.md            # Memory management
├── memory/              # Daily memory logs
│   └── *.md
├── orchestrator/        # Task system
│   ├── manager/
│   ├── queue/
│   └── specialists/
└── scripts/             # Utility scripts
    └── *.py
```

## Cost Analysis

### Before (Windows, All Anthropic)
- Heartbeats: ~$1.44/month
- Research: ~$1.20/month
- User interactions: ~$50/month
- **Total: ~$52.64/month**

### After (Mac Mini, Ollama + Anthropic)
- Heartbeats: FREE (Ollama)
- Research scanning: FREE (Ollama)
- Code analysis: FREE (Ollama)
- Memory compaction: FREE (Ollama)
- Idea generation: FREE (Ollama)
- User interactions: ~$30/month (drafts → Ollama, final → Claude)
- **Total: ~$30/month**

**Savings: ~$22.64/month (~$272/year)**

## Configuration Files

### Main Config: `~/.openclaw/openclaw.json`

Contains:
- Model routing rules
- Ollama integration settings
- Authentication profiles (gitignored)
- Skill configurations
- Gateway settings

### Cron Jobs: `~/.openclaw/cron/jobs.json`

Contains:
- All scheduled background tasks
- Model assignments for each job
- Schedule definitions (cron or interval)

### Agent Identity: `~/.openclaw/agents/main/agent/`

Contains:
- `IDENTITY.md` - Agent identity
- `SOUL.md` - Agent personality
- `auth-profiles.json` - API keys (gitignored)

## Security

**Files to NEVER commit:**
- `auth-profiles.json` - Contains API keys
- `*.env` - Environment variables
- `*-inbox.jsonl` / `*-outbox.jsonl` - Runtime message queues
- `*.sqlite` - Databases
- `credentials/**` - Any credential files

**Safe to commit:**
- Configuration files with secrets redacted
- Workspace markdown files
- Scripts (without embedded tokens)
- Cron job definitions (without API keys)

## Maintenance

### Updating Configuration

```bash
# On Mac Mini
cd ~/openclaw/workspace
git pull
openclaw restart
```

### Pushing Changes

```bash
# On Windows or Mac
cd /c/agent/openclaw-workspace  # Windows
# or
cd ~/openclaw/workspace  # Mac

git add .
git commit -m "Description of changes"
git push
```

### Monitoring

```bash
# View active jobs
openclaw cron list

# View recent job runs
openclaw cron runs

# Check agent status
openclaw status

# View logs
openclaw logs --tail 100
```

## Troubleshooting

### Ollama not responding
```bash
# Check if Ollama is running
brew services list

# Restart Ollama
brew services restart ollama

# Test manually
ollama list
```

### Models not found
```bash
# Pull missing models
ollama pull llama3.2:3b
ollama pull llama3.1:8b
ollama pull mistral:7b
ollama pull deepseek-coder-v2:16b
```

### Authentication errors
```bash
# Verify API key is set
echo $ANTHROPIC_API_KEY

# Re-add to shell profile
echo 'export ANTHROPIC_API_KEY="your-key-here"' >> ~/.zshrc
source ~/.zshrc
```

### Cron jobs not running
```bash
# Check job status
openclaw cron list

# Enable disabled jobs
openclaw cron enable <job-id>

# Check logs for errors
openclaw logs | grep ERROR
```

## Support

For issues or questions:
1. Check logs: `openclaw logs --follow`
2. Review cron status: `openclaw cron list`
3. Test Ollama: `ollama list`
4. Check GitHub issues (if using GitHub)

## License

Private repository - All rights reserved.
