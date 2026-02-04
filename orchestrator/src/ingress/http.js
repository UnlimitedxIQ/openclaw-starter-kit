import http from 'node:http';
import crypto from 'node:crypto';

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body)
  });
  res.end(body);
}

async function readBodyJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return null;
  return JSON.parse(raw);
}

export function startHttpIngress({ config, storage }) {
  const host = config.http?.host ?? '127.0.0.1';
  const port = config.http?.port ?? 3879;

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const method = req.method || 'GET';

      if (method === 'GET' && url.pathname === '/v1/status') {
        const state = await storage.loadState();
        const tasks = Object.values(state.tasks || {});
        const counts = tasks.reduce((acc, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        }, {});
        return sendJson(res, 200, { ok: true, counts, nowMs: state.meta.nowMs });
      }

      const taskIdMatch = url.pathname.match(/^\/v1\/tasks\/([^/]+)$/);
      if (method === 'GET' && taskIdMatch) {
        const taskId = taskIdMatch[1];
        const state = await storage.loadState();
        const task = state.tasks?.[taskId];
        if (!task) return sendJson(res, 404, { ok: false, error: 'task not found' });
        return sendJson(res, 200, { ok: true, task });
      }

      if (method === 'POST' && url.pathname === '/v1/tasks/enqueue') {
        const body = await readBodyJson(req);
        const taskId = crypto.randomUUID();
        const text = body?.text ?? '';

        const evt = await storage.appendEvent({
          type: 'task.created',
          taskId,
          actor: { kind: 'ingress', id: body?.requester?.id || body?.channel || 'unknown' },
          data: {
            channel: body?.channel || 'http',
            requester: body?.requester || { id: 'unknown' },
            input: { text },
            priority: body?.priority ?? 50,
            meta: body?.meta || {}
          }
        });

        return sendJson(res, 200, { ok: true, taskId, eventId: evt.eventId });
      }

      const completeMatch = url.pathname.match(/^\/v1\/tasks\/([^/]+)\/complete$/);
      if (method === 'POST' && completeMatch) {
        const taskId = completeMatch[1];
        const body = await readBodyJson(req);
        const evt = await storage.appendEvent({
          type: 'task.completed',
          taskId,
          actor: { kind: 'subagent', id: body?.by || 'unknown' },
          data: body || {}
        });
        return sendJson(res, 200, { ok: true, eventId: evt.eventId });
      }

      const failMatch = url.pathname.match(/^\/v1\/tasks\/([^/]+)\/fail$/);
      if (method === 'POST' && failMatch) {
        const taskId = failMatch[1];
        const body = await readBodyJson(req);
        const evt = await storage.appendEvent({
          type: 'task.failed',
          taskId,
          actor: { kind: 'subagent', id: body?.by || 'unknown' },
          data: { error: body?.error || body || { message: 'failed' } }
        });
        return sendJson(res, 200, { ok: true, eventId: evt.eventId });
      }

      const approveMatch = url.pathname.match(/^\/v1\/tasks\/([^/]+)\/approve$/);
      if (method === 'POST' && approveMatch) {
        const taskId = approveMatch[1];
        const body = await readBodyJson(req);

        const decision = body?.decision;
        if (!['grant', 'deny'].includes(decision)) {
          return sendJson(res, 400, { ok: false, error: 'decision must be grant|deny' });
        }

        const approvalId = body?.approvalId;
        if (!approvalId) return sendJson(res, 400, { ok: false, error: 'approvalId required' });

        let planHash = body?.planHash;
        if (!planHash) {
          const state = await storage.loadState();
          const reqd = state.tasks?.[taskId]?.approvals?.requested?.[approvalId];
          planHash = reqd?.planHash;
        }

        const type = decision === 'grant' ? 'approval.granted' : 'approval.denied';
        const evt = await storage.appendEvent({
          type,
          taskId,
          actor: { kind: 'human', id: body?.by || 'unknown' },
          data: { approvalId, planHash, by: body?.by || 'unknown' }
        });

        return sendJson(res, 200, { ok: true, eventId: evt.eventId });
      }

      return sendJson(res, 404, { ok: false, error: 'not found' });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err?.message || String(err) });
    }
  });

  server.listen(port, host);
  console.log(`[ingress:http] listening on http://${host}:${port}`);

  return {
    host,
    port,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}
