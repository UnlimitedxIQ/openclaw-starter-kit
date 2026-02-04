import { optimizeWorkflow, renderOptimizationReportMarkdown } from '../index.js';

const input = {
  workflowName: 'Weekly client reporting',
  goal: 'Ship weekly report in under 60 minutes with fewer errors',
  text: `
1) Export metrics from Product dashboard
2) Copy/paste into a spreadsheet template
3) Fix formatting and hunt down missing values
4) Write a summary email
5) Send to client and log the touchpoint in the CRM
6) Wait for approval from manager if client is enterprise
`
};

const report = optimizeWorkflow(input);
console.log(JSON.stringify(report, null, 2));
console.log('\n\n' + renderOptimizationReportMarkdown(report));
