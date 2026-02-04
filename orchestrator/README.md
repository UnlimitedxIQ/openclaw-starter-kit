# Orchestrator Manager (Noble / OpenClaw)

This folder contains a **robust, restart-safe orchestrator** that:

- ingests tasks from **Telegram**, **Twilio calls/voicebot**, or simple HTTP/CLI
- persists tasks/state in **durable JSONL** (v1 queue files; v2 append-only event log)
- routes work to **specialist sub-agents**
- enforces **human approvals** for sensitive actions
- reports results back to the requester (Telegram/call)

## Start here

- **Design:** `docs/DESIGN.md`
- **Queue & JSONL schema:** `docs/QUEUE_FORMAT.md`
- **Safety/approvals:** `docs/SAFETY.md`

## Queue options

- **v1 (simple queue, already present):** `QUEUE.md` + `runner.js` + `queue/` (inbox/done/failed + claim files)
- **v2 (event-sourced starter, implemented here):** `src/` + `docs/QUEUE_FORMAT.md` + `state/` (append-only events)

## Quickstart (v2 starter code)

```powershell
cd C:\agent\openclaw-workspace\orchestrator
node .\src\index.js run
```

Enqueue a task:

```powershell
node .\src\index.js enqueue --channel telegram --text "Draft a reply to Sam about tomorrow"
```

Check status:

```powershell
node .\src\index.js status
```

## Quickstart (v1 queue runner)

```powershell
cd C:\agent\openclaw-workspace
node .\orchestrator\runner.js
```

> Note: The v2 starter implementation includes a working state machine + HTTP API.
> The OpenClaw `sessions_spawn` / `sessions_send` integration is implemented as an adapter interface with a stub provider.
> See `docs/DESIGN.md#openclaw-integration-sessions_spawn--sessions_send`.
