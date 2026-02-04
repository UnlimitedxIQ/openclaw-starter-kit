# TOOLS.md - Local Notes & Optimization

## Available Tools

shell, http, file, llm (Ollama), browser (Playwright), desktop (pyautogui)

## Model Routing

### Cloud Models (Anthropic)
- Default: `anthropic/claude-haiku-4-5` (alias: haiku) — fast, user-facing responses
- Escalate: `anthropic/claude-sonnet-4-5` (alias: sonnet) — complex reasoning, architecture, security
- Maximum: `anthropic/claude-opus-4-5` (alias: opus) — critical decisions only

### Local Models (Ollama - FREE)
- `ollama/llama3.2:3b` (alias: ollama-fast) — heartbeats, status checks, quick tasks (~1-2s)
- `ollama/llama3.1:8b` (alias: ollama-research) — research, summarization, memory (~3-5s)
- `ollama/mistral:7b` (alias: ollama-creative) — brainstorming, drafts, ideas (~2-4s)
- `ollama/deepseek-coder-v2:16b` (alias: ollama-code) — code analysis, debugging (~8-12s)
- `nomic-embed-text` — embeddings for memory search

### Routing Strategy

**Use Ollama (free) for:**
- Background tasks (cron jobs)
- Initial research/scanning
- Code analysis and review
- Memory compaction
- Idea generation
- First drafts
- Routine checks
- **Writing initial code implementations** (DeepSeek Coder)

**Use Claude (paid) for:**
- User-facing responses
- Final document polish
- Complex reasoning/decisions
- Security-critical tasks
- **Reviewing and optimizing code** (Sonnet reads + edits vs writes from scratch)
- When Ollama output is insufficient

### Cost-Optimized Coding Pattern

For long coding tasks (>100 lines):

1. **Haiku delegates** to DeepSeek Coder (Ollama) → writes code (FREE)
2. **Sonnet reviews** existing code → suggests edits (~10x cheaper than writing)
3. **Haiku applies** edits → runs tests (cheap)

**Result:** 65-83% cost savings on coding tasks

**Example:**
```
Traditional: Sonnet writes 300 lines → $0.77
Optimized:   DeepSeek writes 300 lines (FREE)
             Sonnet reviews + edits 25 lines → $0.12
             Haiku applies → $0.01
             Total: $0.13 (83% savings)
```

See `CODING_WORKFLOW.md` for detailed guide.

## Prompt Caching Strategy

Cache (stable, rarely change):
- SOUL.md, USER.md, IDENTITY.md, TOOLS.md
- Reference docs, project templates

Don't cache (change frequently):
- memory/YYYY-MM-DD.md, MEMORY.md
- User messages, tool outputs

Rules:
- Batch requests within 5-minute windows for cache hits
- Don't update SOUL.md mid-session (invalidates cache)
- Keep system prompts stable during sessions

## Rate Limits

- 5s between API calls
- 10s between web searches
- Max 5 searches per batch, then 2-min break
- Batch similar work into single requests

## Budget

- Daily: $5 (warn at 75%)
- Monthly: $200 (warn at 75%)

## Background Workers (Ollama)

All background workers use local Ollama models to minimize costs:

1. **Heartbeat** (every 1h) → `llama3.2:3b`
   - Quick status checks
   - Opportunity detection

2. **Money Research** (every 6h) → `llama3.1:8b`
   - Scan for monetization opportunities
   - Enqueue promising ideas

3. **Code Analysis** (every 2h) → `deepseek-coder-v2:16b`
   - Review workspace code
   - Find bugs and improvements

4. **Memory Compaction** (daily 11pm) → `llama3.1:8b`
   - Summarize daily logs
   - Update MEMORY.md

5. **Research Processor** (every 30min) → `llama3.1:8b`
   - Process orchestrator inbox
   - Generate summaries

6. **Idea Generator** (every 6h) → `mistral:7b`
   - Brainstorm projects
   - Identify quick wins

## Environment

- Platform: Windows
- Workspace: C:\agent\openclaw-workspace
- Ollama: http://localhost:11434
