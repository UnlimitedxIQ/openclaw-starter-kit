'use strict';

// Minimal CLI for quick manual runs.
// Usage:
//   node orchestrator/agents/networking/cli.js list "bryson"
//   node orchestrator/agents/networking/cli.js due
//   node orchestrator/agents/networking/cli.js note bryson "Met at X; follow up next week"
//   node orchestrator/agents/networking/cli.js prep bryson "Catch-up" "2026-02-10T10:00:00-08:00"

const { createNetworkingAgent } = require('./index');

async function main() {
  const agent = createNetworkingAgent();
  const [cmd, ...rest] = process.argv.slice(2);

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(`Networking Agent CLI\n\nCommands:\n  list <query>\n  get <id>\n  ensure <id>\n  note <id> <note...>\n  due\n  prep <id> <meetingTitle> [meetingDateIso]\n`);
    process.exit(0);
  }

  let res;
  if (cmd === 'list') {
    res = await agent.run('listContacts', { query: rest.join(' ') });
  } else if (cmd === 'get') {
    res = await agent.run('getContact', { id: rest[0] });
  } else if (cmd === 'ensure') {
    res = await agent.run('ensurePerson', { id: rest[0] });
  } else if (cmd === 'note') {
    const id = rest[0];
    const note = rest.slice(1).join(' ');
    res = await agent.run('addNote', { id, note });
  } else if (cmd === 'due') {
    res = await agent.run('getFollowUpsDue', {});
  } else if (cmd === 'prep') {
    const id = rest[0];
    const meetingTitle = rest[1] || 'Meeting';
    const meetingDate = rest[2] || null;
    res = await agent.run('meetingPrep', { id, meetingTitle, meetingDate });
  } else {
    res = { ok: false, error: `Unknown command: ${cmd}` };
  }

  console.log(JSON.stringify(res, null, 2));
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
