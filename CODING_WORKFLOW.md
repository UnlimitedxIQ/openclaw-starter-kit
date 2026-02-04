# Cost-Optimized Coding Workflow

**Strategy:** Use cheap models for initial work, expensive models only for refinement.

## The Problem

Writing code from scratch with Claude Sonnet/Opus is expensive:
- Sonnet: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- Writing 500 lines of code = ~50,000 output tokens = **~$0.75 per task**
- 10 tasks/day = **$7.50/day = $225/month** 😱

## The Solution: 3-Stage Workflow

### Stage 1: Haiku Delegates to Ollama (FREE)
**Model:** Haiku → DeepSeek Coder (Ollama)
**Task:** Write initial framework and implementation

```
User: "Build a Python API endpoint for user authentication with JWT"

Haiku analyzes:
- This is a long coding task (>200 lines likely)
- Delegates to DeepSeek Coder via Ollama
- DeepSeek writes complete implementation
- Cost: $0.00 (local inference)
```

### Stage 2: Sonnet/Opus Reviews & Fixes (CHEAP)
**Model:** Sonnet or Opus
**Task:** Review existing code, make targeted improvements

```
Sonnet receives:
- Complete working code from DeepSeek
- Only needs to read + edit, not write from scratch
- Makes security fixes, optimizations, style improvements
- Output: 50-100 lines of edits vs 500 lines from scratch
- Cost: ~$0.05-$0.15 (10x cheaper)
```

### Stage 3: Haiku Applies Fixes (CHEAPEST)
**Model:** Haiku
**Task:** Apply edits and run tests

```
Haiku:
- Applies Sonnet's suggested edits
- Runs tests
- Reports results
- Cost: ~$0.01
```

## Cost Comparison

### Traditional Approach (Write from Scratch)
```
Sonnet writes 500 lines of code:
- Input: ~5,000 tokens (prompt + context)
- Output: ~50,000 tokens (code)
- Cost: (5k × $3/1M) + (50k × $15/1M) = $0.015 + $0.75 = $0.765

Per task: $0.77
10 tasks/day: $7.70/day = $231/month
```

### Optimized Approach (Ollama → Sonnet Review)
```
Stage 1 - DeepSeek writes code:
- Cost: $0.00 (Ollama local)

Stage 2 - Sonnet reviews and edits:
- Input: ~55,000 tokens (prompt + DeepSeek's code)
- Output: ~5,000 tokens (targeted edits)
- Cost: (55k × $3/1M) + (5k × $15/1M) = $0.165 + $0.075 = $0.24

Stage 3 - Haiku applies edits:
- Input: ~60,000 tokens
- Output: ~1,000 tokens
- Cost: (60k × $0.25/1M) + (1k × $1.25/1M) = $0.015 + $0.001 = $0.016

Per task: $0.26 (66% savings!)
10 tasks/day: $2.60/day = $78/month (vs $231)
```

### Savings
- **Per task:** $0.77 → $0.26 = **$0.51 saved** (66% reduction)
- **Daily:** $7.70 → $2.60 = **$5.10 saved**
- **Monthly:** $231 → $78 = **$153 saved**
- **Annual:** $2,772 → $936 = **$1,836 saved**

## Implementation Guide

### Method 1: Manual Workflow

```bash
# 1. User requests code
User: "Build a REST API for task management with CRUD operations"

# 2. Haiku delegates to Ollama
openclaw agent --model haiku --message "Delegate this coding task to deepseek-coder via Ollama: Build a REST API for task management with CRUD operations. Save output to workspace/api.py"

# 3. Ollama DeepSeek writes code
# (Haiku internally calls Ollama, code written to api.py)

# 4. Sonnet reviews and optimizes
openclaw agent --model sonnet --message "Review workspace/api.py. Suggest security fixes, optimizations, and improvements. Provide specific code edits."

# 5. Haiku applies fixes
openclaw agent --model haiku --message "Apply the suggested edits from Sonnet to workspace/api.py and run tests"
```

### Method 2: Automated Delegation Pattern

Create a skill or prompt pattern that automates this:

```markdown
# In openclaw.json or as a skill

"coding-task-router": {
  "pattern": "^(build|create|write|implement) .*(api|function|class|module)",
  "workflow": [
    {
      "stage": "analyze",
      "model": "haiku",
      "prompt": "Analyze if this is a >100 line coding task. If yes, delegate to ollama/deepseek-coder-v2:16b"
    },
    {
      "stage": "implement",
      "model": "ollama/deepseek-coder-v2:16b",
      "prompt": "Write complete implementation"
    },
    {
      "stage": "review",
      "model": "sonnet",
      "prompt": "Review code, suggest targeted improvements"
    },
    {
      "stage": "apply",
      "model": "haiku",
      "prompt": "Apply edits and test"
    }
  ]
}
```

### Method 3: Orchestrator Integration

Add to orchestrator queue system:

```json
{
  "taskType": "coding",
  "priority": "normal",
  "workflow": {
    "stage1": {
      "agent": "code-writer",
      "model": "ollama/deepseek-coder-v2:16b",
      "role": "Write initial implementation"
    },
    "stage2": {
      "agent": "code-reviewer",
      "model": "anthropic/claude-sonnet-4-5",
      "role": "Review and optimize",
      "input": "stage1.output"
    },
    "stage3": {
      "agent": "code-applier",
      "model": "anthropic/claude-haiku-4-5",
      "role": "Apply fixes and test",
      "input": "stage2.edits"
    }
  }
}
```

## Prompt Templates

### Stage 1: Haiku → Ollama Delegation

```
You are a task router. The user has requested: "{USER_REQUEST}"

This appears to be a coding task that will require >100 lines of code.

To optimize costs:
1. Delegate this to DeepSeek Coder (Ollama) for initial implementation
2. Provide a clear, detailed specification
3. Request complete working code with tests
4. Save output to workspace for review

Execute delegation now.
```

### Stage 2: Sonnet Code Review

```
You are a senior code reviewer. Review the following code written by DeepSeek Coder:

FILE: {filename}
```
[code here]
```

Provide ONLY targeted improvements for:
1. Security vulnerabilities (SQL injection, XSS, etc.)
2. Performance optimizations
3. Code quality issues
4. Missing error handling
5. Style/readability improvements

Format as specific edits:
- Line X: Change [old] to [new]
- Add: [new code block]
- Remove: [code to remove]

Do NOT rewrite entire file. Only suggest necessary changes.
```

### Stage 3: Haiku Apply Edits

```
Apply the following code edits from Sonnet's review:

EDITS:
{edits}

TO FILE: {filename}

After applying:
1. Verify syntax
2. Run tests if available
3. Report any errors
4. Confirm successful application
```

## When to Use This Workflow

### ✅ Use Ollama → Sonnet Review For:
- New API endpoints (>50 lines)
- Database models and migrations
- Utility functions and helpers
- Test suites
- Configuration files
- Documentation generation
- Boilerplate code
- CRUD operations
- Standard design patterns

### ❌ Direct to Sonnet/Opus For:
- Security-critical code (auth, crypto)
- Complex algorithms requiring deep reasoning
- Architectural decisions
- Code that requires domain expertise
- Debugging subtle race conditions
- Performance-critical optimizations
- Tasks where you need it right the first time

## Real-World Example

### Task: "Build a user registration system with email verification"

**Traditional Approach (Sonnet from scratch):**
```
1. Sonnet writes:
   - User model (50 lines)
   - Registration endpoint (80 lines)
   - Email verification (60 lines)
   - Email templates (40 lines)
   - Tests (100 lines)
   - Total: 330 lines
   - Cost: ~$0.50
```

**Optimized Approach:**
```
1. Haiku analyzes task: "This needs ~300 lines, delegate to Ollama"
   - Cost: ~$0.01

2. DeepSeek writes complete implementation (330 lines)
   - Cost: $0.00 (local)

3. Sonnet reviews, finds:
   - Missing rate limiting on registration (add 10 lines)
   - Email validation insufficient (fix 5 lines)
   - Password hashing needs salt (change 3 lines)
   - Missing index on email column (add 1 line)
   - Test coverage gap (add 20 lines)
   - Total edits: 39 lines
   - Cost: ~$0.12

4. Haiku applies edits and runs tests
   - Cost: ~$0.01

Total: $0.14 (vs $0.50 = 72% savings)
```

## Monitoring & Optimization

### Track Your Savings

```bash
# Count coding tasks by model
openclaw logs | grep "coding task" | grep -c "ollama"    # Free tasks
openclaw logs | grep "coding task" | grep -c "sonnet"   # Paid reviews
openclaw logs | grep "coding task" | grep -c "haiku"    # Paid appliers

# Expected ratio: 70% Ollama, 20% Sonnet review, 10% Haiku
```

### Tune the Threshold

Experiment with delegation threshold:
- <50 lines: Haiku writes directly (fast, cheap enough)
- 50-200 lines: Ollama → Haiku review (Haiku good enough for simple fixes)
- 200+ lines: Ollama → Sonnet review (need expert review)
- 500+ lines: Ollama → Opus review (critical complexity)

## Advanced: Multi-Iteration Refinement

For complex projects, iterate:

```
Iteration 1: Ollama (v1) → Sonnet review → edits
Iteration 2: Ollama applies edits (v2) → Sonnet review → edits
Iteration 3: Final Haiku polish → done

Still cheaper than Sonnet from scratch!
```

## Integration with Background Workers

### Code Analysis Worker Enhancement

Update the code analysis worker to suggest Ollama rewrites:

```json
{
  "id": "code-analysis-with-rewrite-suggestions",
  "schedule": { "kind": "every", "everyMs": 7200000 },
  "payload": {
    "message": "Analyze workspace code. For files with >10 issues, suggest: 'This file should be rewritten by Ollama DeepSeek then reviewed by Sonnet.' Enqueue rewrite tasks to orchestrator.",
    "model": "ollama/deepseek-coder-v2:16b"
  }
}
```

## Summary

**Key Insight:** Reading and editing code is 10x cheaper than writing from scratch.

**The Pattern:**
1. Cheap/free model writes bulk code
2. Expensive model reviews and suggests edits
3. Cheap model applies edits

**Cost Impact:**
- Per coding task: **$0.77 → $0.26** (66% savings)
- 10 tasks/day: **$231/month → $78/month**
- Annual savings: **$1,836/year**

**Total Migration Savings:**
- Background workers: **$272/year** (from earlier calculation)
- Coding workflow: **$1,836/year** (this optimization)
- **Combined: $2,108/year saved** 🎉

---

**Start using this today:**
```bash
# Template command
openclaw agent --model haiku --message "Delegate this coding task to DeepSeek: [YOUR_TASK]"

# Then review with Sonnet
openclaw agent --model sonnet --message "Review the output and suggest improvements"
```
