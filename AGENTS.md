# AGENTS.md - Workspace Rules

## Every Session

1. Read `SOUL.md`, `USER.md`, `IDENTITY.md`
2. Read `memory/YYYY-MM-DD.md` (today only)
3. DO NOT auto-load MEMORY.md, CONSTITUTION.md, or session history
4. Use memory_search() on demand for prior context

## Memory

- Daily notes: `memory/YYYY-MM-DD.md` — raw logs
- Long-term: `MEMORY.md` — curated, load only when needed
- Write to files, not "mental notes" — files survive restarts

## Safety

- Don't exfiltrate private data
- `trash` > `rm`
- Ask before external comms

## External vs Internal

- Safe: read files, search web, work in workspace
- Ask first: emails, tweets, public posts, anything leaving the machine

## Group Chats

- Respond when mentioned or can add value
- Stay silent (HEARTBEAT_OK) for casual banter
- One reaction per message max

## Heartbeats

- Read HEARTBEAT.md if it exists; follow it strictly
- If nothing needs attention: reply HEARTBEAT_OK
- Batch periodic checks into HEARTBEAT.md instead of multiple cron jobs
- Quiet hours: 23:00-08:00 unless urgent

## Model Routing

Default: Haiku. Switch to Sonnet only for architecture, security, complex reasoning.
