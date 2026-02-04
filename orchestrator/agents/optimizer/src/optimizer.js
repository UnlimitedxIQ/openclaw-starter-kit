import { PROMPTS } from './prompts.js';
import { RUBRIC } from './rubric.js';

export const DEFAULTS = Object.freeze({
  // Cost model defaults
  laborHourlyUSD: 75,           // value of the operator's time
  engineeringHourlyUSD: 120,    // cost to build automations
  cycleTimeHourlyValueUSD: 25,  // optional value of reducing waiting/latency (set to 0 if irrelevant)

  // Parsing / analysis defaults
  defaultOccurrencesPerMonth: 4,
  defaultDurationMinutes: 15,
  defaultWaitMinutes: 0,
  defaultFailureRate: 0.05,
  defaultPain: 3,
  maxBottlenecks: 5,
  maxRecommendations: 12,

  // Savings model
  automationTimeSavedPct: 0.7,
  processTimeSavedPct: 0.3,
  automationWaitReductionPct: 0.15,
  processWaitReductionPct: 0.5,

  // Prioritization
  minConfidence: 0.35
});

function nowIso() {
  return new Date().toISOString();
}

function clamp(n, min, max) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function safeString(x) {
  if (x === null || x === undefined) return '';
  return String(x);
}

function slugify(s) {
  return safeString(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'step';
}

function parseOccurrencesPerMonth(freq, fallback) {
  const f = safeString(freq).trim().toLowerCase();
  if (!f) return fallback;

  // Simple keywords
  if (/(per\s+day|daily)/.test(f)) return 20;
  if (/(per\s+week|weekly)/.test(f)) return 4;
  if (/(per\s+month|monthly)/.test(f)) return 1;
  if (/(per\s+quarter|quarterly)/.test(f)) return 0.33;
  if (/(per\s+year|yearly|annually)/.test(f)) return 0.08;

  // Patterns like "3/day", "2 per week", "10x/month"
  let m = f.match(/(\d+(?:\.\d+)?)\s*(?:x|times)?\s*\/\s*(day|week|month|quarter|year)/);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2];
    if (unit === 'day') return n * 20;
    if (unit === 'week') return n * 4;
    if (unit === 'month') return n;
    if (unit === 'quarter') return n / 3;
    if (unit === 'year') return n / 12;
  }

  m = f.match(/(\d+(?:\.\d+)?)\s*(?:x|times)?\s*(?:per)\s*(day|week|month|quarter|year)/);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2];
    if (unit === 'day') return n * 20;
    if (unit === 'week') return n * 4;
    if (unit === 'month') return n;
    if (unit === 'quarter') return n / 3;
    if (unit === 'year') return n / 12;
  }

  // Heuristic for "per customer" etc.
  if (/per\s+(customer|client|deal|project)/.test(f)) return 10;
  if (/per\s+(lead|signup)/.test(f)) return 50;
  if (/per\s+(ticket|incident|bug)/.test(f)) return 8;

  return fallback;
}

function guessDurationMinutes(stepText, fallback) {
  const t = safeString(stepText).toLowerCase();
  if (/meeting|sync|standup|call/.test(t)) return 30;
  if (/review|approve|sign\s*off/.test(t)) return 10;
  if (/email|message|slack|dm/.test(t)) return 5;
  if (/copy|paste|data\s*entry|enter\s+data|fill\s+out|spreadsheet|format/.test(t)) return 15;
  if (/debug|investigate|root\s*cause|incident/.test(t)) return 60;
  if (/build|deploy|release/.test(t)) return 45;
  return fallback;
}

function guessWaitMinutes(stepText, fallback) {
  const t = safeString(stepText).toLowerCase();
  if (/wait|waiting|pending|block(ed|ing)/.test(t)) return 240;
  if (/approval|approve|sign\s*off/.test(t)) return Math.max(120, fallback);
  if (/handoff|handover/.test(t)) return Math.max(60, fallback);
  return fallback;
}

function detectHandoffs(stepText) {
  const t = safeString(stepText).toLowerCase();
  let n = 0;
  if (/send\s+to|handoff|handover|assign\s+to|forward\s+to/.test(t)) n += 1;
  if (/wait\s+for|await/.test(t)) n += 1;
  return n;
}

function detectTags(stepText) {
  const t = safeString(stepText).toLowerCase();
  const tags = new Set();

  if (/copy|paste|data\s*entry|enter\s+data|spreadsheet|format|re-?type|manual/.test(t)) tags.add('manual_data');
  if (/approve|approval|sign\s*off|review/.test(t)) tags.add('approval');
  if (/meeting|call|sync|standup/.test(t)) tags.add('meeting');
  if (/report|dashboard|summary/.test(t)) tags.add('reporting');
  if (/ticket|incident|bug|support/.test(t)) tags.add('support');
  if (/wait|pending|blocked|await/.test(t)) tags.add('waiting');
  if (/crm|salesforce|hubspot/.test(t)) tags.add('crm');
  if (/email|gmail|outlook/.test(t)) tags.add('email');
  if (/slack|teams|discord/.test(t)) tags.add('chat');
  if (/export|import|csv/.test(t)) tags.add('csv');
  if (/rework|fix\s+errors|cleanup|clean\s+up/.test(t)) tags.add('rework');
  return Array.from(tags);
}

function normalizeInput(input) {
  if (typeof input === 'string') return { text: input };
  if (!input || typeof input !== 'object') return { text: safeString(input) };
  return { ...input };
}

function extractStepsFromText(text) {
  const raw = safeString(text);
  const lines = raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const bullet = [];
  for (const l of lines) {
    const m1 = l.match(/^[-*•]\s+(.*)$/);
    const m2 = l.match(/^\d+\s*[\.)-]\s*(.*)$/);
    if (m1) bullet.push(m1[1].trim());
    else if (m2) bullet.push(m2[1].trim());
  }

  if (bullet.length >= 2) return bullet;

  // Fallback: split on arrows/semicolons if it looks like a linear plan.
  const arrowSplit = raw.split(/\s*(?:->|→|⇒)\s*/).map(s => s.trim()).filter(Boolean);
  if (arrowSplit.length >= 2) return arrowSplit;

  const semiSplit = raw.split(/\s*;\s*/).map(s => s.trim()).filter(Boolean);
  if (semiSplit.length >= 3) return semiSplit;

  // Last resort: treat each non-empty line as a step.
  if (lines.length >= 2) return lines;

  return raw ? [raw.trim()] : [];
}

function buildStepObjects(input, cfg) {
  if (Array.isArray(input.steps) && input.steps.length) {
    return input.steps.map((s, idx) => {
      const name = safeString(s.name || s.title || `Step ${idx + 1}`);
      const description = safeString(s.description || '');
      const stepText = `${name} ${description}`.trim();
      return {
        id: safeString(s.id) || `${slugify(name)}-${idx + 1}`,
        name,
        description,
        actor: safeString(s.actor || ''),
        tool: safeString(s.tool || ''),
        frequency: safeString(s.frequency || ''),
        occurrencesPerMonth: parseOccurrencesPerMonth(s.frequency, cfg.defaultOccurrencesPerMonth),
        durationMinutes: Number.isFinite(s.durationMinutes)
          ? s.durationMinutes
          : guessDurationMinutes(stepText, cfg.defaultDurationMinutes),
        waitMinutes: Number.isFinite(s.waitMinutes)
          ? s.waitMinutes
          : guessWaitMinutes(stepText, cfg.defaultWaitMinutes),
        failureRate: Number.isFinite(s.failureRate)
          ? clamp(s.failureRate, 0, 1)
          : cfg.defaultFailureRate,
        pain: Number.isFinite(s.pain) ? clamp(s.pain, 1, 5) : cfg.defaultPain,
        handoffs: Number.isFinite(s.handoffs) ? Math.max(0, s.handoffs) : detectHandoffs(stepText),
        tags: Array.isArray(s.tags) ? s.tags : detectTags(stepText),
        raw: s
      };
    });
  }

  const steps = extractStepsFromText(input.text || '');
  return steps.map((line, idx) => {
    const name = line;
    const stepText = name;
    return {
      id: `${slugify(name)}-${idx + 1}`,
      name,
      description: '',
      actor: '',
      tool: '',
      frequency: '',
      occurrencesPerMonth: cfg.defaultOccurrencesPerMonth,
      durationMinutes: guessDurationMinutes(stepText, cfg.defaultDurationMinutes),
      waitMinutes: guessWaitMinutes(stepText, cfg.defaultWaitMinutes),
      failureRate: cfg.defaultFailureRate,
      pain: cfg.defaultPain,
      handoffs: detectHandoffs(stepText),
      tags: detectTags(stepText),
      raw: { line }
    };
  });
}

function bottleneckScore(step) {
  const active = (step.durationMinutes || 0) * (step.occurrencesPerMonth || 0);
  const wait = (step.waitMinutes || 0) * (step.occurrencesPerMonth || 0);
  const rework = (step.failureRate || 0) * active;
  const handoff = (step.handoffs || 0) * (step.occurrencesPerMonth || 0) * 10;
  const painMult = 0.8 + 0.1 * (step.pain || 3); // 1.1–1.3 range roughly

  // Score is in "minutes-equivalent".
  return (active + 0.35 * wait + 2 * rework + handoff) * painMult;
}

function explainBottleneck(step) {
  const reasons = [];
  if (step.durationMinutes * step.occurrencesPerMonth >= 120) reasons.push('High active time spent each month');
  if (step.waitMinutes * step.occurrencesPerMonth >= 240) reasons.push('Significant waiting/latency in the process');
  if (step.handoffs >= 1) reasons.push('Handoffs add coordination overhead and increase error risk');
  if (step.failureRate >= 0.1 || step.tags.includes('rework')) reasons.push('Rework/errors likely consume additional time');
  if (step.tags.includes('manual_data')) reasons.push('Manual work is automation-friendly');
  if (!reasons.length) reasons.push('Contributes materially to throughput/cycle time');
  return reasons.join('; ');
}

function identifyBottlenecks(steps, cfg) {
  const scored = steps.map(s => ({
    step: s,
    score: bottleneckScore(s),
    activeMinutesPerMonth: (s.durationMinutes || 0) * (s.occurrencesPerMonth || 0),
    waitMinutesPerMonth: (s.waitMinutes || 0) * (s.occurrencesPerMonth || 0)
  }));
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, cfg.maxBottlenecks).map((x, rank) => ({
    rank: rank + 1,
    stepId: x.step.id,
    stepName: x.step.name,
    score: Number(x.score.toFixed(1)),
    evidence: {
      occurrencesPerMonth: x.step.occurrencesPerMonth,
      durationMinutes: x.step.durationMinutes,
      waitMinutes: x.step.waitMinutes,
      activeMinutesPerMonth: Number(x.activeMinutesPerMonth.toFixed(1)),
      waitMinutesPerMonth: Number(x.waitMinutesPerMonth.toFixed(1)),
      failureRate: x.step.failureRate,
      handoffs: x.step.handoffs,
      tags: x.step.tags
    },
    whyItHurts: explainBottleneck(x.step)
  }));
}

function estimateEffortHours(type, tags) {
  // Conservative-ish heuristics.
  if (type === 'template') return 3;
  if (type === 'process') return 6;
  if (type === 'script') return tags.includes('csv') ? 10 : 14;
  if (type === 'integration') return 40;
  if (type === 'dashboard') return 24;
  if (type === 'test_automation') return 32;
  return 20;
}

function computeSavings(step, recType, waitReductionPct, cfg) {
  const occurrences = (step.occurrencesPerMonth || 0);

  const activeMinutesPerMonth = (step.durationMinutes || 0) * occurrences;
  const waitMinutesPerMonth = (step.waitMinutes || 0) * occurrences;

  const activeSavedPct = recType === 'process' ? cfg.processTimeSavedPct : cfg.automationTimeSavedPct;
  const defaultWaitPct = recType === 'process' ? cfg.processWaitReductionPct : cfg.automationWaitReductionPct;
  const waitSavedPct = Number.isFinite(waitReductionPct) ? clamp(waitReductionPct, 0, 1) : defaultWaitPct;

  const activeMinutesSaved = activeMinutesPerMonth * activeSavedPct;
  const waitMinutesReduced = waitMinutesPerMonth * waitSavedPct;

  return {
    activeMinutesPerMonth,
    waitMinutesPerMonth,
    activeMinutesSaved,
    waitMinutesReduced,
    waitReductionPctUsed: waitSavedPct,
    activeHoursSaved: activeMinutesSaved / 60,
    cycleTimeHoursReduced: waitMinutesReduced / 60
  };
}

function recommendationLibrary() {
  return [
    {
      id: 'templates',
      title: 'Standardize templates + checklists (reduce decision fatigue and rework)',
      type: 'template',
      when: (step) => step.pain >= 3 || step.tags.includes('rework') || step.tags.includes('email'),
      notes: 'Create reusable templates (emails, docs, spreadsheets) and a short checklist for completion criteria.',
      risks: ['May become stale if not owned/maintained'],
      confidence: 0.65,
      waitReductionPct: 0.05
    },
    {
      id: 'auto_data',
      title: 'Automate manual data movement (API/Zapier/Make/RPA) to eliminate copy/paste',
      type: 'integration',
      when: (step) => step.tags.includes('manual_data') || step.tags.includes('csv') || step.tags.includes('crm'),
      notes: 'Replace manual entry with integrations, CSV pipelines, or lightweight RPA where APIs are missing.',
      risks: ['Integration brittleness if upstream fields change', 'Access/permission constraints'],
      confidence: 0.55,
      waitReductionPct: 0.1
    },
    {
      id: 'scripts',
      title: 'Add a small script/automation to batch, validate, and pre-fill repetitive work',
      type: 'script',
      when: (step) => step.tags.includes('manual_data') || step.tags.includes('reporting'),
      notes: 'Use a script to pull data, validate schema, and generate outputs (CSV/report drafts).',
      risks: ['Needs basic engineering time and maintenance'],
      confidence: 0.6,
      waitReductionPct: 0.1
    },
    {
      id: 'approval_sla',
      title: 'Reduce approval latency with clear criteria + SLAs + auto-approval thresholds',
      type: 'process',
      when: (step) => step.tags.includes('approval') || step.tags.includes('waiting'),
      notes: 'Define what can be auto-approved, add a decision checklist, and set a response SLA; escalate when breached.',
      risks: ['Requires stakeholder buy-in'],
      confidence: 0.5,
      waitReductionPct: 0.6
    },
    {
      id: 'async_meetings',
      title: 'Replace recurring syncs with async updates + exception-based meetings',
      type: 'process',
      when: (step) => step.tags.includes('meeting'),
      notes: 'Collect updates via a short form or message template; only meet for exceptions/decisions.',
      risks: ['Team may resist change initially'],
      confidence: 0.45,
      waitReductionPct: 0.2
    },
    {
      id: 'dashboard',
      title: 'Create a single source-of-truth dashboard for status/reporting',
      type: 'dashboard',
      when: (step) => step.tags.includes('reporting') || step.tags.includes('waiting'),
      notes: 'Automate data refresh and expose status so fewer updates/handoffs are required.',
      risks: ['Data quality issues become visible; requires instrumentation'],
      confidence: 0.5,
      waitReductionPct: 0.3
    },
    {
      id: 'quality_gates',
      title: 'Add validation/quality gates to catch errors early (reduce rework)',
      type: 'script',
      when: (step) => step.tags.includes('rework') || step.failureRate >= 0.1,
      notes: 'Add schema checks, required fields, and automated validation before handoff.',
      risks: ['May initially slow throughput until tuned'],
      confidence: 0.55,
      waitReductionPct: 0.1
    }
  ];
}

function suggestPrereqs(type, step) {
  const prereqs = ['Baseline measurement: estimate current time spent per month'];
  if (type === 'integration') prereqs.push('Confirm APIs/permissions and data owners');
  if (type === 'dashboard') prereqs.push('Define source-of-truth metrics and update cadence');
  if (step.tags.includes('crm')) prereqs.push('Confirm CRM field schema and required fields');
  if (step.tags.includes('manual_data')) prereqs.push('List inputs/outputs and map fields (data dictionary)');
  return prereqs;
}

function proposeRecommendations(steps, bottlenecks, cfg) {
  const lib = recommendationLibrary();
  const byId = new Map();

  for (const b of bottlenecks) {
    const step = steps.find(s => s.id === b.stepId);
    if (!step) continue;

    for (const item of lib) {
      if (!item.when(step)) continue;

      const effortHours = estimateEffortHours(item.type, step.tags);
      const savings = computeSavings(step, item.type, item.waitReductionPct, cfg);

      // Cost and value
      const buildCostUSD = effortHours * cfg.engineeringHourlyUSD;

      const laborSavingsUSDPerMonth = savings.activeHoursSaved * cfg.laborHourlyUSD;
      const cycleTimeValueUSDPerMonth = savings.cycleTimeHoursReduced * cfg.cycleTimeHourlyValueUSD;
      const totalValueUSDPerMonth = laborSavingsUSDPerMonth + cycleTimeValueUSDPerMonth;

      const paybackMonths = totalValueUSDPerMonth > 0 ? (buildCostUSD / totalValueUSDPerMonth) : null;

      const confidence = clamp(item.confidence, cfg.minConfidence, 0.85);

      // Priority score: (value * confidence) / effort
      const priorityScore = (totalValueUSDPerMonth * confidence) / Math.max(1, effortHours);

      const rec = {
        id: item.id,
        title: item.title,
        type: item.type,
        description: item.notes,
        targetSteps: [step.id],
        metrics: {
          activeHoursSavedPerMonth: Number(savings.activeHoursSaved.toFixed(2)),
          laborSavingsUSDPerMonth: Number(laborSavingsUSDPerMonth.toFixed(0)),
          cycleTimeHoursReducedPerMonth: Number(savings.cycleTimeHoursReduced.toFixed(2)),
          cycleTimeValueUSDPerMonth: Number(cycleTimeValueUSDPerMonth.toFixed(0)),
          totalValueUSDPerMonth: Number(totalValueUSDPerMonth.toFixed(0)),
          effortHours: Number(effortHours.toFixed(1)),
          buildCostUSD: Number(buildCostUSD.toFixed(0)),
          paybackMonths: paybackMonths === null ? null : Number(paybackMonths.toFixed(1)),
          waitReductionPct: Number(savings.waitReductionPctUsed.toFixed(2))
        },
        confidence: Number(confidence.toFixed(2)),
        priorityScore: Number(priorityScore.toFixed(2)),
        risks: item.risks,
        prerequisites: suggestPrereqs(item.type, step)
      };

      // Merge across steps
      const key = rec.id;
      if (!byId.has(key)) byId.set(key, rec);
      else {
        const existing = byId.get(key);
        existing.targetSteps = Array.from(new Set(existing.targetSteps.concat(rec.targetSteps)));

        // Keep highest value estimate (conservative: do not sum across steps to avoid double counting)
        existing.metrics.activeHoursSavedPerMonth = Number(Math.max(existing.metrics.activeHoursSavedPerMonth, rec.metrics.activeHoursSavedPerMonth).toFixed(2));
        existing.metrics.laborSavingsUSDPerMonth = Math.max(existing.metrics.laborSavingsUSDPerMonth, rec.metrics.laborSavingsUSDPerMonth);
        existing.metrics.cycleTimeHoursReducedPerMonth = Number(Math.max(existing.metrics.cycleTimeHoursReducedPerMonth, rec.metrics.cycleTimeHoursReducedPerMonth).toFixed(2));
        existing.metrics.cycleTimeValueUSDPerMonth = Math.max(existing.metrics.cycleTimeValueUSDPerMonth, rec.metrics.cycleTimeValueUSDPerMonth);
        existing.metrics.totalValueUSDPerMonth = Math.max(existing.metrics.totalValueUSDPerMonth, rec.metrics.totalValueUSDPerMonth);

        const tv = existing.metrics.totalValueUSDPerMonth;
        existing.metrics.paybackMonths = tv > 0 ? Number((existing.metrics.buildCostUSD / tv).toFixed(1)) : null;

        existing.priorityScore = Number(Math.max(existing.priorityScore, rec.priorityScore).toFixed(2));
      }
    }
  }

  const recs = Array.from(byId.values());
  recs.sort((a, b) => b.priorityScore - a.priorityScore);
  return recs.slice(0, cfg.maxRecommendations);
}

function buildActionPlan(recommendations) {
  const now = [];
  const next = [];
  const later = [];

  for (const r of recommendations) {
    const eff = r.metrics.effortHours;
    const payback = r.metrics.paybackMonths;

    const isQuick = eff <= 8;
    const isFastPayback = payback !== null && payback <= 2;

    if (isQuick || isFastPayback) now.push(r);
    else if (eff <= 40 || (payback !== null && payback <= 6)) next.push(r);
    else later.push(r);
  }

  return {
    now: now.map(pickActionFields),
    next: next.map(pickActionFields),
    later: later.map(pickActionFields),
    measurementPlan: [
      'Track cycle time (start → done) and active time per step for 1–2 weeks.',
      'Track rework rate / defects / back-and-forth counts.',
      'After rollout, compare saved hours and error rates vs baseline.'
    ]
  };
}

function pickActionFields(r) {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    targetSteps: r.targetSteps,
    effortHours: r.metrics.effortHours,
    totalValueUSDPerMonth: r.metrics.totalValueUSDPerMonth,
    laborSavingsUSDPerMonth: r.metrics.laborSavingsUSDPerMonth,
    cycleTimeValueUSDPerMonth: r.metrics.cycleTimeValueUSDPerMonth,
    cycleTimeHoursReducedPerMonth: r.metrics.cycleTimeHoursReducedPerMonth,
    paybackMonths: r.metrics.paybackMonths,
    confidence: r.confidence,
    prerequisites: r.prerequisites
  };
}

export function optimizeWorkflow(input, options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  const normalized = normalizeInput(input);
  const steps = buildStepObjects(normalized, cfg);

  const workflowName = safeString(normalized.workflowName || normalized.name || 'Workflow');
  const goal = safeString(normalized.goal || '');

  const bottlenecks = identifyBottlenecks(steps, cfg);
  const recommendations = proposeRecommendations(steps, bottlenecks, cfg);
  const actionPlan = buildActionPlan(recommendations);

  const assumptions = {
    laborHourlyUSD: cfg.laborHourlyUSD,
    engineeringHourlyUSD: cfg.engineeringHourlyUSD,
    cycleTimeHourlyValueUSD: cfg.cycleTimeHourlyValueUSD,
    defaultOccurrencesPerMonth: cfg.defaultOccurrencesPerMonth,
    notes: [
      'Estimates are heuristic; validate time spent and frequency before building large automations.',
      'totalValueUSDPerMonth = laborSavingsUSDPerMonth + cycleTimeValueUSDPerMonth.',
      'cycleTimeValueUSDPerMonth uses cycleTimeHourlyValueUSD as a generic proxy for the business value of reduced latency; set to 0 if cycle time has no monetary value.'
    ]
  };

  return {
    meta: {
      agent: 'optimizer',
      version: '1.0.0',
      generatedAt: nowIso()
    },
    inputSummary: {
      workflowName,
      goal,
      providedStructuredSteps: Array.isArray(normalized.steps) && normalized.steps.length > 0,
      stepCount: steps.length
    },
    workflow: {
      workflowName,
      goal,
      steps
    },
    bottlenecks,
    recommendations,
    actionPlan,
    assumptions
  };
}

export function renderOptimizationReportMarkdown(report) {
  const r = report || {};
  const lines = [];

  lines.push(`# Optimization Report: ${safeString(r?.workflow?.workflowName || 'Workflow')}`);
  if (r?.workflow?.goal) lines.push(`**Goal:** ${safeString(r.workflow.goal)}`);
  lines.push('');

  lines.push('## Top bottlenecks');
  for (const b of (r.bottlenecks || [])) {
    lines.push(`- **#${b.rank}** ${b.stepName} — score ${b.score}`);
    lines.push(`  - Why: ${b.whyItHurts}`);
    lines.push(`  - Evidence: ${b.evidence.activeMinutesPerMonth} active min/mo, ${b.evidence.waitMinutesPerMonth} wait min/mo, ${b.evidence.occurrencesPerMonth}×/mo`);
  }
  lines.push('');

  lines.push('## Recommendations (prioritized)');
  for (const rec of (r.recommendations || [])) {
    const m = rec.metrics || {};
    lines.push(`- **${rec.title}** (${rec.type})`);
    lines.push(`  - Targets: ${(rec.targetSteps || []).join(', ')}`);
    lines.push(`  - Effort: ~${m.effortHours}h; Value: ~$${m.totalValueUSDPerMonth}/mo (labor $${m.laborSavingsUSDPerMonth}/mo + cycle-time $${m.cycleTimeValueUSDPerMonth}/mo); Payback: ${m.paybackMonths === null ? 'n/a' : `${m.paybackMonths} mo`}; Confidence: ${rec.confidence}`);
    lines.push(`  - Notes: ${rec.description}`);
  }
  lines.push('');

  lines.push('## Action plan');
  lines.push('**Now**');
  for (const a of (r.actionPlan?.now || [])) lines.push(`- ${a.title} (effort ~${a.effortHours}h; value ~$${a.totalValueUSDPerMonth}/mo; payback ${a.paybackMonths ?? 'n/a'} mo)`);
  lines.push('**Next**');
  for (const a of (r.actionPlan?.next || [])) lines.push(`- ${a.title} (effort ~${a.effortHours}h; value ~$${a.totalValueUSDPerMonth}/mo; payback ${a.paybackMonths ?? 'n/a'} mo)`);
  lines.push('**Later**');
  for (const a of (r.actionPlan?.later || [])) lines.push(`- ${a.title} (effort ~${a.effortHours}h; value ~$${a.totalValueUSDPerMonth}/mo; payback ${a.paybackMonths ?? 'n/a'} mo)`);

  return lines.join('\n');
}

// Convenience re-exports for orchestrators that want templates/rubrics colocated.
export { PROMPTS, RUBRIC };
