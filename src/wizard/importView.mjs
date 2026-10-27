// Import view logic: pipeline events -> e-mails (subject, sender) and files with a plain status; progress; when to leave step 1.
/** Empty view: nothing imported. */
export const emptyImport = () => ({ mails: [], files: [], active: false });
/** A run starts. append = add to what is already shown (a later drop), otherwise a fresh view. */
export const startImport = (v, append) => ({ ...(append && v ? v : emptyImport()), active: true });
const base = (s) => String(s || '').split(/[\\/]/).pop();
const set = (v, name, status) => ({ ...v, files: v.files.map((f) => (f.name === name ? { ...f, status } : f)) });
const blocking = (part) => (part.problems || []).some((p) => (p.severity === 'Blocker' || p.severity === 'Question') && p.status !== 'resolved');
/** One pipeline event -> next view (null stays null). Statuses: waiting, reading, done, check. */
export function reduceImport(v, ev) {
  if (!v || !ev) return v;
  if (ev.type === 'rfq') { const r = ev.rfq || {}; const s = r.original_sender || r.sender || {};
    return { ...v, mails: [...v.mails, { subject: r.subject || '', from: s.email || s.name || '' }] }; }
  if (ev.type === 'files') { const have = new Set(v.files.map((f) => f.name));
    const add = (ev.files || []).map((f) => ({ name: f.name || base(f.path), status: 'waiting' })).filter((f) => !have.has(f.name) && have.add(f.name));
    return { ...v, files: [...v.files, ...add] }; }
  if (ev.type === 'status' && ev.text) { const hit = v.files.find((f) => (f.status === 'waiting' || f.status === 'reading') && ev.text.includes(f.name));
    return hit && hit.status === 'waiting' ? set(v, hit.name, 'reading') : v; }
  if (ev.type === 'part' && ev.part) return set(v, ev.part.drawing && ev.part.drawing.name, blocking(ev.part) ? 'check' : 'done');
  if (ev.type === 'error' && ev.file) return set(v, base(ev.file), 'check');
  return v;
}
/** The run ended: everything not flagged is done. */
export const finishImport = (v) => (v ? { ...v, active: false, files: v.files.map((f) => (f.status === 'check' ? f : { ...f, status: 'done' })) } : v);
/** Overall progress: finished files of all files. */
export function importProgress(v) { const n = v ? v.files.length : 0; const d = n ? v.files.filter((f) => f.status === 'done' || f.status === 'check').length : 0; return { d, n, frac: n ? d / n : 0 }; }
/** After a run: go from step 1 to step 2 when there are parts; never pull the user away from another step. */
export const afterImport = (step, nParts) => (nParts > 0 && step === 1 ? 2 : step);
/** The drop zone only shows when nothing is loaded or being loaded. */
export const showDrop = (v, nParts) => !nParts && !(v && (v.active || v.files.length));
