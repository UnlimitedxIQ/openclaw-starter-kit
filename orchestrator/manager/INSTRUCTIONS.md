# Orchestrator Manager (Always-On)

Goal: automatically dispatch Bryson’s requests to specialist agents and track progress using the durable queue files under `orchestrator/queue/`.

## Inputs
- Queue inbox: `orchestrator/queue/inbox.jsonl` (each line is a JSON task)
- Processing claims: `orchestrator/queue/processing/<taskId>.json`
- Done/failed logs: `orchestrator/queue/done.jsonl`, `orchestrator/queue/failed.jsonl`

## Dispatch rules
- If a task is not yet claimed, claim it by writing `processing/<id>.json`.
- Route:
  - `routing.agent` if present
  - else heuristic:
    - contains "network"/"reach out"/"intro"/"follow up" → networking
    - contains "optimize"/"improve"/"refactor"/"make better" → optimizer
    - contains "plan"/"spec"/"design"/"roadmap" → planning
    - else → planning

## Safety / approvals
- Never message/call anyone besides Bryson without explicit approval.
- Billing actions require explicit approval.
- If approval is needed, write a record to `failed.jsonl` with status `needs_approval` and a clear question, and notify Bryson in chat.

## How to run an agent
- Use `sessions_spawn` with a task prompt.
- Require the sub-agent to write deliverable to `orchestrator/artifacts/<taskId>/<role>.md` and reply with `RESULT_FILE: ...`.

## Completion
- When a sub-agent reports completion, append a `done.jsonl` record and delete the `processing/<taskId>.json` claim.
- If it errors, append a `failed.jsonl` record and delete the claim.

## State
- Track progress in `orchestrator/manager/state.json` using **line offsets**, not byte offsets.
  - Use `inboxLineOffset` (0-based index of the last processed line).
  - Each tick: read the full `inbox.jsonl`, process any lines with index > `inboxLineOffset`, then update `inboxLineOffset` + `lastRunAt`.
- Avoid PowerShell/exec for file IO. Prefer OpenClaw `read`/`write` tools.
