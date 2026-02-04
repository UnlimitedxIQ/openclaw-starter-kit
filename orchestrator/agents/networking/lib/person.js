'use strict';

const path = require('path');
const fs = require('fs/promises');

const { ensureDir, fileExists, readJson, writeJsonAtomic, appendText } = require('./storage');
const { nowIso } = require('./time');
const { normalizeId } = require('./contacts');

function peopleRoot(contactsDir) {
  return path.join(contactsDir, 'people');
}

function personDir(contactsDir, id) {
  return path.join(peopleRoot(contactsDir), normalizeId(id));
}

function personMemoryPath(contactsDir, id) {
  return path.join(personDir(contactsDir, id), 'memory.md');
}

function personCrmPath(contactsDir, id) {
  return path.join(personDir(contactsDir, id), 'crm.json');
}

async function ensurePerson(contactsDir, id) {
  const pid = normalizeId(id);
  if (!pid) throw new Error('Invalid id');

  await ensureDir(personDir(contactsDir, pid));

  const memPath = personMemoryPath(contactsDir, pid);
  if (!(await fileExists(memPath))) {
    const header = `# ${pid}\n\nCreated: ${nowIso()}\n\n---\n`;
    await fs.writeFile(memPath, header, 'utf8');
  }

  const crmPath = personCrmPath(contactsDir, pid);
  if (!(await fileExists(crmPath))) {
    const crm = {
      version: 1,
      id: pid,
      createdAt: nowIso(),
      lastUpdated: nowIso(),
      relationship: {
        howMet: '',
        context: '',
      },
      pipelineStage: 'unknown',
      touchpoints: [],
      openLoops: [],
      notes: [],
      sequences: [],
    };
    await writeJsonAtomic(crmPath, crm);
  }
}

async function loadPersonCrm(contactsDir, id) {
  const pid = normalizeId(id);
  await ensurePerson(contactsDir, pid);
  const crm = await readJson(personCrmPath(contactsDir, pid), null);
  if (!crm) throw new Error('Failed to load CRM');
  // minimal normalization
  crm.touchpoints = Array.isArray(crm.touchpoints) ? crm.touchpoints : [];
  crm.openLoops = Array.isArray(crm.openLoops) ? crm.openLoops : [];
  crm.notes = Array.isArray(crm.notes) ? crm.notes : [];
  crm.sequences = Array.isArray(crm.sequences) ? crm.sequences : [];
  crm.lastUpdated = nowIso();
  return crm;
}

async function savePersonCrm(contactsDir, id, crm) {
  const pid = normalizeId(id);
  crm.version = 1;
  crm.id = pid;
  crm.lastUpdated = nowIso();
  await writeJsonAtomic(personCrmPath(contactsDir, pid), crm);
}

async function addNote(contactsDir, id, { note, kind = 'note', at = nowIso() }) {
  const pid = normalizeId(id);
  await ensurePerson(contactsDir, pid);

  const line = `\n## ${at} (${kind})\n\n${String(note).trim()}\n`;
  await appendText(personMemoryPath(contactsDir, pid), line);

  const crm = await loadPersonCrm(contactsDir, pid);
  crm.notes.unshift({ at, kind, note: String(note).trim() });
  // keep newest ~200 notes to prevent unbounded growth
  crm.notes = crm.notes.slice(0, 200);
  await savePersonCrm(contactsDir, pid, crm);
  return crm;
}

function makeLoopId() {
  return `loop_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

async function logTouchpoint(contactsDir, id, touchpoint) {
  const pid = normalizeId(id);
  await ensurePerson(contactsDir, pid);
  const crm = await loadPersonCrm(contactsDir, pid);

  const tp = {
    at: touchpoint.at || nowIso(),
    channel: touchpoint.channel || 'unknown',
    direction: touchpoint.direction || 'outbound',
    summary: touchpoint.summary || '',
    outcome: touchpoint.outcome || '',
    nextFollowUpAt: touchpoint.nextFollowUpAt || null,
    meta: touchpoint.meta || {},
  };

  crm.touchpoints.unshift(tp);
  crm.touchpoints = crm.touchpoints.slice(0, 300);

  crm.lastTouchAt = tp.at;

  if (tp.nextFollowUpAt) {
    crm.openLoops.unshift({
      id: makeLoopId(),
      createdAt: tp.at,
      dueAt: tp.nextFollowUpAt,
      status: 'open',
      text: `Follow up (${tp.channel}): ${tp.summary}`.trim(),
      meta: { source: 'touchpoint' },
    });
    crm.openLoops = crm.openLoops.slice(0, 200);
  }

  await savePersonCrm(contactsDir, pid, crm);
  return crm;
}

async function listAllPeopleIds(contactsDir) {
  const root = peopleRoot(contactsDir);
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (err) {
    if (err && err.code === 'ENOENT') return [];
    throw err;
  }
}

module.exports = {
  peopleRoot,
  personDir,
  personMemoryPath,
  personCrmPath,
  ensurePerson,
  loadPersonCrm,
  savePersonCrm,
  addNote,
  logTouchpoint,
  listAllPeopleIds,
};
