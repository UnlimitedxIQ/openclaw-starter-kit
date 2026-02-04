# Safety & Approvals

## 1) Default safety stance

- The orchestrator is **helpful but not autonomous**.
- Any action that can affect the outside world requires a **logged human approval**.
- Approvals are tied to a **specific plan hash** and expire.

---

## 2) Gates

### READ_ONLY
Examples:
- web_search / web_fetch
- reading workspace files

Default: allowed.

### LOCAL_SIDE_EFFECT
Examples:
- writing files under `C:\agent\openclaw-workspace\...`
- running allowlisted local commands

Default: allowed if all conditions hold:
- command is allowlisted OR the plan is human-approved
- working directory remains inside workspace

### EXTERNAL_SIDE_EFFECT
Examples:
- sending Telegram/SMS/email
- submitting a web form
- creating events on calendars
- calling third-party APIs with write scope

Default: **requires explicit approval**.

### DESTRUCTIVE
Examples:
- deleting files outside a temporary area
- purchases, billing changes
- account/security changes

Default: **requires explicit approval + two-step confirmation**:
1) approve plan (what, why, impact)
2) approve execution (exact payload/targets)

---

## 3) Approval request UX (recommended)

When requesting approval, include:
- what will happen (single sentence)
- target(s) (who/where)
- exact payload preview
- rollback plan (if applicable)
- time window (expiry)

Telegram: use inline buttons:
- ✅ Approve
- ❌ Deny

---

## 4) Policy defaults

- **Outbound comms**: allowed only to contacts marked opted-in.
- **No passwords** typed/stored by agent.
- **No financial actions** without explicit approval.
- **No irreversible deletions**: move to trash/quarantine instead.

---

## 5) Implementation hooks

The orchestrator should run policy checks in two places:

1. **Before dispatch**: determine if the plan implies external side effects; request approval.
2. **Before execution**: verify the approval matches the current plan hash and is not expired.

Approvals are stored as events:
- `approval.requested`
- `approval.granted` / `approval.denied`

