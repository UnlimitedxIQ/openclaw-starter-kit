export const OPTIMIZER_AGENT = {
  name: 'optimizer',
  version: '1.0.0',
  description: 'Workflow optimizer: bottlenecks, automations, prioritization, ROI, action plan.',
  entry: 'optimizeWorkflow(input, options?)'
};

export { optimizeWorkflow, renderOptimizationReportMarkdown, DEFAULTS } from './src/optimizer.js';
export { PROMPTS } from './src/prompts.js';
export { RUBRIC } from './src/rubric.js';
export { SCHEMAS } from './src/schemas.js';
