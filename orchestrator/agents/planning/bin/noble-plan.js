'use strict';

const fs = require('fs');
const path = require('path');

const planning = require('..');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      args._.push(a);
      continue;
    }
    const key = a.slice(2);
    if (key === 'no-llm') {
      args.useLLM = false;
      continue;
    }
    const val = argv[i + 1];
    i++;
    args[key] = val;
  }
  return args;
}

function usage() {
  console.log(`Noble Planning Agent CLI\n\n` +
`Usage:\n` +
`  node orchestrator/agents/planning/bin/noble-plan.js create --goal "..." [--constraints "..."] [--context "..."] [--days 14] [--timezone America/Los_Angeles] [--no-llm]\n` +
`  node orchestrator/agents/planning/bin/noble-plan.js list\n` +
`  node orchestrator/agents/planning/bin/noble-plan.js show --id <planId>\n`);
}

async function main() {
  const args = parseArgs(process.argv);
  const cmd = args._[0];

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    usage();
    process.exit(0);
  }

  if (cmd === 'list') {
    const plans = planning.listPlans();
    console.log(JSON.stringify(plans, null, 2));
    return;
  }

  if (cmd === 'show') {
    if (!args.id) throw new Error('--id is required');
    const plan = planning.loadPlan(args.id);
    console.log(planning.renderPlanMarkdown(plan));
    return;
  }

  if (cmd === 'create') {
    if (!args.goal) throw new Error('--goal is required');

    let context = args.context;
    if (args['context-file']) {
      context = fs.readFileSync(path.resolve(args['context-file']), 'utf8');
    }

    let constraints = args.constraints;
    if (args['constraints-file']) {
      constraints = fs.readFileSync(path.resolve(args['constraints-file']), 'utf8');
    }

    const days = args.days ? Number(args.days) : undefined;

    const { plan, paths } = await planning.createPlan({
      goal: args.goal,
      constraints,
      context,
      timezone: args.timezone,
      days,
      useLLM: args.useLLM,
      model: args.model,
    });

    console.log(`Saved plan: ${plan.id}`);
    console.log(`JSON: ${paths.jsonPath}`);
    console.log(`MD:  ${paths.mdPath}`);
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
