#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { parseArgs } from 'node:util';

import { createStorage } from './storage.js';
import { createOpenClawProvider } from './openclaw.js';
import { createReporter } from './reporter.js';
import { createOrchestrator } from './orchestrator.js';
import { startHttpIngress } from './ingress/http.js';

async function loadConfig(rootDir, configPath) {
  const abs = path.isAbsolute(configPath) ? configPath : path.join(rootDir, configPath);
  const raw = await fs.readFile(abs, 'utf8');
  return JSON.parse(raw);
}

function print(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}

async function main() {
  const rootDir = process.cwd();

  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      config: { type: 'string', default: 'config/default.json' },

      // enqueue
      channel: { type: 'string' },
      text: { type: 'string' },
      requesterId: { type: 'string' },
      requesterDisplay: { type: 'string' },
      priority: { type: 'string' },

      // approve/complete
      taskId: { type: 'string' },
      approvalId: { type: 'string' },
      decision: { type: 'string' },
      planHash: { type: 'string' },
      summary: { type: 'string' },
      resultFile: { type: 'string' }
    }
  });

  const cmd = positionals[0] || 'run';
  const config = await loadConfig(rootDir, values.config);

  const storage = createStorage({
    rootDir,
    eventsPath: config.storage?.eventsPath || 'state/events.jsonl',
    snapshotPath: config.storage?.snapshotPath || 'state/snapshot.json',
    snapshotEveryEvents: config.storage?.snapshotEveryEvents ?? 200
  });

  if (cmd === 'enqueue') {
    const channel = values.channel || 'cli';
    const text = values.text || '';
    const priority = values.priority ? Number(values.priority) : 50;

    const evt = await storage.appendEvent({
      type: 'task.created',
      taskId: crypto.randomUUID(),
      actor: { kind: 'ingress', id: values.requesterId || 'cli' },
      data: {
        channel,
        requester: {
          id: values.requesterId || 'cli',
          display: values.requesterDisplay || 'cli'
        },
        input: { text },
        priority,
        meta: {}
      }
    });

    print({ ok: true, taskId: evt.taskId, eventId: evt.eventId });
    return;
  }

  if (cmd === 'status') {
    const state = await storage.loadState();
    const tasks = Object.values(state.tasks || {});
    const counts = tasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});
    print({ ok: true, counts, nowMs: state.meta.nowMs });
    return;
  }

  if (cmd === 'approve') {
    const taskId = values.taskId;
    const approvalId = values.approvalId;
    const decision = values.decision;
    if (!taskId || !approvalId || !decision) {
      throw new Error('approve requires --taskId, --approvalId, --decision grant|deny');
    }

    const type = decision === 'grant' ? 'approval.granted' : 'approval.denied';
    const evt = await storage.appendEvent({
      type,
      taskId,
      actor: { kind: 'human', id: 'cli' },
      data: { approvalId, planHash: values.planHash, by: 'cli' }
    });
    print({ ok: true, eventId: evt.eventId });
    return;
  }

  if (cmd === 'complete') {
    const taskId = values.taskId;
    if (!taskId) throw new Error('complete requires --taskId');
    const evt = await storage.appendEvent({
      type: 'task.completed',
      taskId,
      actor: { kind: 'subagent', id: 'cli' },
      data: { summary: values.summary || 'completed', resultFile: values.resultFile }
    });
    print({ ok: true, eventId: evt.eventId });
    return;
  }

  if (cmd === 'run') {
    const openclawProvider = createOpenClawProvider(config.openclaw || {});
    const reporter = createReporter();
    const orchestrator = createOrchestrator({ rootDir, config, storage, openclawProvider, reporter });

    startHttpIngress({ config, storage });

    await orchestrator.runForever({ pollIntervalMs: config.dispatcher?.pollIntervalMs ?? 1000 });
    return;
  }

  throw new Error(`Unknown command '${cmd}'. Try: run|enqueue|status|approve|complete`);
}

/* crypto import moved to top */

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
