import crypto from 'node:crypto';

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export function computePlanHash({ taskText, route, approvals }) {
  return `sha256:${sha256(JSON.stringify({ taskText, route, approvals }, null, 0))}`;
}

function needsExternalSideEffect(text) {
  const t = text.toLowerCase();
  const triggers = [
    'send',
    'text',
    'sms',
    'email',
    'dm',
    'message',
    'submit',
    'post',
    'publish',
    'buy',
    'purchase',
    'order',
    'pay',
    'delete',
    'remove',
    'cancel subscription'
  ];
  return triggers.some((w) => t.includes(w));
}

export function evaluateApprovalsNeeded(task, { cryptoUuid = crypto.randomUUID } = {}) {
  const taskText = task?.input?.text || '';

  const approvals = [];

  if (needsExternalSideEffect(taskText)) {
    approvals.push({
      approvalId: `appr_${cryptoUuid()}`,
      gate: 'EXTERNAL_SIDE_EFFECT',
      reason: 'Task likely requires an external side effect (send/submit/buy/delete).',
      request: {
        kind: 'plan.approve',
        preview: taskText
      },
      expiresAtMs: Date.now() + 60 * 60 * 1000
    });
  }

  return approvals;
}

export function approvalsSatisfied(task, approvals, planHash) {
  for (const a of approvals) {
    const granted = task.approvals?.granted?.[a.approvalId];
    if (!granted) return false;
    if (granted.planHash && granted.planHash !== planHash) return false;
  }
  return true;
}
