# OpenClaw Starter Kit 🦞

**Cost-optimized OpenClaw configuration for 24/7 operation with local Ollama models**

Save **$2,000+/year** on AI costs by running background workers locally and using smart coding workflows.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## What Is This?

A complete, production-ready OpenClaw configuration that runs AI automation 24/7 using:
- **6 free background workers** powered by local Ollama models
- **Cost-optimized coding workflow** (83% savings on code generation)
- **Smart model routing** (use expensive models only when needed)

Perfect for running on a Mac Mini, home server, or always-on machine.

## Cost Savings

**Traditional Approach (All Cloud AI):**
- Background tasks: $23/month
- Coding (10 tasks/day): $231/month
- **Total: ~$284/month**

**With This Setup:**
- Background tasks: **FREE** (local Ollama)
- Coding: $81/month (Ollama writes, Claude reviews)
- **Total: ~$81/month**

**Savings: $203/month = $2,436/year** 🎉

## Features

### 🤖 6 Free Background Workers
1. **Heartbeat** (hourly) - System status checks
2. **Money Research** (every 6h) - Find monetization opportunities
3. **Code Analysis** (every 2h) - Review code for bugs and optimizations
4. **Memory Compaction** (daily) - Summarize and organize learnings
5. **Research Processor** (every 30min) - Process research tasks
6. **Idea Generator** (every 6h) - Brainstorm project ideas

### 💻 Smart Coding Workflow
**3-stage optimization saves 83% on coding tasks:**
1. **DeepSeek Coder** (Ollama) writes code - FREE
2. **Claude Sonnet** reviews and optimizes - 10x cheaper than writing from scratch
3. **Claude Haiku** applies fixes - minimal cost

### 📊 Model Routing Strategy
- **Local (Ollama - FREE):** Heartbeats, drafts, initial code, research scanning
- **Cloud (Paid):** User-facing responses, code reviews, complex reasoning

## Quick Start

### Prerequisites
- macOS 12+ (Monterey or later) or Linux
- 16GB+ RAM (for running Ollama models)
- ~15GB disk space (for Ollama models)
- [Anthropic API key](https://console.anthropic.com/)
- [OpenClaw](https://openclaw.com/) installed

### Installation

```bash
# 1. Clone this repository
git clone https://github.com/UnlimitedxIQ/openclaw-starter-kit.git
cd openclaw-starter-kit

# 2. Run setup script (installs Ollama, models, dependencies)
chmod +x setup-mac.sh
./setup-mac.sh

# 3. Configure your personal files
cp CONSTITUTION.md.example CONSTITUTION.md
cp USER.md.example USER.md
cp MEMORY.md.example MEMORY.md
cp STARTUP.md.example STARTUP.md

# Edit these files with your information
nano CONSTITUTION.md  # Set your name and rules
nano USER.md          # Set your profile

# 4. Set API key
export ANTHROPIC_API_KEY="your-key-here"
echo 'export ANTHROPIC_API_KEY="your-key-here"' >> ~/.zshrc

# 5. Copy OpenClaw configuration
cp openclaw.json.example ~/.openclaw/openclaw.json
# Edit paths for your system
nano ~/.openclaw/openclaw.json

# 6. Copy cron jobs
mkdir -p ~/.openclaw/cron
cp cron-jobs.json.example ~/.openclaw/cron/jobs.json
# Edit paths for your system
nano ~/.openclaw/cron/jobs.json

# 7. Start OpenClaw
openclaw gateway
```

### Verification

```bash
# Check Ollama models
ollama list

# Test a model
ollama run llama3.2:3b "Hello!"

# Check OpenClaw status
openclaw status

# View cron jobs
openclaw cron list

# Watch logs
openclaw logs --follow
```

## Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Fast setup commands
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Detailed step-by-step guide
- **[CODING_WORKFLOW.md](CODING_WORKFLOW.md)** - Cost-optimized coding strategy
- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - Feature checklist
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute

## Architecture

### Model Selection

| Task Type | Model | Speed | Cost |
|-----------|-------|-------|------|
| Heartbeats & Check-ins | `ollama/llama3.2:3b` | ~1-2s | FREE |
| Research & Summarization | `ollama/llama3.1:8b` | ~3-5s | FREE |
| Code Generation | `ollama/deepseek-coder-v2:16b` | ~8-12s | FREE |
| Quick Drafts/Ideas | `ollama/mistral:7b` | ~2-4s | FREE |
| User Responses | `claude-haiku-4-5` | ~2-3s | $$ |
| Code Reviews | `claude-sonnet-4-5` | ~5-8s | $$$ |
| Complex Reasoning | `claude-opus-4-5` | ~10-15s | $$$$ |

### Cost-Optimized Coding

Instead of having Claude write code from scratch ($0.77 per task):

1. **Haiku → DeepSeek** (FREE) - DeepSeek writes 300 lines
2. **Sonnet Reviews** ($0.12) - Suggests 25 lines of edits
3. **Haiku Applies** ($0.01) - Applies fixes

**Result:** $0.13 per task (83% savings!)

## Configuration Files

### Personal Files (Not in Repo)
These files contain your personal information and are protected by `.gitignore`:
- `CONSTITUTION.md` - Your rules and constraints
- `USER.md` - Your profile and preferences
- `MEMORY.md` - Your accumulated learnings
- `STARTUP.md` - Your startup configuration

Use the `.example` templates to create these files.

### Configuration Templates
- `openclaw.json.example` - OpenClaw configuration
- `cron-jobs.json.example` - Background worker schedules
- `.env.example` - API keys template

## System Requirements

**Minimum:**
- macOS 12+ or Ubuntu 20.04+
- 16GB RAM
- 15GB free disk space
- Stable internet connection

**Recommended:**
- macOS 14+ or Ubuntu 22.04+
- 32GB RAM (for running multiple models simultaneously)
- 50GB free disk space
- 24/7 uptime (Mac Mini, home server, VPS)

## Supported Ollama Models

This configuration uses these models (automatically installed by `setup-mac.sh`):
- `llama3.2:3b` (~2GB) - Fast, lightweight
- `llama3.1:8b` (~4.7GB) - Balanced performance
- `mistral:7b` (~4.1GB) - Creative tasks
- `deepseek-coder-v2:16b` (~8.9GB) - Code-specialized
- `nomic-embed-text` (~274MB) - Embeddings

**Total:** ~20GB

## Troubleshooting

### Ollama Not Starting
```bash
# Check service
brew services list

# Restart Ollama
brew services restart ollama

# Test manually
ollama serve
```

### Models Not Loading
```bash
# Re-pull models
ollama pull llama3.2:3b
ollama pull llama3.1:8b
ollama pull mistral:7b
ollama pull deepseek-coder-v2:16b
```

### High CPU Usage
```bash
# Check loaded models
ollama ps

# Unload unused models
ollama stop mistral:7b
```

See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for more troubleshooting.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Ways to help:**
- Report issues and share solutions
- Improve documentation
- Add new background workers
- Optimize cost strategies
- Create tutorials

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built on [OpenClaw](https://openclaw.com/)
- Uses [Ollama](https://ollama.ai/) for local inference
- Powered by [Claude](https://claude.ai/) for complex reasoning

## Support

- **Issues:** [GitHub Issues](https://github.com/UnlimitedxIQ/openclaw-starter-kit/issues)
- **Discussions:** [GitHub Discussions](https://github.com/UnlimitedxIQ/openclaw-starter-kit/discussions)
- **Documentation:** See docs linked above

---

**Save $2,000+/year on AI costs. Get started in under an hour.** 🚀
