// Project tabs logic: tab label/customer/status from a project's state, reorder, close confirmation, where an Outlook import goes.
import { importProgress } from '../wizard/importView.mjs';
export const newId = () => 'p' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
const cust = (c) => (c && typeof c === 'object' ? c.name || c.id || '' : c || '');
const subjKey = (s) => { const x = String(s || '').replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, '').trim(); return (x.match(/\b(\d{6})\b/) || [])[1] || x || null; };
const blocking = (p) => (p.problems || []).some((q) => (q.severity === 'Blocker' || q.severity === 'Question') && q.status !== 'resolved');
/** hh:mm (24 h, local time) of an ISO time; '' when invalid. */
export const hhmm = (iso) => { const d = new Date(iso); return iso && !isNaN(d) ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : ''; };
/** Keyboard shortcuts: Ctrl+S save, Ctrl+Shift+S save as, Ctrl+W close the tab, Ctrl+O open a project file. */
export function shortcutAction(e) {
  if (!e || !(e.ctrlKey || e.metaKey) || e.altKey) return null; const k = String(e.key || '').toLowerCase();
  return k === 's' ? (e.shiftKey ? 'saveAs' : 'save') : k === 'w' && !e.shiftKey ? 'close' : k === 'o' && !e.shiftKey ? 'open' : null;
}
/** Dropped paths: .qrproj project files open as projects, everything else is imported as before. */
export const splitProjectFiles = (paths) => ({ projects: (paths || []).filter((p) => /\.qrproj$/i.test(p)), rest: (paths || []).filter((p) => !/\.qrproj$/i.test(p)) });
/** Tab meta: label (RFQ no., subject or first part), customer, status busy|check|ready|empty, progress 0..1. */
export function tabMeta(s) {
  const parts = s.parts || []; const r = (s.rfqs || [])[0];
  const key = r ? r.rfq_no || subjKey(r.subject) : null;
  const label = (r && (r.rfq_no || r.subject)) || (parts[0] && parts[0].partNo) || '';
  const customer = cust(r && r.customer) || cust(parts[0] && parts[0].customer);
  const status = s.busy ? 'busy' : !parts.length ? 'empty' : parts.some(blocking) ? 'check' : 'ready';
  return { key, label, customer, status, frac: importProgress(s.view).frac, mailKeys: (s.rfqs || []).map((r) => r && r.mail_key).filter(Boolean), step: s.step || 1, nParts: parts.length, dirty: !!s.dirty, unsaved: !!s.unsaved, lastRun: s.lastRun || null, savedAt: s.savedAt || null };
}
/** Move item from index a to index b. */
export function reorder(list, a, b) { if (a === b || a < 0 || b < 0 || a >= list.length || b >= list.length) return list; const l = [...list]; const [x] = l.splice(a, 1); l.splice(b, 0, x); return l; }
/** Ask before closing only while a job is running in the tab (closing never deletes: the project stays in History and on disk). */
export const closeNeedsConfirm = (m) => !!(m && m.status === 'busy');
/** Outlook 'Send to QR': a tab opens for every e-mail. Only the SAME e-mail (same Message-ID / fingerprint) focuses its open tab; the current tab is reused only when it is empty. keys = mail keys of the import. */
export function routeOutlook(tabs, keys, activeId) {
  const ks = (Array.isArray(keys) ? keys : [keys]).filter(Boolean);
  const same = ks.length && tabs.find((x) => (x.mailKeys || []).some((k) => ks.includes(k)));
  if (same) return { kind: 'focus', id: same.id };
  const cur = tabs.find((x) => x.id === activeId);
  if (cur && cur.status === 'empty') return { kind: 'active', id: activeId };
  return { kind: 'new' };
}
/** The part of a project that is saved to disk. */
export const persisted = (s) => ({ step: s.step, parts: s.parts, rfqs: s.rfqs, unknown: s.unknown, lastRun: s.lastRun, sel: s.sel, tab: s.tab, dirty: !!s.dirty });
/** Save state of a tab for the dot, the status bar and tooltips: 'none' (nothing to save), 'unsaved' (changed since the last save) or 'saved'. */
export const saveStatus = (m) => (!m || !m.nParts ? 'none' : m.unsaved ? 'unsaved' : m.savedAt ? 'saved' : 'none');
