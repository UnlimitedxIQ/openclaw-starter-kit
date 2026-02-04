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

### Cost-Optimized Coding Workflow

**The Strategy:** Use cheap models to write, expensive models to review.

Instead of having Sonnet/Opus write code from scratch (expensive), use this 3-stage approach:

1. **Stage 1: Haiku → DeepSeek Coder (FREE)**
   - Haiku delegates long coding tasks to Ollama
   - DeepSeek writes complete implementation (200-500 lines)
   - Cost: $0.00 (local inference)

2. **Stage 2: Sonnet Reviews & Optimizes**
   - Sonnet reads existing code and suggests targeted edits
   - Only writes 20-50 lines of fixes vs 200-500 from scratch
   - Finds security issues, optimizations, improvements
   - Cost: ~$0.12 (10x cheaper than full rewrite)

3. **Stage 3: Haiku Applies Fixes**
   - Haiku applies Sonnet's edits and runs tests
   - Cost: ~$0.01

**Result:** $0.77 → $0.13 per coding task (83% savings!)

**Example:**
```bash
# User: "Build a REST API for user authentication"

# Haiku delegates to DeepSeek
→ DeepSeek writes 300 lines of code (FREE)

# Sonnet reviews
→ Suggests 25 lines of security fixes (~$0.12)

# Haiku applies
→ Edits code and runs tests (~$0.01)

# Total: $0.13 vs $0.77 if Sonnet wrote from scratch
```

**See `CODING_WORKFLOW.md` for complete guide with templates and examples.**

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
- Coding tasks (10/day): ~$231/month (Sonnet from scratch)
- User interactions: ~$50/month
- **Total: ~$334.64/month**

### After (Mac Mini, Ollama + Anthropic)

**Background Workers:**
- Heartbeats: FREE (Ollama)
- Research scanning: FREE (Ollama)
- Code analysis: FREE (Ollama)
- Memory compaction: FREE (Ollama)
- Idea generation: FREE (Ollama)

**Coding Workflow (Ollama → Sonnet Review):**
- Initial code: FREE (DeepSeek Coder via Ollama)
- Review & optimize: ~$78/month (Sonnet edits only, not full rewrites)
- Apply fixes: ~$3/month (Haiku)
- **Coding total: ~$81/month** (vs $231 = 65% savings)

**User Interactions:**
- Drafts: FREE (Ollama)
- Final polish: ~$30/month (Claude)

**Total: ~$111/month**

### Savings Breakdown
- **Background automation:** $22.64/month saved
- **Coding workflow optimization:** $150/month saved (Ollama writes, Sonnet reviews)
- **Monthly total savings: ~$172.64/month**
- **Annual total savings: ~$2,072/year** 🎉

**See `CODING_WORKFLOW.md` for detailed 3-stage coding optimization strategy.**

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
