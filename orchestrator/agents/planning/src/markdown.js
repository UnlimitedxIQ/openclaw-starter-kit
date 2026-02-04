'use strict';

/**
 * @param {any} plan
 */
function renderPlanMarkdown(plan) {
  const lines = [];
  lines.push(`# ${plan.title || 'Plan'}`);
  lines.push('');
  if (plan.id) lines.push('**ID:** `' + plan.id + '`');
  if (plan.meta?.createdAt) lines.push(`**Created:** ${plan.meta.createdAt}`);
  if (plan.meta?.updatedAt) lines.push(`**Updated:** ${plan.meta.updatedAt}`);
  lines.push('');

  lines.push('## Goal');
  lines.push(plan.goal || '');
  lines.push('');

  lines.push('## Constraints');
  if (Array.isArray(plan.constraints) && plan.constraints.length) {
    for (const c of plan.constraints) lines.push(`- ${c}`);
  } else {
    lines.push('- (none)');
  }
  lines.push('');

  lines.push('## Context');
  const ctx = plan.context || {};
  if (ctx.now) {
    lines.push('**Now:**');
    lines.push(ctx.now);
    lines.push('');
  }
  const listSection = (title, arr) => {
    lines.push(`**${title}:**`);
    if (Array.isArray(arr) && arr.length) for (const x of arr) lines.push(`- ${x}`);
    else lines.push('- (none)');
    lines.push('');
  };
  listSection('Resources', ctx.resources);
  listSection('Stakeholders', ctx.stakeholders);
  listSection('Assumptions', ctx.assumptions);
  listSection('Non-goals', ctx.nonGoals);

  lines.push('## Milestones');
  if (Array.isArray(plan.milestones) && plan.milestones.length) {
    for (const m of plan.milestones) {
      lines.push('### ' + (m.title || '') + ' (`' + m.id + '`)');
      if (m.targetDate) lines.push(`- Target date: ${m.targetDate}`);
      if (m.dependsOn?.length) lines.push(`- Depends on: ${m.dependsOn.join(', ')}`);
      if (m.description) lines.push(`- ${m.description}`);
      if (Array.isArray(m.successCriteria) && m.successCriteria.length) {
        lines.push('- Success criteria:');
        for (const sc of m.successCriteria) lines.push(`  - ${sc}`);
      }
      if (Array.isArray(m.taskIds) && m.taskIds.length) {
        lines.push('- Tasks:');
        for (const tid of m.taskIds) lines.push(`  - ${tid}`);
      }
      lines.push('');
    }
  } else {
    lines.push('- (none)');
    lines.push('');
  }

  lines.push('## Tasks');
  if (Array.isArray(plan.tasks) && plan.tasks.length) {
    // A compact list; tables are nice but can get messy.
    for (const t of plan.tasks) {
      lines.push('- **' + (t.title || '') + '** (`' + t.id + '`)');
      const meta = [];
      if (t.milestoneId) meta.push(`milestone: ${t.milestoneId}`);
      if (t.priority) meta.push(`priority: ${t.priority}`);
      if (t.status) meta.push(`status: ${t.status}`);
      if (typeof t.estimateHours === 'number') meta.push(`est: ${t.estimateHours}h`);
      if (meta.length) lines.push(`  - _${meta.join(' · ')}_`);
      if (t.description) lines.push(`  - ${t.description}`);
      if (t.dependsOn?.length) lines.push(`  - depends on: ${t.dependsOn.join(', ')}`);
      if (t.deliverables?.length) {
        lines.push('  - deliverables:');
        for (const d of t.deliverables) lines.push(`    - ${d}`);
      }
    }
    lines.push('');
  } else {
    lines.push('- (none)');
    lines.push('');
  }

  lines.push('## Weekly / Daily Agenda');
  const ag = plan.agenda || {};
  if (ag.timezone) lines.push(`Timezone: **${ag.timezone}**`);
  if (ag.startDate && ag.endDate) lines.push(`Range: ${ag.startDate} → ${ag.endDate}`);
  lines.push('');

  if (Array.isArray(ag.weeks) && ag.weeks.length) {
    for (const w of ag.weeks) {
      lines.push(`### Week of ${w.weekStart}: ${w.theme || ''}`.trim());
      if (Array.isArray(w.days)) {
        for (const d of w.days) {
          lines.push(`- **${d.date}** — ${d.focus || ''}`.trim());
          if (Array.isArray(d.blocks) && d.blocks.length) {
            for (const b of d.blocks) {
              const tids = Array.isArray(b.taskIds) && b.taskIds.length ? ` [${b.taskIds.join(', ')}]` : '';
              lines.push(`  - ${b.start}-${b.end}: ${b.title}${tids}`);
            }
          }
        }
      }
      lines.push('');
    }
  } else {
    lines.push('- (agenda not generated)');
    lines.push('');
  }

  lines.push('## Risks');
  if (Array.isArray(plan.risks) && plan.risks.length) {
    for (const r of plan.risks) {
      lines.push(`- **${r.risk}** (impact: ${r.impact}, likelihood: ${r.likelihood})`);
      if (r.mitigation) lines.push(`  - mitigation: ${r.mitigation}`);
    }
  } else {
    lines.push('- (none)');
  }
  lines.push('');

  lines.push('## Decisions');
  if (Array.isArray(plan.decisions) && plan.decisions.length) {
    for (const d of plan.decisions) {
      lines.push(`- **${d.decision}**`);
      if (d.rationale) lines.push(`  - ${d.rationale}`);
    }
  } else {
    lines.push('- (none)');
  }
  lines.push('');

  lines.push('## Next actions (do these first)');
  if (Array.isArray(plan.nextActions) && plan.nextActions.length) {
    for (const a of plan.nextActions) lines.push(`- ${a}`);
  } else {
    lines.push('- (none)');
  }
  lines.push('');

  return lines.join('\n');
}

module.exports = {
  renderPlanMarkdown,
};
