'use strict';
// Standards library entry point: detect callouts on a part, resolve them, link documents, add upload tasks and customer questions.
const { detectCallouts, specCallouts } = require('./detect.cjs');
const { resolveCallout, walk } = require('./resolve.cjs');
const { openStore } = require('./store.cjs');
const KIT = { fitting: 'std.kit.fitting', insert: 'std.kit.insert', oring: 'std.kit.oring' };
/** Mutates part: part.standards, tasks (uploadDocument), problems (Question). ctx: { base, customerDirs, jobFiles, online, problem, text } */
async function attachStandards(part, text, ctx) {
  const store = ctx.store || openStore(ctx.base);
  const customerFiles = [...(ctx.jobFiles || []), ...(ctx.customerDirs || []).flatMap((d) => walk(d))];
  const owner = `part:${part.partNo || ''}|${part.rev || ''}`;
  const calls = [...detectCallouts(text), ...specCallouts(part.chart)]; const out = [];
  for (const c of calls) {
    const r = await resolveCallout(c, { store, customer: part.customer || '', customerFiles, online: ctx.online || null });
    r.id = 'S' + (out.length + 1);
    if (r.doc) { store.link(owner, r.doc.key); r.doc = { key: r.doc.key, rev: r.doc.rev, sha256: r.doc.sha256, file: store.blobPath(r.doc), newerRev: r.doc.newerRev || '', scope: r.doc.scope, reused: !!r.doc.reused }; }
    out.push(r);
  }
  part.standards = out;
  const P = ctx.problem; const tasks = part.tasks = part.tasks || []; const probs = part.problems = part.problems || [];
  const addQ = (key, vars, sev = 'Question') => { if (!P) return; if (probs.some((p) => p.key === key && JSON.stringify(p.vars) === JSON.stringify(vars))) return; probs.push({ id: 'P' + (probs.length + 1), ...P(sev, 'Standards', key, vars), evidence: [], status: 'open', std: true }); };
  const kits = new Set();
  for (const r of out) {
    if (isCustomerSpecId(r.std, r.kind)) { r.stage = 'routecard'; continue; } // customer spec: for the route card, never a quote-stage task or question
    const label = r.std + (r.dash ? '-' + r.dash : '');
    if (r.status === 'needsDoc' && !tasks.some((t) => t.refNumber === r.std)) {
      const tv = { num: r.std, desc: r.title || '' };
      tasks.push({ id: 'T' + (tasks.length + 1), type: 'uploadDocument', std: true, refNumber: r.std, paid: r.paid, customer: r.paid ? '' : part.customer, title: `Upload ${r.std}`, key: 'task.upload', vars: tv, stage: 'now', blocks: 'standards library', blocksVars: {}, status: 'open' });
    }
    for (const f of r.flags) {
      if (f.type === 'series' || f.type === 'size' || f.type === 'class') addQ('std.thread', { std: label, drawing: f.drawing, required: f.required, what: f.type });
      if (f.type === 'newerRev') addQ('std.newer', { std: r.std, have: f.have || '-', newer: f.newer }, 'Info');
    }
    if (r.kit && !kits.has(r.kit + label)) { kits.add(r.kit + label); addQ(KIT[r.kit], { std: label }); }
  }
  return out;
}
/** The user confirms a resolved row once; it is remembered for every later drawing. */
function confirmStandard(base, s, customer) { const store = openStore(base); return store.confirm(s.std, s.dash, s.paid ? '' : customer, { ...(s.row || {}), dims: s.dims }, { source: s.source, rev: s.tableRev || (s.doc && s.doc.rev) || '' }); }
/** Upload of a standard's document (licensed copy or customer doc): store once, link to the part. */
async function uploadStandard(base, { id, rev, customer, file, owner, paid }, readText) {
  const store = openStore(base); const sc = paid ? '' : customer; const e = store.putDoc({ id, rev, customer: sc, file, source: 'upload' }); if (owner) store.link(owner, e.key);
  let rows = {}; try { const text = readText ? await readText(file) : ''; rows = extractTables(text); if (Object.keys(rows).length) store.putTable(id, rev || '', sc, rows, { source: 'upload:' + e.key, verified: false }); } catch {}
  return { ...e, file: store.blobPath(e), tableRows: Object.keys(rows).length };
}
const { extractTables } = require('./extract.cjs');
const { isCustomerSpecId } = require('../docs/stage.cjs');
module.exports = { extractTables, attachStandards, confirmStandard, uploadStandard, detectCallouts, openStore };
