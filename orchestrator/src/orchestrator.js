import path from 'node:path';
import fs from 'node:fs/promises';

import { makeOwnerId } from './storage.js';
import { chooseRoute } from './router.js';
import { computePlanHash, evaluateApprovalsNeeded } from './approvals.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function taskListFromState(state) {
  return Object.values(state.tasks || {});
}

function requestedApprovalsSatisfied(task) {
  const requested = task?.approvals?.requested || {};
  const granted = task?.approvals?.granted || {};
  for (const [approvalId, req] of Object.entries(requested)) {
    const g = granted[approvalId];
    if (!g) return false;
    if (req?.planHash && g?.planHash && req.planHash !== g.planHash) return false;
  }
  return Object.keys(requested).length > 0;
}

export function createOrchestrator({ rootDir, config, storage, openclawProvider, reporter }) {
  const ownerId = makeOwnerId();
  const leaseMs = config.dispatcher?.leaseMs ?? 60000;
  const maxConcurrent = config.dispatcher?.maxConcurrentTasks ?? 2;

  async function ensureArtifactDir(taskId) {
    const dir = path.join(rootDir, 'artifacts', taskId);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  function isClaimedByOther(task) {
    if (!task?.claim) return false;
    if (task.claim.ownerId === ownerId) return false;
    return true;
  }

  async function claim(taskId) {
    await storage.appendEvent({
      type: 'task.claimed',
      taskId,
      actor: { kind: 'orchestrator', id: ownerId },
      data: {
        ownerId,
        leaseUntilMs: Date.now() + leaseMs
      }
    });
  }

  async function setStatus(taskId, from, to, reason) {
    await storage.appendEvent({
      type: 'task.status.changed',
      taskId,
      actor: { kind: 'orchestrator', id: ownerId },
      data: { from, to, reason }
    });
  }

  async function maybeRoute(task) {
    if (task.route) return task;
    const { route, reason } = chooseRoute(task, { defaultRoute: config.routing?.defaultRoute || 'planner' });
    await storage.appendEvent({
      type: 'task.routed',
      taskId: task.taskId,
      actor: { kind: 'orchestrator', id: ownerId },
      data: { route, reason }
    });
    return { ...task, route };
  }

  async function requestApprovals(task, approvals, planHash) {
    for (const a of approvals) {
      await storage.appendEvent({
        type: 'approval.requested',
        taskId: task.taskId,
        actor: { kind: 'orchestrator', id: ownerId },
        data: {
          ...a,
          planHash
        }
      });
      await reporter?.approvalRequested?.(task, a);
    }
  }

  async function dispatchToSubagent(task) {
    await ensureArtifactDir(task.taskId);

    const label = `orchestrator:task:${task.taskId}:${task.route}`;
    const { sessionId } = await openclawProvider.spawnSession({
      label,
      role: task.route,
      taskId: task.taskId
    });

    await storage.appendEvent({
      type: 'subagent.spawned',
      taskId: task.taskId,
      actor: { kind: 'orchestrator', id: ownerId },
      data: { role: task.route, sessionId, label }
    });

    const resultFile = `orchestrator/artifacts/${task.taskId}/${task.route}.md`;

    const message = [
      `You are a specialist sub-agent (role=${task.route}).`,
      `TaskId: ${task.taskId}`,
      '',
      'Request:',
      task.input?.text || '',
      '',
      'Output contract:',
      `1) Write your deliverable to: ${resultFile}`,
      '2) Reply with a short summary and a final line exactly:',
      `   RESULT_FILE: ${resultFile}`
    ].join('\n');

    await openclawProvider.sendMessage({ sessionId, message });

    await storage.appendEvent({
      type: 'subagent.message.sent',
      taskId: task.taskId,
      actor: { kind: 'orchestrator', id: ownerId },
      data: { role: task.route, sessionId, message }
    });

    await setStatus(task.taskId, task.status, 'waiting_subagent', 'spawned sub-agent session');
  }

  async function processOne(task) {
    // Refresh state for the task after each important write.
    // (Simple but robust; v2 can optimize.)

    if (isClaimedByOther(task)) return;

    const claimOk = !task.claim || task.claim.ownerId === ownerId;
    if (!claimOk) return;

    // Eligible statuses
    const eligible = task.status === 'queued' || task.status === 'waiting_approval';
    if (!eligible) return;

    await claim(task.taskId);

    const state1 = await storage.loadState();
    let t = state1.tasks[task.taskId];

    t = await maybeRoute(t);

    // Determine approvals required.
    // v1: heuristic gate, v2: planner-produced structured plan.
    const approvals = evaluateApprovalsNeeded(t);
    const planHash = computePlanHash({ taskText: t.input?.text || '', route: t.route, approvals });

    const alreadyRequested = Object.keys(t.approvals?.requested || {}).length > 0;

    if (approvals.length > 0 && !alreadyRequested) {
      await setStatus(t.taskId, t.status, 'waiting_approval', 'approval required');
      await requestApprovals(t, approvals, planHash);
      return;
    }

    // If approvals were previously requested, do not dispatch until they are granted.
    if (approvals.length > 0 && alreadyRequested && !requestedApprovalsSatisfied(t)) {
      if (t.status !== 'waiting_approval') {
        await setStatus(t.taskId, t.status, 'waiting_approval', 'waiting for requested approvals');
      }
      return;
    }

    if (t.status === 'waiting_approval') {
      if (!requestedApprovalsSatisfied(t)) {
        return; // still waiting
      }
      await setStatus(t.taskId, t.status, 'queued', 'approvals satisfied');
      // fallthrough next tick
      return;
    }

    await setStatus(t.taskId, t.status, 'dispatching', 'dispatching to sub-agent');

    const state2 = await storage.loadState();
    t = state2.tasks[t.taskId];

    await dispatchToSubagent(t);
  }

  async function tickOnce() {
    const state = await storage.loadState();
    const tasks = taskListFromState(state)
      .filter((t) => t.status === 'queued' || t.status === 'waiting_approval')
      .sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50));

    // Limit concurrency by counting non-terminal tasks claimed by us.
    const inFlight = taskListFromState(state).filter(
      (t) =>
        t.claim?.ownerId === ownerId &&
        !['done', 'failed', 'canceled'].includes(t.status)
    );

    const slots = Math.max(0, maxConcurrent - inFlight.length);
    if (slots <= 0) return;

    const candidates = tasks.filter((t) => !t.claim).slice(0, slots);

    for (const t of candidates) {
      try {
        await processOne(t);
      } catch (err) {
        await storage.appendEvent({
          type: 'task.failed',
          taskId: t.taskId,
          actor: { kind: 'orchestrator', id: ownerId },
          data: { error: { message: err?.message || String(err), stack: err?.stack } }
        });
        await reporter?.taskFailed?.(t, err);
      }
    }
  }

  async function runForever({ pollIntervalMs = 1000 } = {}) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await tickOnce();
      await sleep(pollIntervalMs);
    }
  }

  return {
    ownerId,
    tickOnce,
    runForever
  };
}
