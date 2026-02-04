# Networking Agent (Orchestrator module)

Lightweight, file-backed networking/CRM helper for Noble.

## What it does
- Reads contacts from `contacts/contacts.json` (or `contacts/contacts.csv`).
- Creates **per-person memory** and **per-person CRM state** under `contacts/people/<contactId>/`.
- Manages outreach **sequences** (templates + step schedule), and surfaces **follow-ups due**.
- Stores lightweight CRM notes + touchpoints.
- Generates **meeting prep** briefs as markdown.

This module does **not** send messages. It only drafts copy and maintains state.

## Storage layout
- `contacts/contacts.json` — global contact list
- `contacts/people/<id>/memory.md` — human-readable running notes (append-only)
- `contacts/people/<id>/crm.json` — structured CRM state (touchpoints, open loops, sequences)
- `contacts/people/<id>/meeting-prep/*.md` — generated briefs (optional)

## Default outreach sequences
Stored in:
- `orchestrator/agents/networking/sequences/default.json`

You can add/edit sequences without touching code.

## Programmatic API
```js
const { createNetworkingAgent } = require('./orchestrator/agents/networking');
const agent = createNetworkingAgent();

const res = await agent.run('listContacts', { query: 'bryson' });
console.log(res);
```

### Supported actions (high level)
- `listContacts({ query, tag, limit })`
- `getContact({ id })`
- `upsertContact({ contact })`
- `ensurePerson({ id })`
- `addNote({ id, note, kind, date })`
- `logTouchpoint({ id, touchpoint })`
- `startSequence({ id, sequenceId, channel, goal, context, startDate })`
- `draftNextSequenceStep({ id, instanceId, vars })`
- `markSequenceStepSent({ id, instanceId, stepIndex, sentAt, summary })`
- `getFollowUpsDue({ asOf, withinDays, limit })`
- `meetingPrep({ id, meetingTitle, meetingDate, goals, save })`

## CLI (optional)
```bash
node orchestrator/agents/networking/cli.js list "bryson"
node orchestrator/agents/networking/cli.js due
node orchestrator/agents/networking/cli.js prep bryson "Catch-up"
```

## Safety
- No outbound comms are sent from this module.
- Treat contact data as sensitive; keep files local.
