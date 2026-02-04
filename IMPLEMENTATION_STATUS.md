# Mac Mini Migration - Implementation Status

**Date:** 2026-02-04
**Status:** Phase 1 Complete - Ready for Git Push

## Completed Tasks

### ✅ Phase 1: Configuration and Documentation

1. **Created comprehensive .gitignore**
   - Excludes all secrets (auth-profiles.json, .env, API keys)
   - Excludes runtime state (inbox/outbox files, SQLite databases)
   - Excludes dependencies and build artifacts
   - Allows .env.example as template

2. **Created setup-mac.sh automation script**
   - Installs Homebrew
   - Installs system dependencies (poppler, libreoffice, node, python)
   - Installs and configures Ollama
   - Pulls all 5 required models
   - Installs OpenClaw globally
   - Provides clear next steps

3. **Created comprehensive README.md**
   - Architecture overview with model routing table
   - Background worker descriptions
   - Quick setup instructions
   - Verification steps
   - Cost analysis
   - Repository structure
   - Troubleshooting guide

4. **Created detailed MIGRATION_GUIDE.md**
   - Pre-migration checklist
   - Step-by-step migration process (5 phases)
   - Verification procedures
   - Service setup options (LaunchAgent, screen, tmux)
   - Monitoring and maintenance procedures
   - Troubleshooting section
   - Cost tracking
   - Rollback plan
   - Success criteria

5. **Created configuration templates**
   - `.env.example` - Template for API keys
   - `openclaw.json.example` - Full config with Ollama routing, secrets redacted
   - `cron-jobs.json.example` - All cron jobs including 6 new Ollama workers

6. **Updated TOOLS.md**
   - Added Ollama model descriptions and routing strategy
   - Documented 6 background workers with schedules
   - Clear guidelines on when to use Ollama vs Claude

7. **Committed all changes to git**
   - 92 files changed
   - 7166 insertions
   - Comprehensive commit message
   - All workspace files included

## New Background Workers (Ollama-Powered)

1. **Code Analysis Worker** (every 2h)
   - Model: `deepseek-coder-v2:16b`
   - Analyzes workspace code for bugs, optimizations, improvements
   - Enqueues findings to orchestrator

2. **Daily Memory Compaction** (11pm daily)
   - Model: `llama3.1:8b`
   - Summarizes daily memory logs
   - Updates MEMORY.md with key insights
   - Keeps under 200 lines

3. **Research Queue Processor** (every 30min)
   - Model: `llama3.1:8b`
   - Processes research tasks from orchestrator
   - Generates summaries
   - Enqueues follow-ups

4. **Project Idea Generator** (every 6h)
   - Model: `mistral:7b`
   - Brainstorms monetization ideas
   - Reviews recent learnings
   - Enqueues best ideas for evaluation

5. **Money Research Feeder** (every 6h) - ENHANCED
   - Model: `llama3.1:8b` (upgraded from Anthropic)
   - Scans for AI automation opportunities
   - Enqueues promising ideas

6. **Heartbeat** (every 1h) - EXISTING
   - Model: `llama3.2:3b`
   - Already configured and working
   - Quick status checks

## Cost Impact

### Before (Windows, All Anthropic)
- Heartbeats: ~$1.44/month
- Research: ~$1.20/month
- User interactions: ~$50/month
- **Total: ~$52.64/month**

### After (Mac Mini, Ollama + Anthropic)
- Heartbeats: FREE (Ollama)
- Code analysis: FREE (Ollama)
- Memory compaction: FREE (Ollama)
- Research processing: FREE (Ollama)
- Idea generation: FREE (Ollama)
- Money research: FREE (Ollama)
- User interactions: ~$30/month (drafts → Ollama, final → Claude)
- **Total: ~$30/month**

### Savings
- **Monthly: ~$22.64**
- **Annual: ~$271.68**
- **Percentage: ~43% reduction**

## Files Created/Modified

### New Files
- `.gitignore` - Comprehensive ignore rules
- `README.md` - Main documentation
- `MIGRATION_GUIDE.md` - Step-by-step guide
- `IMPLEMENTATION_STATUS.md` - This file
- `setup-mac.sh` - Automated setup script
- `.env.example` - API key template
- `openclaw.json.example` - Config template
- `cron-jobs.json.example` - Cron jobs template

### Modified Files
- `TOOLS.md` - Added Ollama routing documentation
- `AGENTS.md` - Updated agent descriptions
- `SOUL.md` - Updated personality
- `USER.md` - Updated user context
- `STARTUP.md` - Added startup documentation

### Committed Directories
- `orchestrator/` - Task orchestration system (92 files)
- `scripts/` - Utility scripts
- `memory/` - Memory logs

## Next Steps

### 1. Push to Private Git Repository

```bash
# On Windows
cd /c/agent/openclaw-workspace

# Create private GitHub repo
gh repo create openclaw-config --private --description "OpenClaw configuration and workspace"

# Add remote
git remote add origin git@github.com:UnlimitedxIQ/openclaw-config.git

# Push
git push -u origin master
```

### 2. Setup Agent Config Repository

```bash
cd C:\Users\bryso\.openclaw\agents\main\agent

# Initialize if needed
git init

# Create .gitignore
cat > .gitignore << EOF
auth-profiles.json
*.env
credentials/
EOF

# Commit
git add .
git commit -m "Initial agent configuration"

# Create private repo and push
gh repo create openclaw-agent-config --private
git remote add origin git@github.com:UnlimitedxIQ/openclaw-agent-config.git
git push -u origin master
```

### 3. On Mac Mini

Follow the complete instructions in `MIGRATION_GUIDE.md`:

1. Clone both repositories
2. Run `setup-mac.sh`
3. Configure API keys
4. Copy agent config
5. Create workspace symlink
6. Start OpenClaw gateway
7. Verify all components

### 4. Enable New Background Workers

Once Mac Mini is set up, enable the new cron jobs:

```bash
# Copy cron-jobs.json.example to ~/.openclaw/cron/jobs.json
# Update paths for macOS
# Enable desired jobs:
openclaw cron enable code-analysis-worker
openclaw cron enable daily-memory-compaction
openclaw cron enable research-queue-processor
openclaw cron enable project-idea-generator
```

### 5. Monitor for 24 Hours

```bash
# Check cron executions
openclaw cron runs

# Watch logs
openclaw logs --follow

# Verify Ollama usage
openclaw logs | grep -c "ollama"

# Verify no unexpected Anthropic calls
openclaw logs | grep "anthropic"
```

### 6. Fine-tune and Optimize

After 24-48 hours of operation:
- Adjust cron schedules if needed
- Fine-tune model parameters
- Enable/disable workers based on usefulness
- Monitor costs to confirm savings

## Security Checklist

- ✅ All secrets in .gitignore
- ✅ .env excluded from git
- ✅ auth-profiles.json excluded
- ✅ API keys in openclaw.json.example replaced with placeholders
- ✅ Telegram bot token replaced with placeholder
- ✅ OpenAI API keys replaced with placeholders
- ✅ Gateway auth token replaced with placeholder
- ✅ Runtime state files excluded (inbox/outbox)
- ✅ SQLite databases excluded
- ✅ Template files created (.env.example)

## Testing Checklist (Mac Mini)

Once set up, verify:
- [ ] Ollama installed and running
- [ ] All 5 models pulled (llama3.2:3b, llama3.1:8b, mistral:7b, deepseek-coder-v2:16b, nomic-embed-text)
- [ ] OpenClaw gateway starts successfully
- [ ] Heartbeat job runs via Ollama
- [ ] Money research job runs via Ollama
- [ ] New background workers execute successfully
- [ ] No authentication errors in logs
- [ ] Costs tracking as expected (~$30/month target)
- [ ] Git pull/push works for configuration updates

## Known Issues & Notes

1. **Orchestrator manager disabled** - Requires auth fix before enabling
2. **Telegram outbox drainer disabled** - Requires auth fix before enabling
3. **Agent inbox drainer disabled** - Requires auth fix before enabling
4. **Path differences** - Windows uses backslashes, macOS uses forward slashes
   - `setup-mac.sh` includes sed commands to convert paths
5. **Line endings** - Git warnings about CRLF → LF conversion are normal

## Support & Documentation

- **Main docs:** `README.md`
- **Migration guide:** `MIGRATION_GUIDE.md`
- **Setup script:** `setup-mac.sh`
- **Config examples:** `openclaw.json.example`, `cron-jobs.json.example`
- **API template:** `.env.example`

## Success Metrics

Target achievements:
- ✅ 6 new background workers configured
- ✅ All using free local Ollama models
- ✅ Comprehensive documentation created
- ✅ Automated setup script written
- ✅ Security best practices followed
- ✅ Git repository prepared
- ⏳ Push to private GitHub (next step)
- ⏳ Mac Mini setup (pending hardware)
- ⏳ 24/7 operation verification (post-setup)
- ⏳ Cost savings confirmation (post-setup)

## Rollback Plan

If issues arise:
1. Windows machine can continue running unchanged
2. Git allows easy revert to previous state
3. Both systems can run simultaneously during transition
4. No destructive changes made to existing setup

## Estimated Timeline

- **Phase 1 (Windows prep):** ✅ Complete (~2 hours)
- **Phase 2 (Git push):** ⏳ Next step (~15 minutes)
- **Phase 3 (Mac setup):** ⏳ Pending hardware (~1 hour)
- **Phase 4 (Verification):** ⏳ After setup (~2 hours)
- **Phase 5 (Optimization):** ⏳ After 24-48h (~1 hour)

**Total: ~6.5 hours of work**
