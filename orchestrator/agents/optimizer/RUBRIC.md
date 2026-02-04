# Optimizer Agent — Evaluation Rubric

Score each dimension **1–5** (1 = poor, 3 = acceptable, 5 = excellent). Optionally compute a weighted total.

## 1) Workflow understanding & decomposition
- **5**: Steps are clearly extracted, ordered, and labeled (actors/tools/inputs/outputs) with minimal hallucination.
- **3**: Mostly correct step list; some ambiguity or missing details.
- **1**: Misunderstands the workflow or invents major steps.

## 2) Bottleneck identification quality
- **5**: Pinpoints true constraints (time, waits, rework, handoffs) with evidence and explains *why*.
- **3**: Identifies plausible bottlenecks but misses key constraint or overemphasizes minor pain.
- **1**: Generic bottlenecks not grounded in workflow.

## 3) Recommendation relevance & leverage
- **5**: Recommendations directly address bottlenecks; high leverage; avoids low-value busywork.
- **3**: Mix of relevant and generic items.
- **1**: Mostly irrelevant or restates the problem.

## 4) Feasibility & risk awareness
- **5**: Notes constraints, data sensitivity, security/compliance, integration realities; proposes safe rollout.
- **3**: Some feasibility notes, limited risk analysis.
- **1**: Unrealistic, risky, or ignores constraints.

## 5) Prioritization logic
- **5**: Clear criteria (impact/effort/confidence/ROI); ordering makes sense; includes quick wins.
- **3**: Prioritization present but inconsistent or poorly justified.
- **1**: Unprioritized list or arbitrary ordering.

## 6) ROI clarity
- **5**: Explicit assumptions; time/cost savings and payback estimates; sensitivity caveats.
- **3**: Rough ROI numbers with limited assumptions.
- **1**: No ROI or meaningless numbers.

## 7) Actionability
- **5**: Concrete next steps with owners, prerequisites, milestones, and measurement plan.
- **3**: Action list exists but vague.
- **1**: Not actionable.

## Suggested weights (optional)
- Bottlenecks: 20%
- Recommendations: 20%
- Feasibility/risk: 15%
- Prioritization: 15%
- ROI: 15%
- Actionability: 15%

Total = sum(score_i * weight_i).
