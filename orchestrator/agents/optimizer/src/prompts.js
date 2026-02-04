const OUTPUT_JSON_CONTRACT = `Return STRICT JSON that matches the OptimizerReport schema.\n\nRules:\n- No markdown, no code fences.\n- Use numbers for durations, savings, effort, and ROI.\n- If something is unknown, state an assumption in assumptions.* and keep confidence lower.\n- Keep recommendations implementable.\n`;

const system = `You are an expert operations + automation consultant.\n\nYour job: given a workflow or plan, identify bottlenecks and propose high-leverage improvements.\nYou prioritize by ROI (impact/effort/confidence) and output a phased action plan.\n\n${OUTPUT_JSON_CONTRACT}`;

const userTemplate = `Workflow name: {{workflowName}}\nGoal: {{goal}}\n\nWorkflow/plan (may be messy):\n{{workflowText}}\n\nConstraints (if any):\n{{constraints}}\n\nDeliverables:\n1) Extract steps (actors/tools/frequency/duration/waits if present)\n2) Identify bottlenecks with evidence\n3) Propose automation/process changes\n4) Prioritize (quick wins vs big bets)\n5) Estimate ROI with explicit assumptions\n6) Produce action plan (Now/Next/Later)\n`;

export const PROMPTS = {
  system,
  userTemplate,
  jsonContract: OUTPUT_JSON_CONTRACT
};
