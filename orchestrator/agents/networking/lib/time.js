'use strict';

function parseDateish(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toIsoString(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) throw new Error('Invalid Date');
  return d.toISOString();
}

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function nowIso() {
  return new Date().toISOString();
}

module.exports = {
  parseDateish,
  toIsoString,
  addDays,
  nowIso,
};
