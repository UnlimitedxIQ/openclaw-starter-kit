'use strict';

const path = require('path');
const fs = require('fs/promises');

const { fileExists, readJson, writeJsonAtomic } = require('./storage');

function normalizeId(id) {
  return String(id || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
}

function normalizeContact(contact) {
  const id = normalizeId(contact.id);
  const name = String(contact.name || '').trim();
  const phone = contact.phone ? String(contact.phone).trim() : '';
  const email = contact.email ? String(contact.email).trim() : '';
  const tags = Array.isArray(contact.tags)
    ? contact.tags.map((t) => String(t).trim()).filter(Boolean)
    : (typeof contact.tags === 'string' ? contact.tags.split(/[;,]/) : [])
        .map((t) => String(t).trim())
        .filter(Boolean);
  const notes = contact.notes ? String(contact.notes).trim() : '';

  return {
    id,
    name,
    phone,
    email,
    tags: Array.from(new Set(tags)),
    notes,
  };
}

function getContactById(contacts, id) {
  const nid = normalizeId(id);
  return contacts.find((c) => normalizeId(c.id) === nid) || null;
}

function findContacts(contacts, { query, tag, limit } = {}) {
  const q = query ? String(query).trim().toLowerCase() : '';
  const t = tag ? String(tag).trim().toLowerCase() : '';
  const lim = typeof limit === 'number' ? limit : 50;

  const out = [];
  for (const c of contacts) {
    if (t) {
      const tags = (c.tags || []).map((x) => String(x).toLowerCase());
      if (!tags.includes(t)) continue;
    }

    if (q) {
      const hay = [c.id, c.name, c.email, c.phone, (c.tags || []).join(' '), c.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) continue;
    }

    out.push(c);
    if (out.length >= lim) break;
  }
  return out;
}

function parseCsv(text) {
  // Minimal CSV parser w/ quotes.
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      row.push(cur);
      cur = '';
      continue;
    }

    if (ch === '\n') {
      row.push(cur);
      cur = '';
      if (row.some((v) => v.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }

    if (ch === '\r') {
      continue;
    }

    cur += ch;
  }

  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    if (row.some((v) => v.trim() !== '')) rows.push(row);
  }

  return rows;
}

async function loadContacts(contactsDir) {
  const jsonPath = path.join(contactsDir, 'contacts.json');
  const csvPath = path.join(contactsDir, 'contacts.csv');

  if (await fileExists(jsonPath)) {
    const data = await readJson(jsonPath, { version: 1, contacts: [] });
    const contacts = Array.isArray(data.contacts) ? data.contacts.map(normalizeContact) : [];
    return { version: 1, contacts };
  }

  if (await fileExists(csvPath)) {
    const txt = await fs.readFile(csvPath, 'utf8');
    const rows = parseCsv(txt);
    if (!rows.length) return { version: 1, contacts: [] };

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (name) => header.indexOf(name);

    const contacts = [];
    for (const r of rows.slice(1)) {
      const contact = {
        id: idx('id') >= 0 ? r[idx('id')] : '',
        name: idx('name') >= 0 ? r[idx('name')] : '',
        phone: idx('phone') >= 0 ? r[idx('phone')] : '',
        email: idx('email') >= 0 ? r[idx('email')] : '',
        tags: idx('tags') >= 0 ? String(r[idx('tags')] || '').split(';') : [],
        notes: idx('notes') >= 0 ? r[idx('notes')] : '',
      };
      const norm = normalizeContact(contact);
      if (norm.id && norm.name) contacts.push(norm);
    }

    return { version: 1, contacts };
  }

  return { version: 1, contacts: [] };
}

async function upsertContact(contactsDir, contact) {
  const jsonPath = path.join(contactsDir, 'contacts.json');
  const data = await loadContacts(contactsDir);

  const norm = normalizeContact(contact);
  if (!norm.id || !norm.name) throw new Error('contact.id and contact.name are required');

  const idx = data.contacts.findIndex((c) => c.id === norm.id);
  if (idx >= 0) data.contacts[idx] = { ...data.contacts[idx], ...norm };
  else data.contacts.push(norm);

  await writeJsonAtomic(jsonPath, { version: 1, contacts: data.contacts });
  return getContactById(data.contacts, norm.id);
}

module.exports = {
  normalizeId,
  normalizeContact,
  loadContacts,
  findContacts,
  getContactById,
  upsertContact,
};
