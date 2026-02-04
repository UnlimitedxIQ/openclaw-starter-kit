'use strict';

const fs = require('fs');
const path = require('path');

function safeJsonStringify(obj) {
  return JSON.stringify(obj, null, 2) + '\n';
}

function dataDir(planningAgentRoot) {
  return path.join(planningAgentRoot, 'data');
}

function plansDir(planningAgentRoot) {
  return path.join(dataDir(planningAgentRoot), 'plans');
}

function indexPath(planningAgentRoot) {
  return path.join(dataDir(planningAgentRoot), 'index.json');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

/**
 * @param {string} s
 */
function slugify(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'plan';
}

/**
 * @returns {any[]}
 */
function readIndex(planningAgentRoot) {
  try {
    const raw = fs.readFileSync(indexPath(planningAgentRoot), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(planningAgentRoot, entries) {
  ensureDir(dataDir(planningAgentRoot));
  fs.writeFileSync(indexPath(planningAgentRoot), safeJsonStringify(entries));
}

/**
 * @param {import('./planSchema').Plan} plan
 * @param {{planningAgentRoot: string, markdown?: string}} opts
 */
function savePlan(plan, opts) {
  const root = opts.planningAgentRoot;
  ensureDir(plansDir(root));

  const planFolder = path.join(plansDir(root), plan.id);
  ensureDir(planFolder);

  fs.writeFileSync(path.join(planFolder, 'plan.json'), safeJsonStringify(plan));
  if (opts.markdown) {
    fs.writeFileSync(path.join(planFolder, 'plan.md'), opts.markdown);
  }

  const idx = readIndex(root);
  const existing = idx.find((e) => e.id === plan.id);
  const summary = {
    id: plan.id,
    title: plan.title,
    goal: plan.goal,
    createdAt: plan.meta?.createdAt,
    updatedAt: plan.meta?.updatedAt,
  };
  if (existing) Object.assign(existing, summary);
  else idx.unshift(summary);
  writeIndex(root, idx);

  return {
    planFolder,
    jsonPath: path.join(planFolder, 'plan.json'),
    mdPath: path.join(planFolder, 'plan.md'),
  };
}

/**
 * @param {string} planId
 * @param {{planningAgentRoot: string}} opts
 */
function loadPlan(planId, opts) {
  const file = path.join(plansDir(opts.planningAgentRoot), planId, 'plan.json');
  const raw = fs.readFileSync(file, 'utf8');
  return JSON.parse(raw);
}

/**
 * @param {{planningAgentRoot: string}} opts
 */
function listPlans(opts) {
  return readIndex(opts.planningAgentRoot);
}

module.exports = {
  slugify,
  savePlan,
  loadPlan,
  listPlans,
};
