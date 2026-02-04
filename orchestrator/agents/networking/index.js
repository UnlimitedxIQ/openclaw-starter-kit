'use strict';

const path = require('path');

const { loadContacts, findContacts, upsertContact, getContactById } = require('./lib/contacts');
const {
  ensurePerson,
  addNote,
  logTouchpoint,
  loadPersonCrm,
  savePersonCrm,
  listAllPeopleIds,
} = require('./lib/person');
const {
  loadSequences,
  startSequenceInstance,
  draftNextStep,
  markStepSent,
  getDueFollowUps,
} = require('./lib/sequences');
const { generateMeetingPrep } = require('./lib/meetingPrep');
const { toIsoString, parseDateish } = require('./lib/time');

function defaultWorkspaceRoot() {
  // __dirname = <workspace>/orchestrator/agents/networking
  return path.resolve(__dirname, '..', '..', '..');
}

function createNetworkingAgent(options = {}) {
  const workspaceRoot = options.workspaceRoot
    ? path.resolve(options.workspaceRoot)
    : defaultWorkspaceRoot();

  const contactsDir = options.contactsDir
    ? path.resolve(options.contactsDir)
    : path.join(workspaceRoot, 'contacts');

  const sequencesPath = options.sequencesPath
    ? path.resolve(options.sequencesPath)
    : path.join(__dirname, 'sequences', 'default.json');

  async function run(action, params = {}) {
    switch (action) {
      case 'listContacts': {
        const data = await loadContacts(contactsDir);
        const matches = findContacts(data.contacts, {
          query: params.query,
          tag: params.tag,
          limit: params.limit,
        });
        return { ok: true, contacts: matches };
      }

      case 'getContact': {
        const data = await loadContacts(contactsDir);
        const c = getContactById(data.contacts, params.id);
        if (!c) return { ok: false, error: `Contact not found: ${params.id}` };
        return { ok: true, contact: c };
      }

      case 'upsertContact': {
        const contact = params.contact;
        if (!contact || !contact.id || !contact.name) {
          return { ok: false, error: 'contact with {id,name} is required' };
        }
        const res = await upsertContact(contactsDir, contact);
        return { ok: true, contact: res };
      }

      case 'ensurePerson': {
        const id = params.id;
        if (!id) return { ok: false, error: 'id is required' };
        await ensurePerson(contactsDir, id);
        const crm = await loadPersonCrm(contactsDir, id);
        return { ok: true, id, crm };
      }

      case 'addNote': {
        const { id, note, kind } = params;
        if (!id || !note) return { ok: false, error: 'id and note are required' };
        await ensurePerson(contactsDir, id);
        const when = parseDateish(params.date) || new Date();
        await addNote(contactsDir, id, { note, kind: kind || 'note', at: toIsoString(when) });
        const crm = await loadPersonCrm(contactsDir, id);
        return { ok: true, id, crm };
      }

      case 'logTouchpoint': {
        const { id, touchpoint } = params;
        if (!id || !touchpoint) return { ok: false, error: 'id and touchpoint are required' };
        await ensurePerson(contactsDir, id);
        const tp = {
          at: toIsoString(parseDateish(touchpoint.at) || new Date()),
          channel: touchpoint.channel || 'unknown',
          direction: touchpoint.direction || 'outbound',
          summary: touchpoint.summary || '',
          outcome: touchpoint.outcome || '',
          nextFollowUpAt: touchpoint.nextFollowUpAt ? toIsoString(parseDateish(touchpoint.nextFollowUpAt)) : null,
          meta: touchpoint.meta || {},
        };
        const crm = await logTouchpoint(contactsDir, id, tp);
        return { ok: true, id, crm };
      }

      case 'startSequence': {
        const { id, sequenceId } = params;
        if (!id || !sequenceId) return { ok: false, error: 'id and sequenceId are required' };
        await ensurePerson(contactsDir, id);
        const sequences = await loadSequences(sequencesPath);
        const instance = startSequenceInstance({
          sequences,
          sequenceId,
          channel: params.channel,
          goal: params.goal,
          context: params.context,
          startDate: parseDateish(params.startDate) || new Date(),
        });
        const crm = await loadPersonCrm(contactsDir, id);
        crm.sequences = crm.sequences || [];
        crm.sequences.push(instance);
        await savePersonCrm(contactsDir, id, crm);
        return { ok: true, id, instance };
      }

      case 'draftNextSequenceStep': {
        const { id, instanceId, vars } = params;
        if (!id || !instanceId) return { ok: false, error: 'id and instanceId are required' };
        const sequences = await loadSequences(sequencesPath);
        const crm = await loadPersonCrm(contactsDir, id);
        const contactData = await loadContacts(contactsDir);
        const contact = getContactById(contactData.contacts, id) || { id };

        const draft = draftNextStep({ sequences, crm, instanceId, contact, vars: vars || {} });
        if (!draft.ok) return draft;
        return { ok: true, ...draft };
      }

      case 'markSequenceStepSent': {
        const { id, instanceId, stepIndex } = params;
        if (!id || !instanceId || typeof stepIndex !== 'number') {
          return { ok: false, error: 'id, instanceId, and numeric stepIndex are required' };
        }
        const sentAt = parseDateish(params.sentAt) || new Date();
        const sequences = await loadSequences(sequencesPath);
        const crm = await loadPersonCrm(contactsDir, id);

        const result = markStepSent({ sequences, crm, instanceId, stepIndex, sentAt: toIsoString(sentAt) });
        if (!result.ok) return result;

        // Persist the sequence update first, then append the touchpoint.
        // (logTouchpoint loads/saves the CRM from disk, so ordering matters.)
        await savePersonCrm(contactsDir, id, crm);

        const summary = params.summary || result.touchpointSummary || `Sequence step ${stepIndex} sent`;
        await logTouchpoint(contactsDir, id, {
          at: toIsoString(sentAt),
          channel: result.channel || 'unknown',
          direction: 'outbound',
          summary,
          outcome: '',
          // Avoid creating duplicate "open loop" tasks for sequence steps.
          nextFollowUpAt: null,
          meta: { sequenceId: result.sequenceId, instanceId, stepIndex, nextFollowUpAt: result.nextFollowUpAt || null },
        });

        return { ok: true, id, instanceId, stepIndex, nextFollowUpAt: result.nextFollowUpAt || null };
      }

      case 'getFollowUpsDue': {
        const asOf = parseDateish(params.asOf) || new Date();
        const withinDays = typeof params.withinDays === 'number' ? params.withinDays : 14;
        const limit = typeof params.limit === 'number' ? params.limit : 50;

        const contactData = await loadContacts(contactsDir);
        const sequences = await loadSequences(sequencesPath);
        const ids = await listAllPeopleIds(contactsDir);

        const due = [];
        for (const id of ids) {
          const crm = await loadPersonCrm(contactsDir, id);
          const contact = getContactById(contactData.contacts, id) || { id };
          const items = getDueFollowUps({ sequences, crm, contact, asOf, withinDays });
          for (const item of items) {
            due.push(item);
          }
        }

        due.sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)));
        return { ok: true, asOf: toIsoString(asOf), withinDays, due: due.slice(0, limit) };
      }

      case 'meetingPrep': {
        const { id } = params;
        if (!id) return { ok: false, error: 'id is required' };

        await ensurePerson(contactsDir, id);
        const contactData = await loadContacts(contactsDir);
        const contact = getContactById(contactData.contacts, id) || { id };
        const crm = await loadPersonCrm(contactsDir, id);

        const meetingDate = parseDateish(params.meetingDate) || null;
        const prep = await generateMeetingPrep({
          workspaceRoot,
          contactsDir,
          id,
          contact,
          crm,
          meetingTitle: params.meetingTitle || 'Meeting',
          meetingDate,
          goals: Array.isArray(params.goals) ? params.goals : (params.goals ? [String(params.goals)] : []),
          save: params.save !== false,
        });

        return { ok: true, ...prep };
      }

      default:
        return { ok: false, error: `Unknown action: ${action}` };
    }
  }

  return {
    name: 'networking',
    version: 1,
    workspaceRoot,
    contactsDir,
    sequencesPath,
    run,
  };
}

module.exports = {
  createNetworkingAgent,
};
