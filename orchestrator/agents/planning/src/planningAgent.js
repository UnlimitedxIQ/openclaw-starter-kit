'use strict';

const path = require('path');
const crypto = require('crypto');

const { chatCompletionsJson } = require('./openaiClient');
const { validatePlanShape } = require('./planSchema');
const { renderPlanMarkdown } = require('./markdown');
const { savePlan, slugify } = require('./storage');
const fs = require('fs');

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function isoDateTime(d) {
  return d.toISOString();
}

/**
 * @param {string} goal
 */
function makeTitle(goal) {
  const g = (goal || '').trim().replace(/\s+/g, ' ');
  if (!g) return 'Plan';
  // Keep it short-ish.
  return g.length > 72 ? g.slice(0, 69) + '…' : g;
}

/**
 * @param {string} goal
 */
function makePlanId(goal) {
  const ts = new Date();
  const stamp = ts.toISOString().replace(/[-:]/g, '').slice(0, 15); // YYYYMMDDTHHMMSS
  const short = stamp.replace('T', '-');
  const slug = slugify(goal);
  const rand = crypto.randomUUID().slice(0, 8);
  return `${short}-${slug}-${rand}`;
}

function readPrompt(planningAgentRoot, relPath) {
  const p = path.join(planningAgentRoot, 'prompts', relPath);
  return fs.readFileSync(p, 'utf8');
}

/**
 * @param {string|undefined} constraints
 * @returns {string[]}
 */
function normalizeConstraints(constraints) {
  if (!constraints) return [];
  if (Array.isArray(constraints)) return constraints.map(String).map((s) => s.trim()).filter(Boolean);
  return String(constraints)
    .split(/\r?\n|\s*;\s*/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {any} context
 */
function normalizeContext(context) {
  if (!context) {
    return {
      now: '',
      resources: [],
      stakeholders: [],
      assumptions: [],
      nonGoals: [],
    };
  }
  if (typeof context === 'string') {
    return {
      now: context,
      resources: [],
      stakeholders: [],
      assumptions: [],
      nonGoals: [],
    };
  }
  return {
    now: String(context.now || context.summary || ''),
    resources: Array.isArray(context.resources) ? context.resources.map(String) : [],
    stakeholders: Array.isArray(context.stakeholders) ? context.stakeholders.map(String) : [],
    assumptions: Array.isArray(context.assumptions) ? context.assumptions.map(String) : [],
    nonGoals: Array.isArray(context.nonGoals) ? context.nonGoals.map(String) : [],
  };
}

function assignIdsAndLinkages(plan) {
  // Ensure plan.id/title/meta.
  if (!plan.id) plan.id = makePlanId(plan.goal);
  if (!plan.title) plan.title = makeTitle(plan.goal);
  plan.meta = plan.meta || {};
  if (!plan.meta.version) plan.meta.version = '1.0';

  const now = isoDateTime(new Date());
  if (!plan.meta.createdAt) plan.meta.createdAt = now;
  plan.meta.updatedAt = now;

  // Ensure milestones and tasks have IDs.
  const milestoneIds = new Set();
  (plan.milestones || []).forEach((m, idx) => {
    if (!m.id) m.id = `M${idx + 1}`;
    if (!m.taskIds) m.taskIds = [];
    if (!m.dependsOn) m.dependsOn = [];
    if (!Array.isArray(m.successCriteria)) m.successCriteria = [];
    milestoneIds.add(m.id);
  });

  const taskIds = new Set();
  (plan.tasks || []).forEach((t, idx) => {
    if (!t.id) t.id = `T${idx + 1}`;
    if (!t.status) t.status = 'todo';
    if (!t.priority) t.priority = 'med';
    if (typeof t.estimateHours !== 'number') t.estimateHours = 2;
    if (!Array.isArray(t.dependsOn)) t.dependsOn = [];
    if (!Array.isArray(t.deliverables)) t.deliverables = [];
    if (!t.milestoneId || !milestoneIds.has(t.milestoneId)) {
      t.milestoneId = plan.milestones?.[0]?.id || 'M1';
    }
    taskIds.add(t.id);
  });

  // Populate milestone.taskIds
  for (const m of plan.milestones || []) m.taskIds = [];
  for (const t of plan.tasks || []) {
    const m = (plan.milestones || []).find((x) => x.id === t.milestoneId);
    if (m) m.taskIds.push(t.id);
  }

  // Clean dependency references (drop unknown ids)
  for (const t of plan.tasks || []) {
    t.dependsOn = (t.dependsOn || []).filter((id) => taskIds.has(id));
  }
  for (const m of plan.milestones || []) {
    m.dependsOn = (m.dependsOn || []).filter((id) => milestoneIds.has(id));
  }

  if (!Array.isArray(plan.constraints)) plan.constraints = [];
  if (!Array.isArray(plan.risks)) plan.risks = [];
  if (!Array.isArray(plan.decisions)) plan.decisions = [];
  if (!Array.isArray(plan.nextActions)) plan.nextActions = [];

  return plan;
}

function generateAgenda(plan, opts) {
  const timezone = opts.timezone || plan.agenda?.timezone || 'America/Los_Angeles';
  const start = opts.startDate ? new Date(opts.startDate) : new Date();
  const days = opts.days ?? 14;
  const end = new Date(start);
  end.setDate(end.getDate() + (days - 1));

  const agenda = {
    timezone,
    startDate: isoDate(start),
    endDate: isoDate(end),
    weeks: [],
  };

  const todos = (plan.tasks || []).filter((t) => t.status !== 'done');
  // Sort by priority then dependencies length.
  const prioScore = { high: 0, med: 1, low: 2 };
  todos.sort((a, b) => (prioScore[a.priority] ?? 1) - (prioScore[b.priority] ?? 1) || (a.dependsOn?.length ?? 0) - (b.dependsOn?.length ?? 0));

  const blocksPerWeekday = [
    { start: '09:00', end: '11:30' },
    { start: '13:00', end: '15:30' },
    { start: '16:00', end: '17:00' },
  ];
  const weekendBlocks = [
    { start: '10:00', end: '11:00' },
  ];

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 Sun
    const diff = (day + 6) % 7; // Mon=0
    d.setDate(d.getDate() - diff);
    return isoDate(d);
  };

  const taskQueue = [...todos];
  const takeTaskIdsForBlock = (maxTasks) => {
    const ids = [];
    while (taskQueue.length && ids.length < maxTasks) {
      ids.push(taskQueue.shift().id);
    }
    return ids;
  };

  const byWeek = new Map();

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const date = isoDate(d);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const blocks = (isWeekend ? weekendBlocks : blocksPerWeekday).map((b, idx) => {
      const taskIds = takeTaskIdsForBlock(isWeekend ? 1 : (idx === 2 ? 1 : 2));
      return {
        start: b.start,
        end: b.end,
        title: taskIds.length ? 'Planned work' : 'Buffer / admin',
        taskIds,
      };
    });

    const dayAgenda = {
      date,
      focus: isWeekend ? 'Light work / review' : 'Execution',
      blocks,
    };

    const ws = getWeekStart(d);
    if (!byWeek.has(ws)) byWeek.set(ws, []);
    byWeek.get(ws).push(dayAgenda);
  }

  for (const [weekStart, daysArr] of [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    agenda.weeks.push({
      weekStart,
      theme: 'Progress toward milestones',
      days: daysArr,
    });
  }

  plan.agenda = agenda;
  return plan;
}

function heuristicPlan(input) {
  const id = makePlanId(input.goal);
  const title = makeTitle(input.goal);

  const milestones = [
    {
      id: 'M1',
      title: 'Clarify scope & success criteria',
      description: 'Turn the goal into a crisp definition of done and a constrained scope.',
      successCriteria: ['Success criteria documented', 'Scope boundaries agreed', 'Top risks identified'],
      targetDate: undefined,
      dependsOn: [],
      taskIds: [],
    },
    {
      id: 'M2',
      title: 'Execute the work',
      description: 'Complete the core tasks in dependency order, producing the primary deliverables.',
      successCriteria: ['Primary deliverables produced', 'Constraints satisfied'],
      targetDate: undefined,
      dependsOn: ['M1'],
      taskIds: [],
    },
    {
      id: 'M3',
      title: 'Review, polish, and ship',
      description: 'Quality pass, stakeholder review, and final delivery.',
      successCriteria: ['Review completed', 'Polish items addressed', 'Delivery confirmed'],
      targetDate: undefined,
      dependsOn: ['M2'],
      taskIds: [],
    },
  ];

  const tasks = [
    {
      id: 'T1',
      title: 'Define “done” + acceptance criteria',
      description: 'Write a short definition of done, measurable acceptance criteria, and non-goals.',
      milestoneId: 'M1',
      status: 'todo',
      priority: 'high',
      estimateHours: 1,
      dependsOn: [],
      deliverables: ['Definition of done', 'Acceptance criteria', 'Non-goals'],
    },
    {
      id: 'T2',
      title: 'Break down the work (WBS) + dependencies',
      description: 'Create tasks, estimates, owners, and dependencies.',
      milestoneId: 'M1',
      status: 'todo',
      priority: 'high',
      estimateHours: 2,
      dependsOn: ['T1'],
      deliverables: ['Task list with estimates', 'Dependency graph'],
    },
    {
      id: 'T3',
      title: 'Risk review + mitigation plan',
      description: 'List risks, impact/likelihood, and mitigations.',
      milestoneId: 'M1',
      status: 'todo',
      priority: 'med',
      estimateHours: 1,
      dependsOn: ['T1'],
      deliverables: ['Risk register + mitigations'],
    },
    {
      id: 'T4',
      title: 'Execute highest-priority tasks',
      description: 'Do the work in dependency order; produce the primary deliverables.',
      milestoneId: 'M2',
      status: 'todo',
      priority: 'high',
      estimateHours: 8,
      dependsOn: ['T2'],
      deliverables: ['Primary deliverables'],
    },
    {
      id: 'T5',
      title: 'QA / review / iterate',
      description: 'Validate against acceptance criteria; fix gaps.',
      milestoneId: 'M3',
      status: 'todo',
      priority: 'high',
      estimateHours: 4,
      dependsOn: ['T4'],
      deliverables: ['Reviewed deliverables', 'Change log'],
    },
    {
      id: 'T6',
      title: 'Ship + capture next steps',
      description: 'Deliver and note follow-ups / maintenance tasks.',
      milestoneId: 'M3',
      status: 'todo',
      priority: 'med',
      estimateHours: 1,
      dependsOn: ['T5'],
      deliverables: ['Delivery confirmation', 'Next steps list'],
    },
  ];

  const plan = {
    id,
    title,
    goal: input.goal,
    constraints: input.constraints,
    context: input.context,
    milestones,
    tasks,
    agenda: { timezone: input.timezone || 'America/Los_Angeles', startDate: '', endDate: '', weeks: [] },
    risks: [
      {
        risk: 'Unclear scope / shifting requirements',
        impact: 'High',
        likelihood: 'Medium',
        mitigation: 'Write acceptance criteria + non-goals early; get confirmation before execution.',
      },
    ],
    decisions: [],
    nextActions: ['Write acceptance criteria (T1)', 'Confirm constraints + stakeholders', 'Fill in task owners and due dates'],
    meta: { createdAt: isoDateTime(new Date()), updatedAt: isoDateTime(new Date()), version: '1.0' },
  };

  assignIdsAndLinkages(plan);
  generateAgenda(plan, { timezone: input.timezone, days: input.days, startDate: input.startDate });
  return plan;
}

/**
 * Generate a plan (LLM-first; heuristic fallback).
 *
 * @param {{
 *  goal: string,
 *  constraints?: string[]|string,
 *  context?: any,
 *  timezone?: string,
 *  startDate?: string,
 *  days?: number,
 *  useLLM?: boolean,
 *  model?: string,
 *  planningAgentRoot: string,
 * }} input
 */
async function generatePlan(input) {
  const norm = {
    goal: String(input.goal || '').trim(),
    constraints: normalizeConstraints(input.constraints),
    context: normalizeContext(input.context),
    timezone: input.timezone || 'America/Los_Angeles',
    startDate: input.startDate,
    days: input.days ?? 14,
  };
  if (!norm.goal) throw new Error('goal is required');

  const useLLM = input.useLLM !== false;

  if (!useLLM) {
    return heuristicPlan({ ...norm });
  }

  const systemTemplate = readPrompt(input.planningAgentRoot, 'plan.system.md');
  const systemPrompt = systemTemplate
    .replace('{{DAYS}}', String(norm.days))
    .replace('{{TIMEZONE}}', norm.timezone);
  const userTemplate = readPrompt(input.planningAgentRoot, 'plan.user.md');
  const userPrompt = userTemplate
    .replace('{{GOAL}}', norm.goal)
    .replace('{{CONSTRAINTS_JSON}}', JSON.stringify(norm.constraints, null, 2))
    .replace('{{CONTEXT_JSON}}', JSON.stringify(norm.context, null, 2))
    .replace('{{TIMEZONE}}', norm.timezone)
    .replace('{{DAYS}}', String(norm.days));

  const model = input.model || process.env.NOBLE_PLANNER_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  try {
    const plan = await chatCompletionsJson({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      timeoutMs: 60_000,
    });

    const v = validatePlanShape(plan);
    if (!v.ok) throw new Error(`Invalid plan shape: ${v.reason}`);

    plan.constraints = Array.isArray(plan.constraints) ? plan.constraints : norm.constraints;
    plan.context = plan.context ? plan.context : norm.context;

    assignIdsAndLinkages(plan);
    if (!plan.agenda?.weeks?.length) {
      generateAgenda(plan, { timezone: norm.timezone, startDate: norm.startDate, days: norm.days });
    }
    plan.meta.model = model;
    return plan;
  } catch (err) {
    // Fall back to deterministic output so orchestrator always gets something usable.
    const fallback = heuristicPlan({ ...norm });
    fallback.decisions.push({
      decision: 'Used heuristic planner (LLM unavailable or invalid output)',
      rationale: String(err?.message || err),
    });
    return fallback;
  }
}

/**
 * Generate + persist a plan to disk (JSON + Markdown).
 *
 * @param {{
 *  goal: string,
 *  constraints?: string[]|string,
 *  context?: any,
 *  timezone?: string,
 *  startDate?: string,
 *  days?: number,
 *  useLLM?: boolean,
 *  model?: string,
 *  planningAgentRoot: string,
 * }} input
 */
async function createPlan(input) {
  const plan = await generatePlan(input);
  const md = renderPlanMarkdown(plan);
  const paths = savePlan(plan, { planningAgentRoot: input.planningAgentRoot, markdown: md });
  return { plan, markdown: md, paths };
}

module.exports = {
  generatePlan,
  createPlan,
};
