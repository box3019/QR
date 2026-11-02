// Import view logic: pipeline events -> e-mails (subject, sender) and files with a plain status; progress; when to leave step 1.
/** Empty view: nothing imported. */
export const emptyImport = () => ({ mails: [], files: [], active: false });
/** A run starts. append = add to what is already shown (a later drop), otherwise a fresh view. */
export const startImport = (v, append) => ({ ...(append && v ? v : emptyImport()), active: true });
const base = (s) => String(s || '').split(/[\\/]/).pop();
const fileKey = (f) => f.file || f.name;
const set = (v, name, patch) => ({ ...v, files: v.files.map((f) => (fileKey(f) === name || f.name === name || f.path === name || base(f.path) === base(name) ? { ...f, ...(typeof patch === 'string' ? { status: patch } : patch) } : f)) });
const blocking = (part) => (part.problems || []).some((p) => (p.severity === 'Blocker' || p.severity === 'Question') && p.status !== 'resolved');
/** One pipeline event -> next view (null stays null). Statuses: waiting, reading, done, check, attached, unused. */
export function reduceImport(v, ev) {
  if (!v || !ev) return v;
  if (ev.type === 'rfq') { const r = ev.rfq || {}; const s = r.original_sender || r.sender || {};
    return { ...v, mails: [...v.mails, { subject: r.subject || '', from: s.email || s.name || '' }] }; }
  if (ev.type === 'files') { const have = new Set(v.files.map((f) => f.path || fileKey(f)));
    const add = (ev.files || []).map((f) => ({ name: f.label || f.name || base(f.path), file: f.name || base(f.path), path: f.path, title: f.title || f.path || f.label || f.name, status: 'waiting' })).filter((f) => !have.has(f.path || f.file) && have.add(f.path || f.file));
    return { ...v, files: [...v.files, ...add] }; }
  if (ev.type === 'status' && ev.stage === 'unpack') return { ...v, unpack: { i: ev.i || 0, n: ev.n || 0, text: ev.text || '' } };
  if (ev.type === 'status' && ev.stage === 'parts') return { ...v, parts: { i: ev.i || 0, n: ev.n || 0, text: ev.text || '' } };
  if (ev.type === 'status' && ev.text) { const hit = v.files.find((f) => (f.status === 'waiting' || f.status === 'reading') && ev.text.includes(fileKey(f)));
    return hit && hit.status === 'waiting' ? set(v, fileKey(hit), 'reading') : v; }
  if (ev.type === 'part' && ev.part) return set(v, ev.part.drawing && ev.part.drawing.name, blocking(ev.part) ? 'check' : 'done');
  if (ev.type === 'fileStatus') return set(v, ev.name || base(ev.file), { status: ev.status || 'unused', partNo: ev.partNo || '' });
  if (ev.type === 'error' && ev.file) return set(v, base(ev.file), 'check');
  if (ev.type === 'done') return finishImport(v);
  return v;
}
/** The run ended: leftover waiting files are unused, not silently Done. */
export const finishImport = (v) => (v ? { ...v, active: false, files: v.files.map((f) => (f.status === 'waiting' || f.status === 'reading' ? { ...f, status: 'unused' } : f)) } : v);
/** Overall progress: analysed parts when known, else finished files of all files. */
export function importProgress(v) {
  if (v && v.parts && (v.parts.n || v.parts.n === 0) && (v.files && v.files.length || v.parts.n)) {
    const n = v.parts.n, d = Math.min(v.parts.i || 0, n || 0); return { d, n, frac: n ? d / n : (v.active ? 0 : 1), kind: 'parts' };
  }
  if (v && v.unpack && v.unpack.n && !(v.files && v.files.length)) {
    const n = v.unpack.n, d = Math.min(v.unpack.i || 0, n); return { d, n, frac: n ? d / n : 0, kind: 'files' };
  }
  const n = v ? v.files.length : 0; const d = n ? v.files.filter((f) => f.status === 'done' || f.status === 'check' || f.status === 'attached' || f.status === 'unused').length : 0; return { d, n, frac: n ? d / n : 0, kind: 'files' };
}
/** After a run: go from step 1 to step 2 when there are parts; never pull the user away from another step. */
export const afterImport = (step, nParts) => (nParts > 0 && step === 1 ? 2 : step);
/** The drop zone only shows when nothing is loaded or being loaded. */
export const showDrop = (v, nParts) => !nParts && !(v && (v.active || v.files.length));
