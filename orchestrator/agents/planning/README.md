# Planning Agent (Noble)

A lightweight, dependency-free Planning Agent module intended to be called by the Noble orchestrator.

It takes:
- **goal**
- **constraints**
- **current context**

…and outputs an execution-ready **plan** with:
- milestones
- tasks + dependencies
- a weekly/daily agenda (time-blocked)
- risks, decisions, and next actions

It also **persists plans** to disk (JSON + Markdown).

## Folder layout

```
orchestrator/agents/planning/
  index.js                  # orchestrator-facing API
  src/
    planningAgent.js         # generatePlan/createPlan
    openaiClient.js          # optional OpenAI call
    storage.js               # save/load/list
    markdown.js              # render plan.md
    planSchema.js            # minimal runtime validator
  prompts/
    plan.system.md
    plan.user.md
  data/
    index.json               # plan index (auto)
    plans/<planId>/
      plan.json
      plan.md
  bin/
    noble-plan.js            # CLI helper
```

## Orchestrator API

```js
const planning = require('./orchestrator/agents/planning');

// Create + persist (JSON + Markdown)
const { plan, markdown, paths } = await planning.createPlan({
  goal: 'Launch a landing page for Product X',
  constraints: [
    'Budget: $0 tools if possible',
    'Must be live by Friday',
  ],
  context: {
    now: 'We already have a logo + copy draft in Google Docs.',
    resources: ['Domain purchased', 'Access to Cloudflare'],
    stakeholders: ['Bryson'],
    assumptions: ['No backend required'],
    nonGoals: ['Paid ads'],
  },
  timezone: 'America/Los_Angeles',
  days: 14,
  // useLLM: false, // force deterministic fallback
  // model: 'gpt-4.1-mini',
});

console.log(plan.id, paths.mdPath);

// Load/list
const allPlans = planning.listPlans();
const existing = planning.loadPlan(plan.id);
```

## CLI

From workspace root:

```powershell
node orchestrator/agents/planning/bin/noble-plan.js create --goal "Ship feature Y" --constraints "No weekends; done in 2 weeks" --context "Current codebase: ..." --days 14
node orchestrator/agents/planning/bin/noble-plan.js list
node orchestrator/agents/planning/bin/noble-plan.js show --id <planId>
```

## Persistence

Plans are written under:

- `orchestrator/agents/planning/data/plans/<planId>/plan.json`
- `orchestrator/agents/planning/data/plans/<planId>/plan.md`

A simple index is maintained at:

- `orchestrator/agents/planning/data/index.json`

## LLM usage (optional)

By default, `generatePlan()`/`createPlan()` will attempt an OpenAI call.

Set one of:
- `OPENAI_API_KEY` (recommended)
- `NOBLE_OPENAI_API_KEY`

Optional:
- `NOBLE_PLANNER_MODEL` (defaults to `gpt-4.1-mini`)
- `OPENAI_BASE_URL` (if using a compatible proxy)

If the API key is missing, the request fails, or the model returns malformed JSON, the agent **falls back to a deterministic heuristic plan** so the orchestrator always gets a usable output.

## Design notes / defaults

- The module is intentionally **dependency-free** (Node built-ins only).
- The agenda is time-blocked using a simple default schedule:
  - Weekdays: 09:00–11:30, 13:00–15:30, 16:00–17:00
  - Weekends: 10:00–11:00 (light)
- When LLM output omits fields/ids, the module patches:
  - IDs (`M1…`, `T1…`)
  - milestone ↔ task linkages (`milestone.taskIds`)
  - missing agenda (auto-generated)
