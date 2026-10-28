// One-focus Check parts: the one-line reason per part, the next part needing action, arrow-key direction. Pure logic.
import { plainStatus } from './groups.mjs';
const open = (x) => x.status !== 'resolved';
/** Sort order of the list: what needs a person first, ready parts last. */
export const LIST_ORDER = ['needsDoc', 'needsAnswer', 'notOurs', 'ready'];
/** { status, prob?, text?, key?, vars? }: the problem to quote, a raw text, or an i18n key for the one-line reason. */
export function reasonFor(part) {
  const status = plainStatus(part); const probs = (part.problems || []).filter(open);
  if (status === 'notOurs') { const p = probs.find((x) => x.internal); return p ? { status, prob: p } : part.rejectReason ? { status, text: String(part.rejectReason) } : { status, key: 'rsn.notOurs', vars: {} }; }
  if (status === 'needsDoc') { const ts = (part.tasks || []).filter((x) => x.type === 'uploadDocument' && x.status !== 'done'); return { status, key: ts.length > 1 ? 'rsn.needsDocN' : 'rsn.needsDoc', vars: { n: ts.length, std: ts[0] ? ts[0].refNumber || '' : '' } }; }
  if (status === 'needsAnswer') { const p = probs.find((x) => x.severity === 'Blocker') || probs.find((x) => x.severity === 'Question'); return p ? { status, prob: p } : { status, key: 'rsn.pending', vars: {} }; }
  return { status, key: 'rsn.ready', vars: {} };
}
/** Rows of the list: [{ part, index, status }] in LIST_ORDER (stable), narrowed to one status when filter is set. */
export function listRows(parts, filter) {
  const rank = (s) => LIST_ORDER.indexOf(s);
  return (parts || []).map((part, index) => ({ part, index, status: plainStatus(part) })).filter((r) => !filter || r.status === filter).sort((a, b) => rank(a.status) - rank(b.status) || a.index - b.index);
}
/** Index of the next part that needs a document or an answer, after sel first, then wrapping to the start; -1 when none (sel itself is skipped). */
export function nextNeeding(parts, sel) {
  const need = (p) => { const s = plainStatus(p); return s === 'needsDoc' || s === 'needsAnswer'; }; const n = (parts || []).length;
  for (let k = 1; k < n; k++) { const i = (sel + k) % n; if (need(parts[i])) return i; }
  return -1;
}
/** Arrow keys: Right = next part and Left = previous in left-to-right text, mirrored in right-to-left (Hebrew). */
export function arrowMove(key, rtl) { if (key !== 'ArrowRight' && key !== 'ArrowLeft') return 0; const fwd = key === 'ArrowRight'; return fwd !== !!rtl ? 1 : -1; }
/** Keys are ignored while typing in a field. */
export const typing = (el) => !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || !!el.isContentEditable);
