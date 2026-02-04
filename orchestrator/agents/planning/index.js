'use strict';

const planningAgentRoot = __dirname;

const { createPlan: _createPlan, generatePlan: _generatePlan } = require('./src/planningAgent');
const { loadPlan, listPlans } = require('./src/storage');
const { renderPlanMarkdown } = require('./src/markdown');
const { PROMPTS } = require('./src/prompts');

const PLANNING_AGENT = {
  name: 'planning',
  version: '1.0.0',
  description: 'Goal → milestones, tasks, dependencies, and a weekly/daily agenda; persists plans.',
  entry: 'createPlan(input)'
};

function withRoot(input) {
  return { ...input, planningAgentRoot };
}

/**
 * Orchestrator-facing API.
 *
 * All functions are dependency-free except the optional OpenAI API call.
 */
module.exports = {
  PLANNING_AGENT,
  PROMPTS,
  planningAgentRoot,

  // Main entry points
  createPlan: (input) => _createPlan(withRoot(input)),
  generatePlan: (input) => _generatePlan(withRoot(input)),

  // Persistence utilities
  loadPlan: (planId) => loadPlan(planId, { planningAgentRoot }),
  listPlans: () => listPlans({ planningAgentRoot }),

  // Rendering
  renderPlanMarkdown,
};
