# Memory Directory

This directory contains daily memory logs that track the agent's activities, learnings, and decisions.

## Structure

```
memory/
├── README.md           # This file
├── 2026-02-04.md      # Daily log (YYYY-MM-DD format)
├── 2026-02-05.md
└── ...
```

## How It Works

**Daily Logs:**
- Each day gets a new file: `YYYY-MM-DD.md`
- The agent records activities, decisions, and learnings
- Logs are timestamped and structured

**Memory Compaction:**
- Daily at 11pm, the memory compaction worker runs
- Extracts key insights from daily logs
- Updates `../MEMORY.md` with important learnings
- Keeps accumulated memory under 200 lines

## Privacy

**Note:** Daily memory logs are in `.gitignore` by default to protect your private work information.

To track memory logs in git (if desired), create a custom `.gitignore`:
```
# Allow specific memory files
!memory/2026-02-04.md
```

## Template

Each daily log follows this structure:

```markdown
# Daily Memory - YYYY-MM-DD

## Activities
- [Timestamp] Activity description

## Decisions
- [Timestamp] Decision made and reasoning

## Learnings
- [Timestamp] New pattern or insight discovered

## Issues Encountered
- [Timestamp] Problem and solution

## Tomorrow's Priorities
- Priority 1
- Priority 2
```

## Usage

The agent automatically creates and maintains these files. No manual intervention needed!
