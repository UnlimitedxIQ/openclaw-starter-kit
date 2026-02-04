# Orchestrator Manager Design (Noble / OpenClaw)

## 0) Summary

This orchestrator is a **durable task manager + dispatcher**.

It is designed to:

1. Receive tasks from multiple channels (Telegram, Twilio voice/calls, HTTP).
2. Persist every state change in an **append-only JSONL event log** (auditable, replayable).
3. Route tasks to specialized agents via **OpenClaw sessions** (`sessions_spawn` + `sessions_send`).
4. Enforce **approvals** for side-effecting or sensitive actions.
5. Report results back to the original requester/channel.

The core idea is **event sourcing**: the queue is not a mutable DB row; it is the **reduced state** of an append-only event stream.

---

## 1) Goals and non-goals

### Goals
- **Restart-safe**: process can crash/restart without losing tasks.
- **Auditable**: every transition is recorded.
- **Channel-agnostic**: Telegram/voicebot/CLI all become “tasks”.
- **Safe by default**: any external side effect requires an explicit approval gate.
- **Composable**: routing rules + tool adapters are pluggable.

### Non-goals (v1)
- Perfect LLM “autonomy”. We prefer **predictable workflows** with approvals.
- A full distributed system (single orchestrator process is assumed).

---

## 2) Concepts

### Task
A unit of work created from an inbound message/call.

Key fields:
- `taskId`: stable ID (uuid)
- `channel`: `telegram|twilio|http|cli|system`
- `requester`: channel-specific identity (chat id, phone number, etc.)
- `input.text`: raw request
- `status`: `queued|waiting_approval|dispatching|waiting_subagent|running|done|failed|canceled`
- `route`: selected handler/sub-agent role

### Event
An append-only record describing a change.

Examples:
- `task.created`, `task.claimed`, `task.status.changed`
- `approval.requested`, `approval.granted`, `approval.denied`
- `subagent.spawned`, `subagent.message.sent`, `subagent.completed`
- `task.completed`, `task.failed`

### Lease (claim)
To avoid double-processing:
- dispatcher writes `task.claimed` with `leaseUntilMs`
- claim owner must renew; expired leases can be reclaimed.

### Approval
A structured decision needed before a risky action.

Approvals are modeled as events and can be satisfied out-of-band (Telegram inline buttons, CLI, HTTP).

---

## 3) Persistence model (event-sourced JSONL)

Files:
- `state/events.jsonl`: **source of truth** (append-only)
- `state/snapshot.json`: optional reduced state snapshot (derived)

Why JSONL:
- easy to append atomically
- human-auditable
- robust under partial writes (line-delimited)

See `docs/QUEUE_FORMAT.md` for exact schemas.

---

## 4) Execution flow

### 4.1 Ingress → Enqueue
1. Inbound message/call arrives (Telegram update, Twilio transcription, HTTP POST).
2. Ingress normalizes into a `task.created` event.
3. Orchestrator reduces state; task becomes `queued`.

**Concrete ingress endpoints (starter code):**
- Enqueue: `POST http://127.0.0.1:3879/v1/tasks/enqueue` with JSON `{ channel, requester, text, priority?, meta? }`
- Approve: `POST http://127.0.0.1:3879/v1/tasks/<taskId>/approve`
- Complete: `POST http://127.0.0.1:3879/v1/tasks/<taskId>/complete`

### 4.2 Dispatch loop
Repeated loop:

1. Load/reduce current state.
2. Find eligible tasks:
   - `status=queued`
   - not claimed or lease expired
   - not blocked by approvals
3. Claim a task (write `task.claimed`).
4. Route:
   - compute `route` using rules (keywords, channel, task type)
   - write `task.routed`
5. Plan step (optional but recommended): spawn a *planner* sub-agent to produce:
   - structured plan
   - required approvals
   - expected artifacts
6. If approvals required:
   - write `approval.requested` and set `status=waiting_approval`
   - report to human with approve/deny UI
7. If approved or no approvals:
   - spawn sub-agent(s) or execute via tool adapter
8. Capture completion:
   - sub-agent reports result (via OpenClaw session message + artifact file, or HTTP callback)
   - write `task.completed` / `task.failed`
9. Reporter sends outcome back to requester.

### 4.3 Result reporting
Reporting is channel-specific:
- Telegram: send summary + artifacts/links
- Twilio call: provide short spoken summary (TTS) and/or SMS follow-up

---

## 5) Safety gates and approvals

Principle: **No external side effect without explicit, logged approval**.

### 5.1 Action classes
- **READ_ONLY**: web_search, web_fetch, reading local files.
- **LOCAL_SIDE_EFFECT**: writing workspace files, running *allowlisted* commands.
- **EXTERNAL_SIDE_EFFECT**: sending messages, clicking “submit” in browser, API writes.
- **DESTRUCTIVE**: deletions, purchases, financial actions, account changes.

### 5.2 Gate policy (defaults)
- READ_ONLY → auto-allowed.
- LOCAL_SIDE_EFFECT → auto-allowed *if inside workspace* and command allowlisted.
- EXTERNAL_SIDE_EFFECT → requires approval.
- DESTRUCTIVE → requires approval **and** a “two-step” confirmation (plan + execute).

### 5.3 Approval lifecycle
1. `approval.requested` (includes `approvalId`, `reason`, `scope`, `expiresAtMs`)
2. human chooses `grant`/`deny`
3. `approval.granted` or `approval.denied`

All approvals are tied to a **specific plan hash** so that approvals cannot be reused for a different plan.

See `docs/SAFETY.md`.

---

## 6) OpenClaw integration (`sessions_spawn` / `sessions_send`)

### 6.1 Pattern: one task ↔ one sub-agent session
For each task needing LLM work, orchestrator creates a dedicated sub-agent session:

- `sessions_spawn`
  - label: `orchestrator:task:<taskId>:<role>`
  - system prompt: role-specific
  - injected context: task input + any relevant artifacts

- `sessions_send`
  - send the work request with strict output contract (e.g., “write results to … and reply DONE”).

Orchestrator stores:
- `task.subagents[] = { role, sessionId, spawnedAtMs }`

### 6.2 Output contract (robust)
Because asynchronous session output collection can vary, the recommended contract is:

1. sub-agent writes its deliverable to a deterministic artifact file:
   - `orchestrator/artifacts/<taskId>/<role>.md`
2. sub-agent sends a final message:
   - `RESULT_FILE: orchestrator/artifacts/<taskId>/<role>.md`
   - plus a short summary

Orchestrator then marks the task complete.

### 6.3 Minimum tool surface
Only these session tools are required for v1:
- `sessions_spawn`
- `sessions_send`

Optional (if available):
- `sessions_wait` / `sessions_recv` to pull sub-agent output without relying on artifact files.

### 6.4 Implementation note
The code in `src/openclaw.js` provides an adapter interface with a stub provider.

To complete the integration, implement the provider using the OpenClaw runtime tool calls (inside an agent) or gateway API.

---

## 7) File layout

```
orchestrator/
  README.md
  QUEUE.md                 # v1 queue protocol (task JSONL + claim files)
  runner.js                # v1 queue runner (policy + routing placeholder)

  queue/                   # v1 durable queue
    inbox.jsonl
    done.jsonl
    failed.jsonl
    processing/

  agents/                  # specialist agent packages (planning/optimizer/networking/...)

  docs/
    DESIGN.md
    QUEUE_FORMAT.md        # v2 (event-log) schema; optional upgrade path
    SAFETY.md
    sample-events.jsonl

  src/                     # v2 starter orchestrator (event-sourced)
    index.js               # CLI + runner
    orchestrator.js        # dispatch loop
    router.js
    approvals.js
    storage.js
    openclaw.js
    reporter.js
    ingress/
      http.js

  config/
    default.json

  state/                   # v2 event log state (created at runtime)
    events.jsonl
    snapshot.json

  artifacts/
    <taskId>/...
```

---

## 8) Operational notes

- Run exactly **one** orchestrator instance per `state/` directory.
- Back up `state/events.jsonl` (it is the source of truth).
- Keep artifacts immutable; store new versions with a suffix if needed.
- Prefer **idempotent** actions; record action hashes in events.

---

## 9) Next iterations

- UI: Telegram inline buttons wired to approvals.
- Sub-agent pool + concurrency limits.
- “Plan-first” enforcement for risky tasks.
- Metrics + dashboards.
- Optional SQLite backend (while keeping JSONL as audit log).
