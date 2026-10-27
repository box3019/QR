'use strict';
// Local document store: <base>/library. Public standards are global; customer documents are scoped per customer.
// Each file is stored once by SHA-256 (blobs/<sha>.<ext>); entries are keyed scope|id|rev. Links tie documents to parts/RFQs.
// Resolutions remember a confirmed table row forever (scope|std|dash). Tables hold rows extracted from uploaded documents.
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const { norm } = require('./defs.cjs');
const scopeOf = (customer) => (customer ? 'customer:' + String(customer).toUpperCase() : 'public');
const revCmp = (a, b) => String(a || '').localeCompare(String(b || ''), 'en', { numeric: true });
function openStore(base) {
  const dir = path.join(base, 'library'), blobs = path.join(dir, 'blobs'); fs.mkdirSync(blobs, { recursive: true });
  const file = (n) => path.join(dir, n + '.json');
  const load = (n, d) => { try { return JSON.parse(fs.readFileSync(file(n), 'utf8')); } catch { return d; } };
  const save = (n, v) => { const f = file(n); fs.writeFileSync(f + '.tmp', JSON.stringify(v, null, 1)); fs.renameSync(f + '.tmp', f); };
  const docs = () => load('index', []);
  const api = {
    dir,
    blobPath: (e) => path.join(blobs, e.sha256 + (e.ext || '')),
    list: () => docs(),
    /** Put a document. Same scope+id+rev+content -> reused, nothing written. */
    putDoc({ id, rev = '', customer = '', buf, file: src, ext, source = '', title = '' }) {
      if (!buf && src) buf = fs.readFileSync(src);
      ext = ext || (src ? path.extname(src).toLowerCase() : '.pdf');
      const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
      const scope = scopeOf(customer), key = `${scope}|${norm(id)}|${rev}`;
      const all = docs(); const had = all.find((e) => e.key === key);
      if (had && had.sha256 === sha256) return { ...had, reused: true };
      const bp = path.join(blobs, sha256 + ext); if (!fs.existsSync(bp)) fs.writeFileSync(bp, buf);
      const e = { key, scope, id, nid: norm(id), rev, sha256, ext, size: buf.length, source, title, date: new Date().toISOString() };
      const rest = all.filter((x) => x.key !== key); rest.push(e); api._revs(rest, scope, e.nid); save('index', rest); return { ...e, reused: false };
    },
    _revs(all, scope, nid) { const same = all.filter((x) => x.scope === scope && x.nid === nid).sort((a, b) => revCmp(a.rev, b.rev)); const top = same[same.length - 1];
      for (const x of same) x.newerRev = x === top ? '' : top.rev; },
    /** Newest revision of id: customer scope first, then public. */
    findDoc(id, customer) {
      const nid = norm(id), all = docs();
      for (const sc of [customer ? scopeOf(customer) : null, 'public'].filter(Boolean)) {
        const xs = all.filter((x) => x.scope === sc && x.nid === nid).sort((a, b) => revCmp(a.rev, b.rev));
        if (xs.length) return xs[xs.length - 1];
      }
      return null;
    },
    /** A newer revision seen elsewhere (drawing callout or online) -> flag on the stored entry. */
    noteRevision(id, customer, rev) { const all = docs(); let ch = false;
      for (const x of all) if (x.nid === norm(id) && (x.scope === 'public' || x.scope === scopeOf(customer)) && revCmp(rev, x.rev) > 0 && revCmp(rev, x.newerRev) > 0) { x.newerRev = rev; ch = true; }
      if (ch) save('index', all); return ch; },
    link(owner, key) { const l = load('links', {}); const xs = l[owner] || []; if (!xs.includes(key)) xs.push(key); l[owner] = xs; save('links', l); return xs; },
    linksOf(owner) { const l = load('links', {}); const all = docs(); return (l[owner] || []).map((k) => all.find((e) => e.key === k)).filter(Boolean); },
    getResolution(std, dash, customer) { const r = load('resolutions', {}); return r[`${scopeOf(customer)}|${norm(std)}|${dash}`] || r[`public|${norm(std)}|${dash}`] || null; },
    /** The user confirmed a row once: remember it forever. */
    confirm(std, dash, customer, row, meta = {}) { const r = load('resolutions', {}); const k = `${customer ? scopeOf(customer) : 'public'}|${norm(std)}|${dash}`; r[k] = { row, confirmed: true, date: new Date().toISOString(), ...meta }; save('resolutions', r); return r[k]; },
    putTable(id, rev, customer, rows, meta = {}) { const t = load('tables', {}); t[`${scopeOf(customer)}|${norm(id)}|${rev}`] = { rows, ...meta, date: new Date().toISOString() }; save('tables', t); },
    getTable(id, customer) { const t = load('tables', {}); const ks = Object.keys(t).filter((k) => { const [sc, n] = k.split('|'); return n === norm(id) && (sc === 'public' || sc === scopeOf(customer)); }).sort(revCmp); return ks.length ? t[ks[ks.length - 1]] : null; },
  };
  return api;
}
module.exports = { openStore, scopeOf, revCmp };
