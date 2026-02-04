'use strict';

const { readJson } = require('./storage');
const { addDays, toIsoString, parseDateish } = require('./time');

function pickSequence(sequencesData, sequenceId) {
  const seqs = Array.isArray(sequencesData.sequences) ? sequencesData.sequences : [];
  return seqs.find((s) => s.id === sequenceId) || null;
}

async function loadSequences(filePath) {
  const data = await readJson(filePath, { version: 1, sequences: [] });
  if (!data || typeof data !== 'object') return { version: 1, sequences: [] };
  if (!Array.isArray(data.sequences)) data.sequences = [];
  return data;
}

function makeInstanceId() {
  return `seq_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function startSequenceInstance({ sequences, sequenceId, channel, goal, context, startDate }) {
  const seq = pickSequence(sequences, sequenceId);
  if (!seq) throw new Error(`Unknown sequenceId: ${sequenceId}`);

  const start = startDate instanceof Date ? startDate : new Date();
  const instanceChannel = channel || seq.defaultChannel || 'email';

  const steps = (seq.steps || []).map((s, idx) => {
    const offsetDays = typeof s.offsetDays === 'number' ? s.offsetDays : 0;
    const dueAt = addDays(start, offsetDays);
    return {
      stepIndex: idx,
      offsetDays,
      channel: s.channel || instanceChannel,
      dueAt: toIsoString(dueAt),
      sentAt: null,
    };
  });

  return {
    instanceId: makeInstanceId(),
    sequenceId,
    name: seq.name || sequenceId,
    goal: goal || '',
    context: context || '',
    channel: instanceChannel,
    startedAt: toIsoString(start),
    completedAt: null,
    paused: false,
    steps,
  };
}

function firstNameFromFullName(name) {
  const s = String(name || '').trim();
  if (!s) return '';
  return s.split(/\s+/)[0];
}

function renderTemplate(tpl, vars) {
  return String(tpl || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const v = vars[key];
    if (v === null || v === undefined) return '';
    return String(v);
  });
}

function findInstance(crm, instanceId) {
  const list = Array.isArray(crm.sequences) ? crm.sequences : [];
  return list.find((i) => i.instanceId === instanceId) || null;
}

function nextUnsentStep(instance) {
  if (!instance || !Array.isArray(instance.steps)) return null;
  return instance.steps.find((s) => !s.sentAt) || null;
}

function draftNextStep({ sequences, crm, instanceId, contact, vars }) {
  const instance = findInstance(crm, instanceId);
  if (!instance) return { ok: false, error: `Sequence instance not found: ${instanceId}` };
  if (instance.completedAt) return { ok: false, error: 'Sequence is already completed' };
  if (instance.paused) return { ok: false, error: 'Sequence is paused' };

  const seq = pickSequence(sequences, instance.sequenceId);
  if (!seq) return { ok: false, error: `Unknown sequenceId in instance: ${instance.sequenceId}` };

  const stepState = nextUnsentStep(instance);
  if (!stepState) return { ok: false, error: 'No remaining steps' };

  const step = (seq.steps || [])[stepState.stepIndex];
  if (!step) return { ok: false, error: `Missing template for step ${stepState.stepIndex}` };

  const mergedVars = {
    // contact
    id: contact.id || '',
    name: contact.name || '',
    firstName: firstNameFromFullName(contact.name || contact.id || ''),
    email: contact.email || '',
    phone: contact.phone || '',

    // sequence
    goal: instance.goal || '',
    context: instance.context || '',

    // common defaults
    senderName: process.env.NETWORKING_SENDER_NAME || 'Bryson',
    callLengthMinutes: 15,
    timeOption1: 'Tue 10am',
    timeOption2: 'Thu 2pm',

    // overrides
    ...(vars || {}),
  };

  const subject = renderTemplate(step.subjectTemplate || '', mergedVars).trim();
  const body = renderTemplate(step.bodyTemplate || '', mergedVars).trim();

  return {
    ok: true,
    instanceId,
    sequenceId: instance.sequenceId,
    stepIndex: stepState.stepIndex,
    channel: step.channel || stepState.channel || instance.channel || 'email',
    dueAt: stepState.dueAt,
    subject,
    body,
  };
}

function markStepSent({ sequences, crm, instanceId, stepIndex, sentAt }) {
  const instance = findInstance(crm, instanceId);
  if (!instance) return { ok: false, error: `Sequence instance not found: ${instanceId}` };

  const seq = pickSequence(sequences, instance.sequenceId);
  if (!seq) return { ok: false, error: `Unknown sequenceId in instance: ${instance.sequenceId}` };

  const step = instance.steps && instance.steps[stepIndex];
  if (!step) return { ok: false, error: `Invalid stepIndex: ${stepIndex}` };
  if (step.sentAt) return { ok: false, error: `Step ${stepIndex} already marked sent` };

  step.sentAt = sentAt;

  // If last step, mark completed.
  const anyRemaining = instance.steps.some((s) => !s.sentAt);
  if (!anyRemaining) instance.completedAt = sentAt;

  const next = nextUnsentStep(instance);
  const nextFollowUpAt = next ? next.dueAt : null;

  const tpl = (seq.steps || [])[stepIndex] || {};

  return {
    ok: true,
    sequenceId: instance.sequenceId,
    channel: tpl.channel || step.channel || instance.channel || 'email',
    nextFollowUpAt,
    touchpointSummary: `Sent ${seq.name || instance.sequenceId} (step ${stepIndex + 1}/${(seq.steps || []).length})`,
  };
}

function getDueFollowUps({ sequences, crm, contact, asOf, withinDays }) {
  const start = asOf instanceof Date ? asOf : new Date();
  const end = addDays(start, withinDays);

  const openLoopItems = [];
  const sequenceItems = [];

  // Open loops (manual follow-ups)
  for (const loop of Array.isArray(crm.openLoops) ? crm.openLoops : []) {
    if (loop.status && loop.status !== 'open') continue;
    const dueAt = parseDateish(loop.dueAt);
    if (!dueAt) continue;
    if (dueAt.getTime() > end.getTime()) continue;

    openLoopItems.push({
      kind: 'openLoop',
      contactId: contact.id,
      contactName: contact.name || contact.id,
      dueAt: toIsoString(dueAt),
      summary: loop.text || 'Follow up',
      meta: loop.meta || {},
    });
  }

  // Sequences: only surface the next unsent step per instance.
  for (const inst of Array.isArray(crm.sequences) ? crm.sequences : []) {
    if (inst.paused || inst.completedAt) continue;
    const next = nextUnsentStep(inst);
    if (!next) continue;
    const dueAt = parseDateish(next.dueAt);
    if (!dueAt) continue;
    if (dueAt.getTime() > end.getTime()) continue;

    const seq = pickSequence(sequences, inst.sequenceId);
    const stepTpl = seq && (seq.steps || [])[next.stepIndex];

    sequenceItems.push({
      kind: 'sequenceStep',
      contactId: contact.id,
      contactName: contact.name || contact.id,
      dueAt: toIsoString(dueAt),
      summary: `Sequence: ${(seq && seq.name) || inst.sequenceId} — step ${next.stepIndex + 1}`,
      meta: {
        instanceId: inst.instanceId,
        sequenceId: inst.sequenceId,
        stepIndex: next.stepIndex,
        channel: (stepTpl && stepTpl.channel) || next.channel || inst.channel || 'email',
      },
    });
  }

  // Deduplicate common case where a touchpoint created an open loop that matches the next sequence due date.
  const seqDueSet = new Set(sequenceItems.map((i) => i.dueAt));
  const filteredLoops = openLoopItems.filter((l) => {
    const src = l.meta && l.meta.source;
    const looksAuto = src === 'touchpoint' && /\bsent\b/i.test(l.summary || '');
    if (!looksAuto) return true;
    return !seqDueSet.has(l.dueAt);
  });

  return [...filteredLoops, ...sequenceItems];
}

module.exports = {
  loadSequences,
  startSequenceInstance,
  draftNextStep,
  markStepSent,
  getDueFollowUps,
};
