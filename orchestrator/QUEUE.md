# Orchestrator Queue Protocol (v1)

This is a durable, file-based queue so Noble can accept tasks from multiple entry points (Telegram, phone calls, UI) and process them reliably.

## Files
- `orchestrator/queue/inbox.jsonl` — append-only tasks
- `orchestrator/queue/processing/` — claim files (one per task id)
- `orchestrator/queue/done.jsonl` — append-only results
- `orchestrator/queue/failed.jsonl` — append-only failures

## Task record (JSONL)
Each line is one JSON object.

```json
{
  "id": "uuid",
  "createdAt": "2026-02-03T21:00:00.000Z",
  "source": {"kind": "telegram|call|manual", "meta": {}},
  "request": {
    "type": "plan|optimize|networking|research|build",
    "text": "what to do",
    "constraints": {"no_call_until": "2026-02-03T22:00:00.000Z"}
  },
  "policy": {
    "requiresConfirmation": false,
    "allowedExternal": ["telegram_to_bryson"],
    "blockedExternal": ["call","sms","email","billing","delete"]
  },
  "routing": {"agent": "planning|optimizer|networking|manager", "priority": "low|normal|high"}
}
```

## Result record
```json
{
  "id": "uuid",
  "taskId": "uuid",
  "createdAt": "...",
  "status": "done|failed",
  "summary": "one-line",
  "artifacts": ["relative/path.md"],
  "nextActions": ["..."]
}
```

## Claiming
A runner claims a task by creating `processing/<taskId>.json` containing the full task. This prevents double-processing.

## Safety
- Never execute external actions (calls/SMS/email/billing/destructive) without explicit approval.
- Telegram-to-Bryson updates are allowed by default.
