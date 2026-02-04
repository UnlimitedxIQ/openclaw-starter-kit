'use strict';

const path = require('path');
const fs = require('fs/promises');

const { ensureDir, readTextTail } = require('./storage');
const { toIsoString } = require('./time');
const { personDir, personMemoryPath } = require('./person');

function safeFilename(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 80) || 'meeting';
}

function formatTouchpoints(tps) {
  const items = (Array.isArray(tps) ? tps : []).slice(0, 8);
  if (!items.length) return '- (none recorded)';
  return items
    .map((tp) => {
      const at = tp.at || '';
      const chan = tp.channel || 'unknown';
      const dir = tp.direction || '';
      const sum = (tp.summary || '').trim();
      const out = sum ? sum : '(no summary)';
      return `- ${at} — ${chan} ${dir}: ${out}`;
    })
    .join('\n');
}

function formatOpenLoops(loops) {
  const open = (Array.isArray(loops) ? loops : []).filter((l) => (l.status || 'open') === 'open');
  if (!open.length) return '- (none)';
  return open
    .slice(0, 10)
    .map((l) => `- ${l.dueAt || ''}: ${(l.text || '').trim() || '(no text)'}`)
    .join('\n');
}

function formatSequences(seqs) {
  const active = (Array.isArray(seqs) ? seqs : []).filter((s) => !s.completedAt && !s.paused);
  if (!active.length) return '- (none active)';
  return active
    .slice(0, 10)
    .map((s) => {
      const next = (s.steps || []).find((st) => !st.sentAt);
      const nextStr = next ? `next step ${next.stepIndex + 1} due ${next.dueAt}` : 'no remaining steps';
      return `- ${s.name || s.sequenceId} (${s.instanceId}) — ${nextStr}`;
    })
    .join('\n');
}

async function generateMeetingPrep({ contactsDir, id, contact, crm, meetingTitle, meetingDate, goals, save }) {
  const memPath = personMemoryPath(contactsDir, id);
  const memoryTail = await readTextTail(memPath, 4000);

  const whenLine = meetingDate ? toIsoString(meetingDate) : '(unscheduled)';

  const md = `# Meeting prep: ${meetingTitle}\n\n- **Contact:** ${contact.name || contact.id || id}\n- **When:** ${whenLine}\n- **Generated:** ${new Date().toISOString()}\n\n## Quick facts\n- **Email:** ${contact.email || ''}\n- **Phone:** ${contact.phone || ''}\n- **Tags:** ${(contact.tags || []).join(', ')}\n- **Contact notes:** ${contact.notes || ''}\n\n## Relationship context (CRM)\n- How met: ${(crm.relationship && crm.relationship.howMet) || ''}\n- Context: ${(crm.relationship && crm.relationship.context) || ''}\n- Pipeline stage: ${crm.pipelineStage || 'unknown'}\n\n## Goals\n${(goals && goals.length) ? goals.map((g) => `- ${g}`).join('\n') : '- (add 1–3 goals)'}\n\n## Recent touchpoints\n${formatTouchpoints(crm.touchpoints)}\n\n## Open loops / follow-ups\n${formatOpenLoops(crm.openLoops)}\n\n## Active sequences\n${formatSequences(crm.sequences)}\n\n## Suggested agenda (30 min)\n- 2 min — quick personal catch-up\n- 5 min — context + what’s changed since last touch\n- 15 min — main discussion (your goal #1)\n- 5 min — next steps / owner + date\n- 3 min — wrap\n\n## Suggested questions\n- What’s your #1 priority right now?\n- Where are you feeling stuck / what’s most time-consuming?\n- If we could solve one thing in the next 30 days, what should it be?\n- Who else should we talk to?\n\n## Memory (recent excerpt)\n\n> (Tail of memory.md)\n\n\n\n${memoryTail.trim()}\n`;

  let savedPath = null;
  if (save) {
    const dir = path.join(personDir(contactsDir, id), 'meeting-prep');
    await ensureDir(dir);
    const datePrefix = meetingDate ? toIsoString(meetingDate).slice(0, 10) : new Date().toISOString().slice(0, 10);
    const filename = `${datePrefix}_${safeFilename(meetingTitle)}.md`;
    savedPath = path.join(dir, filename);
    await fs.writeFile(savedPath, md, 'utf8');
  }

  return { markdown: md, savedPath };
}

module.exports = {
  generateMeetingPrep,
};
