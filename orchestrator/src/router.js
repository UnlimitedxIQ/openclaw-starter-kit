export function chooseRoute(task, { defaultRoute = 'planner' } = {}) {
  const text = (task?.input?.text || '').toLowerCase();

  const hasAny = (...words) => words.some((w) => text.includes(w));

  if (hasAny('bug', 'stack trace', 'typescript', 'javascript', 'python', 'node', 'repo', 'github', 'compile', 'build')) {
    return { route: 'dev', reason: 'keyword: dev' };
  }
  if (hasAny('research', 'compare', 'find', 'look up', 'best', 'options', 'recommend')) {
    return { route: 'researcher', reason: 'keyword: research' };
  }
  if (hasAny('write', 'draft', 'rewrite', 'polish', 'email', 'reply', 'message')) {
    return { route: 'writer', reason: 'keyword: writing/comms' };
  }
  if (hasAny('restart', 'deploy', 'server', 'ngrok', 'docker', 'kubernetes', 'windows service')) {
    return { route: 'ops', reason: 'keyword: ops' };
  }

  return { route: defaultRoute, reason: 'default' };
}
