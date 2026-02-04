# Queue / State Format (JSONL Event Log)

## 1) Source of truth

`state/events.jsonl` is the only required durable store.

- UTF-8
- **one JSON object per line**
- append-only

A snapshot (`state/snapshot.json`) may be written periodically as an optimization.

---

## 2) Event envelope (common fields)

Every line MUST include:

```json
{
  "v": 1,
  "eventId": "01HR...",
  "tsMs": 1707000000000,
  "type": "task.created",
  "taskId": "c9d3c5...",
  "actor": {
    "kind": "ingress|orchestrator|human|subagent|system",
    "id": "telegram:12345" 
  },
  "data": {}
}
```

### Field notes
- `v`: schema version
- `eventId`: unique id (uuid/ulid). Prefer time-sortable.
- `tsMs`: event time (ms since epoch)
- `type`: event type (string)
- `taskId`: required for all task-related events
- `actor`: who caused it
- `data`: event-specific payload

---

## 3) Task state model

### Status enum
- `queued`
- `waiting_approval`
- `dispatching`
- `waiting_subagent`
- `running`
- `done`
- `failed`
- `canceled`

### Claim/lease
A task may include:

```json
{
  "claim": {
    "ownerId": "host:pid",
    "leaseUntilMs": 1707000123456
  }
}
```

Lease expiry allows safe re-processing after crashes.

---

## 4) Canonical event types

### 4.1 Creation

`task.created`

```json
{
  "type": "task.created",
  "data": {
    "channel": "telegram",
    "requester": {"id": "telegram:123", "display": "Bryson"},
    "input": {"text": "Book me a haircut tomorrow"},
    "priority": 50,
    "meta": {"messageId": "..."}
  }
}
```

### 4.2 Routing

`task.routed`

```json
{
  "type": "task.routed",
  "data": {
    "route": "planner|researcher|dev|ops|writer",
    "reason": "keyword: book + calendar"
  }
}
```

### 4.3 Claiming

`task.claimed`

```json
{
  "type": "task.claimed",
  "data": {"ownerId": "Bryson-PC:4821", "leaseUntilMs": 1707000123456}
}
```

`task.lease.renewed`

```json
{
  "type": "task.lease.renewed",
  "data": {"ownerId": "Bryson-PC:4821", "leaseUntilMs": 1707000223456}
}
```

### 4.4 Status transitions

`task.status.changed`

```json
{
  "type": "task.status.changed",
  "data": {"from": "queued", "to": "waiting_approval", "reason": "needs external side effects"}
}
```

### 4.5 Approvals

`approval.requested`

```json
{
  "type": "approval.requested",
  "data": {
    "approvalId": "appr_01HR...",
    "gate": "EXTERNAL_SIDE_EFFECT",
    "reason": "Send Telegram message to Sam",
    "planHash": "sha256:...",
    "expiresAtMs": 1707003600000,
    "request": {
      "kind": "message.send",
      "channel": "telegram",
      "target": "@sam",
      "preview": "Hey Sam — are we still on for tomorrow?"
    }
  }
}
```

`approval.granted` / `approval.denied`

```json
{
  "type": "approval.granted",
  "data": {"approvalId": "appr_01HR...", "planHash": "sha256:...", "by": "telegram:123"}
}
```

### 4.6 Sub-agent coordination

`subagent.spawned`

```json
{
  "type": "subagent.spawned",
  "data": {"role": "planner", "sessionId": "sess_...", "label": "orchestrator:task:...:planner"}
}
```

`subagent.message.sent`

```json
{
  "type": "subagent.message.sent",
  "data": {"role": "planner", "sessionId": "sess_...", "message": "..."}
}
```

`subagent.completed`

```json
{
  "type": "subagent.completed",
  "data": {"role": "planner", "sessionId": "sess_...", "resultFile": "artifacts/<taskId>/planner.md"}
}
```

### 4.7 Completion

`task.completed`

```json
{
  "type": "task.completed",
  "data": {"summary": "Drafted reply and saved to artifacts/...", "result": {"resultFile": "..."}}
}
```

`task.failed`

```json
{
  "type": "task.failed",
  "data": {"error": {"message": "timeout", "stack": "..."}}
}
```

---

## 5) Reduction rules (how state is derived)

On replay:

- The newest `task.status.changed` wins.
- A task is “claimed” if the newest claim has `leaseUntilMs > nowMs`.
- Approvals are satisfied when there exists `approval.granted` matching `approvalId` and `planHash`.
- If the process restarts and finds tasks in `running` with expired lease → move back to `queued` via a new event.

---

## 6) Backward compatibility

- Increment `v` only for breaking schema changes.
- Reducers should ignore unknown fields.
