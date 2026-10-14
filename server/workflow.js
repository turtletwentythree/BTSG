// Workflow rules, taken from the Legal Request System user manuals (v1.0 Oct 2024, v2.0 Dec 2025).
//
//  1 Fill out request form  USER / Coordinator   Draft (no Request No.) -> Submit
//  2 Submitting request     USER Approver        Approve | Save | Return (to Coordinator, comment required)
//  3 Waiting for acceptance Legal                Accept (assign a lawyer) | Reject (final, reason required)
//  4 Reviewing              Legal                Send comment to Coordinator | request Cancel (Coordinator must agree)
//  5 Waiting for user cmt   Coordinator          Return (-> 4) | Approve (-> 6, or -> 9 for Legal Documents) | Cancel (immediate)
//  6 User approved          Coordinator          pick who finalizes the draft, attach Signing Memo -> 7
//  7 Finalizing             Legal, then Coord.   Legal: final draft + up to 3 Final Approvers; Coordinator: up to 3 more -> 8
//  8 Waiting final approval Final Approvers      one by one, in order. Reject (reason) -> 7. Approved ones are not asked again
//  9 Signing                Legal                scan the signed file into the system -> 10
// 10 Complete
import { isApprover } from './auth.js';

export const STEPS = [
  'Fill out request form', 'Submitting request', 'Waiting for acceptance', 'Reviewing',
  'Waiting for user comment', 'User approved', 'Finalizing', 'Waiting for final approval',
  'Signing', 'Complete',
];

export const emailsOf = (s) =>
  String(s || '').split(/[;,\s]+/).map((x) => x.trim().toLowerCase()).filter((x) => x.includes('@'));
const has = (list, email) => !!email && list.includes(String(email).trim().toLowerCase());

export const isLegalDoc = (r) => r.matter === 'Legal Documents';
export const terminal = (r) => r.step >= STEPS.length || r.state === 'rejected' || r.state === 'cancelled';
export const finalList = (r) => emailsOf(r.final_approvers);
export const finalDone = (r) => emailsOf(r.final_done);
export const currentFinal = (r) => finalList(r).find((e) => !finalDone(r).includes(e));

export function roles(r, user) {
  const email = user?.email;
  const owner = !!user && (r.requester_email
    ? r.requester_email.toLowerCase() === String(email || '').toLowerCase()
    : r.requester === user.name);
  return {
    legal: isApprover(user),
    owner,
    // Coordinator = who works the request after Submit. The creator keeps the right too, so nobody is locked out.
    co: owner || has(emailsOf(r.fields?.user_coordinator), email),
    uapprover: has(emailsOf(r.fields?.user_approver), email),
    final: !!email && currentFinal(r) === String(email).toLowerCase(),
  };
}

export function statusLabel(r) {
  if (r.state === 'rejected') return 'Rejected';
  if (r.state === 'cancelled') return 'Cancelled';
  if (r.step === 1) return r.submitted ? 'Return' : 'Draft';
  const base = STEPS[r.step - 1];
  return r.state === 'cancel_pending' ? `${base} (Cancel requested)` : base;
}

// what the signed-in user may do right now: [{ key, label, note?: 'required'|'optional' }]
export function actionsFor(r, user) {
  if (!user || terminal(r)) return [];
  const ro = roles(r, user);
  const A = (key, label, note = null, extra = {}) => ({ key, label, note, ...extra });
  const out = [];
  switch (r.step) {
    case 1:
      if (ro.co || ro.legal) out.push(A('save', 'Save'), A('submit', 'Submit'));
      break;
    case 2:
      if (ro.uapprover || ro.legal) out.push(A('return', 'Return', 'required'), A('save', 'Save'), A('approve', 'Approve'));
      break;
    case 3:
      if (ro.legal) out.push(A('reject', 'Reject', 'required', { danger: true }), A('accept', 'Accept'));
      break;
    case 4:
      if (r.state === 'cancel_pending') {
        if (ro.co) out.push(A('decline_cancel', 'Cancel (keep request)', 'optional'), A('accept_cancel', 'Approve cancellation', 'optional', { danger: true }));
        break;
      }
      if (ro.legal) out.push(A('request_cancel', 'Request cancellation', 'required', { danger: true }), A('send', 'Send comment to Coordinator', 'required'));
      if (ro.co) out.push(A('cancel', 'Cancel Request', 'required', { danger: true }));
      break;
    case 5:
      if (ro.co) out.push(A('cancel', 'Cancel Request', 'required', { danger: true }), A('return', 'Return', 'required'), A('approve', 'Approve', 'required'));
      break;
    case 6:
      if (ro.co) out.push(A('submit', 'Submit'));
      break;
    case 7:
      if (r.final_stage === 0 && ro.legal) out.push(A('submit', 'Submit'));
      if (r.final_stage === 1 && (ro.co || ro.legal)) out.push(A('submit', 'Submit'));
      break;
    case 8:
      if (ro.final || ro.legal) out.push(A('reject', 'Reject', 'required', { danger: true }), A('approve', 'Approve', 'optional'));
      break;
    case 9:
      if (ro.legal) out.push(A('complete', 'Complete (upload signed file)'));
      break;
    default:
  }
  return out;
}

export function canEdit(r, user) {
  if (!user || terminal(r)) return false;
  const ro = roles(r, user);
  if (r.step === 1) return ro.co || ro.legal;
  if (r.step === 2) return ro.uapprover || ro.legal;
  return ro.legal;
}

const DOC_EXT = /\.(docx?|pdf|jpe?g|png)$/i;
export const fileOk = (name) => DOC_EXT.test(String(name || ''));

export function canUpload(r, user, kind) {
  if (!user || terminal(r)) return false;
  const ro = roles(r, user);
  if (kind === 'signed') return ro.legal;
  if (kind === 'final') return ro.legal || (ro.co && (r.step === 6 || r.step === 7));
  if (kind === 'memo') return ro.legal || ro.co;
  if (kind === 'work') return ro.legal || ro.co || ro.uapprover || ro.final;
  return ro.legal || ro.co || ro.uapprover; // ordinary request attachments
}
