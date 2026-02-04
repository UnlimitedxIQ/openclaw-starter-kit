# Optimizer Agent

Given a workflow/plan, this agent produces an optimization report:
- bottlenecks (time, waits, handoffs, rework)
- automation/process improvements
- prioritized recommendations (impact/effort/ROI)
- a phased action list (Now / Next / Later)

This module is **callable by the Orchestrator** as a plain Node.js module (no external deps). It is implemented as **ESM** (the Orchestrator repo uses `type: module`).

## Quick usage (ESM)

```js
import { optimizeWorkflow, renderOptimizationReportMarkdown } from './orchestrator/agents/optimizer/index.js';

const report = optimizeWorkflow({
  workflowName: 'Weekly client reporting',
  text: `
1) Pull data from 3 systems
2) Clean up spreadsheet and fix formatting
3) Write summary email
4) Send to client and log in CRM
`
});

console.log(report.actionPlan.now);
console.log(renderOptimizationReportMarkdown(report));
```

## Exports

- `optimizeWorkflow(input, options?) -> report`
- `renderOptimizationReportMarkdown(report) -> string`
- `PROMPTS` (LLM prompt templates)
- `RUBRIC` (evaluation rubric)
- `SCHEMAS` (JSON Schemas for structured I/O)
- `DEFAULTS`

## Design notes

- Accepts either structured steps (`input.steps`) or freeform text (`input.text`).
- Uses heuristic scoring to identify bottlenecks and estimate ROI.
- Intended as a *specialist module*: an Orchestrator can run this locally, or use the included prompt templates to ask an LLM for a richer version.
