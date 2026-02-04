export const RUBRIC = {
  scale: { min: 1, max: 5 },
  dimensions: [
    {
      id: 'workflow_understanding',
      name: 'Workflow understanding & decomposition',
      weight: 0.15,
      anchors: {
        5: 'Steps clearly extracted/ordered/labeled with minimal hallucination.',
        3: 'Mostly correct step list; some ambiguity/missing details.',
        1: 'Misunderstands workflow or invents major steps.'
      }
    },
    {
      id: 'bottlenecks',
      name: 'Bottleneck identification quality',
      weight: 0.2,
      anchors: {
        5: 'Finds true constraints (time/waits/rework/handoffs) with evidence and rationale.',
        3: 'Plausible bottlenecks but misses key constraint or overemphasizes minor pain.',
        1: 'Generic and not grounded in workflow.'
      }
    },
    {
      id: 'recommendations',
      name: 'Recommendation relevance & leverage',
      weight: 0.2,
      anchors: {
        5: 'Directly addresses bottlenecks; high leverage; avoids low-value busywork.',
        3: 'Mix of relevant and generic items.',
        1: 'Mostly irrelevant or restates the problem.'
      }
    },
    {
      id: 'feasibility_risk',
      name: 'Feasibility & risk awareness',
      weight: 0.15,
      anchors: {
        5: 'Accounts for constraints/data sensitivity/security/compliance; proposes safe rollout.',
        3: 'Some feasibility notes, limited risk analysis.',
        1: 'Unrealistic or risky; ignores constraints.'
      }
    },
    {
      id: 'prioritization',
      name: 'Prioritization logic',
      weight: 0.15,
      anchors: {
        5: 'Clear criteria (impact/effort/confidence/ROI); ordering makes sense; includes quick wins.',
        3: 'Prioritization present but inconsistent or poorly justified.',
        1: 'Unprioritized list or arbitrary ordering.'
      }
    },
    {
      id: 'roi',
      name: 'ROI clarity',
      weight: 0.15,
      anchors: {
        5: 'Explicit assumptions; time/cost savings and payback estimates with caveats.',
        3: 'Rough ROI numbers with limited assumptions.',
        1: 'No ROI or meaningless numbers.'
      }
    }
  ],
  howToUse: [
    'Score each dimension from 1–5.',
    'Optionally compute weighted total: sum(score * weight).',
    'Use comments for missing input details; do not penalize for unknowns if called out.'
  ]
};
