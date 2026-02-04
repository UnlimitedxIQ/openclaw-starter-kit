import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = path.resolve(process.cwd(), 'orchestrator');
const QDIR = path.join(ROOT, 'queue');
const INBOX = path.join(QDIR, 'inbox.jsonl');
const DONE = path.join(QDIR, 'done.jsonl');
const FAILED = path.join(QDIR, 'failed.jsonl');
const PROCESSING_DIR = path.join(QDIR, 'processing');

function nowIso() { return new Date().toISOString(); }

function ensureDirs() {
  fs.mkdirSync(PROCESSING_DIR, { recursive: true });
  // NOTE: OpenClaw's read tool can mis-classify truly empty files as binary.
  // Keep JSONL files at least one newline so they always read as text.
  if (!fs.existsSync(INBOX)) fs.writeFileSync(INBOX, '\n');
  if (!fs.existsSync(DONE)) fs.writeFileSync(DONE, '\n');
  if (!fs.existsSync(FAILED)) fs.writeFileSync(FAILED, '\n');
}

function readJsonl(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return raw.split(/\r?\n/).filter(Boolean).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

function appendJsonl(file, obj) {
  fs.appendFileSync(file, JSON.stringify(obj) + '\n');
}

function claimTask(task) {
  const claimPath = path.join(PROCESSING_DIR, `${task.id}.json`);
  if (fs.existsSync(claimPath)) return null;
  fs.writeFileSync(claimPath, JSON.stringify(task, null, 2));
  return claimPath;
}

async function handleTask(task) {
  // Placeholder: the real execution is performed by Noble/OpenClaw via tool calls.
  // This runner only enforces policy + routing and produces a structured result.

  const result = {
    id: crypto.randomUUID(),
    taskId: task.id,
    createdAt: nowIso(),
    status: 'done',
    summary: `Queued for ${task.routing?.agent || 'manager'}: ${task.request?.type || 'task'}`,
    artifacts: [],
    nextActions: [
      'Run the appropriate OpenClaw agent turn to execute this task.',
    ],
  };

  appendJsonl(DONE, result);
  // Remove claim file on success.
  try { fs.unlinkSync(path.join(PROCESSING_DIR, `${task.id}.json`)); } catch {}
}

async function main() {
  ensureDirs();
  const tasks = readJsonl(INBOX);

  for (const task of tasks) {
    if (!task?.id) continue;
    const claim = claimTask(task);
    if (!claim) continue;

    try {
      await handleTask(task);
    } catch (e) {
      appendJsonl(FAILED, {
        id: crypto.randomUUID(),
        taskId: task.id,
        createdAt: nowIso(),
        status: 'failed',
        summary: String(e?.message || e),
        artifacts: [],
        nextActions: [],
      });
      try { fs.unlinkSync(claim); } catch {}
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
