'use strict';

const fs = require('fs');
const path = require('path');

function readPrompt(root, filename) {
  return fs.readFileSync(path.join(root, 'prompts', filename), 'utf8');
}

function loadPrompts(planningAgentRoot) {
  return {
    planSystem: readPrompt(planningAgentRoot, 'plan.system.md'),
    planUser: readPrompt(planningAgentRoot, 'plan.user.md')
  };
}

const DEFAULT_ROOT = path.resolve(__dirname, '..');
const PROMPTS = loadPrompts(DEFAULT_ROOT);

module.exports = {
  loadPrompts,
  PROMPTS
};
