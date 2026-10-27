// Project tabs logic: tab label/customer/status from a project's state, reorder, close confirmation, where an Outlook import goes.
import { importProgress } from '../wizard/importView.mjs';
export const newId = () => 'p' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
const cust = (c) => (c && typeof c === 'object' ? c.name || c.id || '' : c || '');
const subjKey = (s) => { const x = String(s || '').replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, '').trim(); return (x.match(/\b(\d{6})\b/) || [])[1] || x || null; };
const blocking = (p) => (p.problems || []).some((q) => (q.severity === 'Blocker' || q.severity === 'Question') && q.status !== 'resolved');
/** Tab meta: label (RFQ no., subject or first part), customer, status busy|check|ready|empty, progress 0..1. */
export function tabMeta(s) {
  const parts = s.parts || []; const r = (s.rfqs || [])[0];
  const key = r ? r.rfq_no || subjKey(r.subject) : null;
  const label = (r && (r.rfq_no || r.subject)) || (parts[0] && parts[0].partNo) || '';
  const customer = cust(r && r.customer) || cust(parts[0] && parts[0].customer);
  const status = s.busy ? 'busy' : !parts.length ? 'empty' : parts.some(blocking) ? 'check' : 'ready';
  return { key, label, customer, status, frac: importProgress(s.view).frac, step: s.step || 1, nParts: parts.length, dirty: !!s.dirty, lastRun: s.lastRun || null };
}
/** Move item from index a to index b. */
export function reorder(list, a, b) { if (a === b || a < 0 || b < 0 || a >= list.length || b >= list.length) return list; const l = [...list]; const [x] = l.splice(a, 1); l.splice(b, 0, x); return l; }
/** Ask before closing only when the project is still working or has changes. */
export const closeNeedsConfirm = (m) => !!(m && (m.status === 'busy' || m.dirty));
/** Outlook 'Send to QR': same RFQ open -> focus that tab; the current tab is empty -> use it; otherwise a new tab. */
export function routeOutlook(tabs, key, activeId) {
  const same = key && tabs.find((x) => x.key && x.key === key);
  if (same) return { kind: 'focus', id: same.id };
  const cur = tabs.find((x) => x.id === activeId);
  if (cur && cur.status === 'empty') return { kind: 'active', id: activeId };
  return { kind: 'new' };
}
/** The part of a project that is saved to disk. */
export const persisted = (s) => ({ step: s.step, parts: s.parts, rfqs: s.rfqs, unknown: s.unknown, lastRun: s.lastRun, sel: s.sel, tab: s.tab, dirty: !!s.dirty });
