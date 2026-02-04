import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

function nowMs() {
  return Date.now();
}

export function makeOwnerId() {
  const host = process.env.COMPUTERNAME || process.env.HOSTNAME || 'host';
  return `${host}:${process.pid}`;
}

export function eventId() {
  // UUID is sufficient for v1; keep event ordering by tsMs.
  return crypto.randomUUID();
}

export async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err?.code === 'ENOENT') return null;
    throw err;
  }
}

export async function writeJsonAtomic(filePath, obj) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}.${crypto.randomUUID()}`;
  await fs.writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8');
  await fs.rename(tmp, filePath);
}

export function createStorage({ rootDir, eventsPath, snapshotPath, snapshotEveryEvents = 200 }) {
  const absEventsPath = path.isAbsolute(eventsPath) ? eventsPath : path.join(rootDir, eventsPath);
  const absSnapshotPath = path.isAbsolute(snapshotPath) ? snapshotPath : path.join(rootDir, snapshotPath);

  async function appendEvent({ type, taskId, actor, data }) {
    const evt = {
      v: 1,
      eventId: eventId(),
      tsMs: nowMs(),
      type,
      taskId,
      actor,
      data: data ?? {}
    };

    await fs.mkdir(path.dirname(absEventsPath), { recursive: true });
    await fs.appendFile(absEventsPath, JSON.stringify(evt) + '\n', 'utf8');

    // Best-effort snapshotting; ok to skip on error.
    try {
      const state = await loadState();
      if (state.meta.eventCount % snapshotEveryEvents === 0) {
        await writeJsonAtomic(absSnapshotPath, state);
      }
    } catch {
      // ignore
    }

    return evt;
  }

  async function readEvents() {
    try {
      const raw = await fs.readFile(absEventsPath, 'utf8');
      const lines = raw.split(/\r?\n/).filter(Boolean);
      const events = [];
      for (const line of lines) {
        try {
          events.push(JSON.parse(line));
        } catch {
          // ignore malformed line
        }
      }
      return events;
    } catch (err) {
      if (err?.code === 'ENOENT') return [];
      throw err;
    }
  }

  function reduce(events, { now = nowMs() } = {}) {
    const tasks = new Map();

    function getTask(taskId) {
      if (!tasks.has(taskId)) {
        tasks.set(taskId, {
          taskId,
          createdAtMs: null,
          channel: null,
          requester: null,
          input: null,
          priority: 50,
          meta: {},
          status: 'queued',
          route: null,
          claim: null,
          approvals: {
            requested: {},
            granted: {},
            denied: {}
          },
          subagents: [],
          result: null,
          error: null,
          lastEventTsMs: null
        });
      }
      return tasks.get(taskId);
    }

    for (const e of events) {
      if (!e?.taskId) continue;
      const t = getTask(e.taskId);
      t.lastEventTsMs = e.tsMs ?? t.lastEventTsMs;

      switch (e.type) {
        case 'task.created':
          t.createdAtMs = e.tsMs;
          t.channel = e.data?.channel ?? t.channel;
          t.requester = e.data?.requester ?? t.requester;
          t.input = e.data?.input ?? t.input;
          t.priority = e.data?.priority ?? t.priority;
          t.meta = e.data?.meta ?? t.meta;
          t.status = 'queued';
          break;

        case 'task.routed':
          t.route = e.data?.route ?? t.route;
          break;

        case 'task.claimed':
        case 'task.lease.renewed':
          t.claim = {
            ownerId: e.data?.ownerId,
            leaseUntilMs: e.data?.leaseUntilMs
          };
          break;

        case 'task.status.changed':
          t.status = e.data?.to ?? t.status;
          break;

        case 'approval.requested':
          if (e.data?.approvalId) t.approvals.requested[e.data.approvalId] = e.data;
          break;
        case 'approval.granted':
          if (e.data?.approvalId) t.approvals.granted[e.data.approvalId] = e.data;
          break;
        case 'approval.denied':
          if (e.data?.approvalId) t.approvals.denied[e.data.approvalId] = e.data;
          break;

        case 'subagent.spawned':
          t.subagents.push({
            role: e.data?.role,
            sessionId: e.data?.sessionId,
            label: e.data?.label,
            spawnedAtMs: e.tsMs
          });
          break;

        case 'task.completed':
          t.status = 'done';
          t.result = e.data ?? null;
          t.error = null;
          break;

        case 'task.failed':
          t.status = 'failed';
          t.error = e.data?.error ?? e.data ?? null;
          break;

        case 'task.canceled':
          t.status = 'canceled';
          break;

        default:
          break;
      }
    }

    // Normalize claims: expire leases.
    for (const t of tasks.values()) {
      if (t.claim?.leaseUntilMs && t.claim.leaseUntilMs <= now) {
        t.claim = null;
        if (t.status === 'running' || t.status === 'dispatching') {
          t.status = 'queued';
        }
      }
    }

    return {
      meta: {
        nowMs: now,
        eventCount: events.length
      },
      tasks: Object.fromEntries([...tasks.entries()])
    };
  }

  async function loadState() {
    const events = await readEvents();
    return reduce(events);
  }

  return {
    rootDir,
    absEventsPath,
    absSnapshotPath,
    appendEvent,
    readEvents,
    reduce,
    loadState
  };
}
