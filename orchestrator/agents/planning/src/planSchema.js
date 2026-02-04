'use strict';

/**
 * Minimal schema + helpers for a Noble Planning Agent.
 *
 * This module intentionally avoids external dependencies so it can be used
 * anywhere inside the orchestrator.
 */

/** @typedef {'low'|'med'|'high'} Priority */
/** @typedef {'todo'|'doing'|'done'|'blocked'} TaskStatus */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} milestoneId
 * @property {TaskStatus} status
 * @property {Priority} priority
 * @property {number} estimateHours
 * @property {string[]} dependsOn
 * @property {string[]} deliverables
 */

/**
 * @typedef {Object} Milestone
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string[]} successCriteria
 * @property {string=} targetDate // ISO date
 * @property {string[]} dependsOn
 * @property {string[]} taskIds
 */

/**
 * @typedef {Object} AgendaBlock
 * @property {string} start // HH:MM
 * @property {string} end   // HH:MM
 * @property {string} title
 * @property {string[]} taskIds
 */

/**
 * @typedef {Object} DayAgenda
 * @property {string} date // ISO date
 * @property {string} focus
 * @property {AgendaBlock[]} blocks
 */

/**
 * @typedef {Object} WeekAgenda
 * @property {string} weekStart // ISO date
 * @property {string} theme
 * @property {DayAgenda[]} days
 */

/**
 * @typedef {Object} PlanAgenda
 * @property {string} timezone
 * @property {string} startDate
 * @property {string} endDate
 * @property {WeekAgenda[]} weeks
 */

/**
 * @typedef {Object} PlanContext
 * @property {string} now
 * @property {string[]} resources
 * @property {string[]} stakeholders
 * @property {string[]} assumptions
 * @property {string[]} nonGoals
 */

/**
 * @typedef {Object} Plan
 * @property {string} id
 * @property {string} title
 * @property {string} goal
 * @property {string[]} constraints
 * @property {PlanContext} context
 * @property {Milestone[]} milestones
 * @property {Task[]} tasks
 * @property {PlanAgenda} agenda
 * @property {{risk:string,impact:string,likelihood:string,mitigation:string}[]} risks
 * @property {{decision:string,rationale:string}[]} decisions
 * @property {string[]} nextActions
 * @property {{createdAt:string,updatedAt:string,version:string,model?:string}} meta
 */

/**
 * Loose runtime check. It is intentionally permissive: we mainly want to
 * reject totally malformed outputs from the LLM.
 * @param {any} plan
 * @returns {{ok:true}|{ok:false,reason:string}}
 */
function validatePlanShape(plan) {
  if (!plan || typeof plan !== 'object') return { ok: false, reason: 'plan is not an object' };
  if (typeof plan.goal !== 'string' || !plan.goal.trim()) return { ok: false, reason: 'goal missing' };
  if (!Array.isArray(plan.milestones)) return { ok: false, reason: 'milestones missing/invalid' };
  if (!Array.isArray(plan.tasks)) return { ok: false, reason: 'tasks missing/invalid' };
  if (!plan.agenda || typeof plan.agenda !== 'object') return { ok: false, reason: 'agenda missing/invalid' };
  return { ok: true };
}

module.exports = {
  validatePlanShape,
};
