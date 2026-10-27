'use strict';
// Resolve one callout in order: (0) remembered confirmation, (1) local library (bundled tables + stored documents),
// (2) the customer's own documents (scoped to that customer), (3) public online source (identifier only; never for paid standards).
const fs = require('fs'); const path = require('path');
const { defOf, tableDef, isPaid, norm } = require('./defs.cjs');
const { bundledRow, stiRow } = require('./tables.cjs');
const stiKey = (raw) => { const m = String(raw || '').match(/(\d+\/\d+|#?\d{1,2})\s*-\s*(\d{2})\s*(UNC|UNF)/i); return m ? `${m[1].replace('#', '')}-${m[2]} ${m[3].toUpperCase()}` : ''; };
const { parseThread, compareThreads } = require('./threads.cjs');
function walk(dir, depth = 3, out = []) { if (depth < 0) return out; let es = []; try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of es) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, depth - 1, out); else if (/\.(pdf|tif|tiff|png|jpg)$/i.test(e.name)) out.push(p); } return out; }
const revFromName = (f) => ((path.basename(f).match(/(?:REV|_R)[ _-]?([A-Z0-9]{1,3})\b/i) || [])[1] || '').toUpperCase();
function findCustomerDoc(id, files) { const n = norm(id).replace(/\//g, ''); return files.find((f) => norm(path.basename(f)).replace(/\//g, '').includes(n)) || null; }
async function resolveCallout(c, ctx) {
  const { store, customer = '', customerFiles = [], online = null } = ctx;
  const d = defOf(c.std); const td = tableDef(d); const stdId = d ? d.id : c.std;
  const r = { kind: c.kind, std: stdId, dash: c.dash || '', raw: c.raw, thread: c.thread || null, title: d ? d.title : '', status: 'needsDoc', source: '', row: null, dims: null, doc: null, flags: [], notes: (td && td.notes) || null, paid: isPaid(stdId), kit: d ? d.kit : '' };
  if (c.kind === 'thread') { r.status = 'resolved'; r.source = 'computed'; r.dims = c.thread.mm; return r; }
  const docId = td ? td.id : stdId;
  // stored document (reused instantly, no search / download)
  const have = store.findDoc(docId, customer) || (d && d.sameAs ? null : null);
  if (have) r.doc = have;
  const mem = store.getResolution(stdId, r.dash, customer);
  const bun = bundledRow(stdId, r.dash) || (c.kind === 'insert-coil' ? stiRow(stiKey(c.raw)) : null);
  const ext = store.getTable(docId, customer);
  if (mem) { r.row = mem.row; r.dims = mem.row.dims || null; r.status = 'resolved'; r.source = 'memory'; }
  else if (bun) { r.row = bun.row; r.dims = bun.dims; r.status = bun.verified ? 'resolved' : 'needsConfirm'; r.source = 'library'; r.tableRev = bun.rev; r.tableSource = bun.source; }
  else if (ext && ext.rows && ext.rows[r.dash]) { r.row = ext.rows[r.dash]; r.dims = ext.rows[r.dash].dims || Object.fromEntries(Object.entries(ext.rows[r.dash]).filter(([k, v]) => k !== 'verified' && Number.isFinite(parseFloat(v))).map(([k, v]) => [k, { raw: v }])); r.status = 'needsConfirm'; r.source = 'upload'; }
  if (!r.doc) {
    const f = findCustomerDoc(docId, customerFiles);
    if (f) { r.doc = store.putDoc({ id: docId, rev: revFromName(f), customer, file: f, source: 'customer:' + f }); if (!r.source) { r.source = 'customer'; r.status = 'needsConfirm'; } }
    else if (online && !r.paid) {
      try { const got = await online(docId); if (got && got.buf) { r.doc = store.putDoc({ id: docId, rev: got.rev || '', buf: got.buf, ext: got.ext || '.pdf', source: got.url || 'online' }); if (!r.source) { r.source = 'online'; r.status = 'needsConfirm'; } } } catch (e) { r.onlineError = String(e.message || e); }
    }
  }
  if (!r.row && !r.doc) r.status = 'needsDoc';
  else if (!r.row && r.doc && r.status !== 'needsConfirm') r.status = 'needsConfirm';
  if (r.row && r.row.thread && c.kind === 'port') { const req = parseThread(r.row.thread + '-3B'); r.required = req; if (c.thread) r.flags.push(...compareThreads(c.thread, req)); }
  if (r.doc && r.doc.newerRev) r.flags.push({ type: 'newerRev', have: r.doc.rev, newer: r.doc.newerRev });
  return r;
}
module.exports = { resolveCallout, walk, findCustomerDoc, revFromName };
