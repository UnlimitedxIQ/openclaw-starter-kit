'use strict';

const planning = require('..');

(async () => {
  const { plan, paths } = await planning.createPlan({
    goal: 'Write a 2-page proposal for Project Noble',
    constraints: [
      'Timebox: 6 hours total',
      'Audience: non-technical stakeholders',
    ],
    context: {
      now: 'We have a rough bullet list and need structure + timeline.',
      resources: ['Existing notes in /memory', 'Past proposals'],
      stakeholders: ['Bryson', 'Leadership'],
      assumptions: ['No budget approval in this doc'],
      nonGoals: ['Implementation details'],
    },
    days: 7,
    useLLM: false,
  });

  console.log('Plan saved:', plan.id);
  console.log('Markdown:', paths.mdPath);
})();
