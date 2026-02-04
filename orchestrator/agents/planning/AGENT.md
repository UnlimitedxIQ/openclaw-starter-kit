# Noble Planning Agent — Contract

## Purpose
Given a goal, constraints, and current context, produce a concrete execution plan:
- milestones
- tasks with dependencies
- weekly/daily agenda
- risks + decisions + next actions

## Entry points

This module is meant to be called directly by the orchestrator.

CommonJS:

```js
const planning = require('./orchestrator/agents/planning');
```

ESM (orchestrator is `type: module`):

```js
import planning from './agents/planning/index.js';
```

Example:

```js
// CommonJS example
const planning = require('./orchestrator/agents/planning');

const { plan, markdown, paths } = await planning.createPlan({
  goal: '...required...',
  constraints: ['...'], // or a string with newlines/semicolons
  context: '...',        // or { now, resources, stakeholders, assumptions, nonGoals }
  timezone: 'America/Los_Angeles',
  startDate: 'YYYY-MM-DD', // optional
  days: 14,                // optional
  useLLM: true,            // optional
  model: 'gpt-4.1-mini',   // optional
});
```

## Output

`createPlan()` returns:
- `plan` (JSON object)
- `markdown` (rendered Markdown)
- `paths` (where it was persisted)

The `plan` structure is documented in `prompts/plan.system.md` and rendered by `src/markdown.js`.

## Persistence

Plans are persisted under `data/plans/<planId>/` as `plan.json` and `plan.md`.

## LLM behavior

- Uses OpenAI `chat/completions` when `OPENAI_API_KEY` (or `NOBLE_OPENAI_API_KEY`) is present.
- Falls back to a deterministic heuristic plan if:
  - the key is missing,
  - request fails,
  - output is malformed.
